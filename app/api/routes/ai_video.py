"""
AI Video Generation API Endpoints
Handles AI video generation using Fal.ai (Sora 2, Veo 3, Kling 2.5, LTX-2)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import os
import logging

from app.db import get_db
from app.db.models import User, Credit, AIVideoJob, AIVideo
from app.core.auth import get_current_user
from app.schemas import AIVideoJobCreate, AIVideoJobResponse, AIVideoResponse, AIVideoModelConfig
from app.services.model_router import (
    get_video_model,
    get_video_model_config,
    validate_video_options,
    build_video_payload,
    VIDEO_MODELS,
    VIDEO_MODEL_CONFIGS,
)
from app.services.prompt_enhancer import enhance_prompt, preview_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-video", tags=["AI Video"])


# ============================================
# Rate Limiting Configuration
# ============================================
RATE_LIMITS = {
    "free": 5,       # 5 videos per day
    "basic": 20,     # 20 videos per day
    "pro": 50,       # 50 videos per day
    "premium": 200,  # 200 videos per day
}

# Credit costs per model (video generation is expensive)
CREDIT_COSTS = {
    "sora2": 20,
    "veo3": 15,
    "kling25": 10,
    "ltx2": 5,
}


# ============================================
# Helper Functions
# ============================================
def check_rate_limit(user: User, db: Session) -> tuple[bool, int]:
    """Check if user has exceeded their daily rate limit."""
    daily_limit = RATE_LIMITS.get(user.plan, 5)

    cutoff = datetime.utcnow() - timedelta(hours=24)
    jobs_today = db.query(func.count(AIVideoJob.id)).filter(
        and_(
            AIVideoJob.user_id == user.id,
            AIVideoJob.created_at >= cutoff
        )
    ).scalar()

    remaining = daily_limit - jobs_today
    return remaining > 0, max(0, remaining)


# Prompt enhancement is now handled by the centralized PromptEnhancer service
# See app/services/prompt_enhancer.py for the implementation


def upload_image_to_fal(reference_image: str) -> Optional[str]:
    """
    Upload reference image to Fal.ai storage.

    Args:
        reference_image: Base64 data URL or public URL

    Returns:
        Public URL of uploaded image, or None if failed
    """
    import fal_client
    import base64
    import tempfile

    if not reference_image:
        return None

    try:
        # If it's already a URL (not base64), return as-is
        if reference_image.startswith('http://') or reference_image.startswith('https://'):
            return reference_image

        # Parse base64 data URL
        if reference_image.startswith('data:'):
            # Format: data:image/jpeg;base64,/9j/4AAQ...
            header, data = reference_image.split(',', 1)

            # Determine file extension from header
            if 'image/png' in header:
                ext = '.png'
            elif 'image/webp' in header:
                ext = '.webp'
            else:
                ext = '.jpg'

            # Decode base64
            image_bytes = base64.b64decode(data)

            # Write to temp file and upload
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(image_bytes)
                tmp_path = tmp.name

            try:
                # Upload to Fal storage
                url = fal_client.upload_file(tmp_path)
                logger.info(f"Uploaded reference image to Fal: {url}")
                return url
            finally:
                # Clean up temp file
                os.unlink(tmp_path)

        return None

    except Exception as e:
        logger.error(f"Failed to upload reference image: {e}")
        return None


async def generate_video_with_fal(
    job_id: uuid.UUID,
    prompt: str,
    model: str,
    options: dict,
    user_id: uuid.UUID,
    db_url: str,
    image_url: str = None,
):
    """Background task to generate video with Fal.ai"""
    import fal_client
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Create new database session for background task
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get job
        job = db.query(AIVideoJob).filter(AIVideoJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update status to processing
        job.status = "processing"
        job.progress = 10
        db.commit()

        # Get fal.ai model endpoint
        fal_model = get_video_model(model)

        # Build model-specific payload (with image_url for ALL models)
        payload = build_video_payload(model, prompt, options, image_url)

        logger.info(f"Calling Fal.ai model: {fal_model}")
        logger.info(f"Payload: {payload}")

        job.progress = 20
        db.commit()

        # Determine whether to use subscribe or queue based on model
        # Sora and Kling (shorter) use subscribe, LTX-2 and Veo-3 use queue
        if model in ["sora2", "kling25"]:
            result = fal_client.subscribe(
                fal_model,
                arguments=payload,
            )
        else:
            # Use queue for longer running models
            handler = fal_client.submit(
                fal_model,
                arguments=payload,
            )
            job.fal_request_id = handler.request_id
            job.progress = 30
            db.commit()

            # Wait for result
            result = handler.get()

        job.progress = 80
        db.commit()

        # Extract video URL from result
        video_url = None
        thumbnail_url = None

        # Different models return different response structures
        if result:
            if "video" in result:
                video_data = result["video"]
                if isinstance(video_data, dict):
                    video_url = video_data.get("url")
                else:
                    video_url = video_data
            elif "video_url" in result:
                video_url = result["video_url"]
            elif "url" in result:
                video_url = result["url"]

            # Try to get thumbnail
            if "thumbnail" in result:
                thumbnail_data = result["thumbnail"]
                if isinstance(thumbnail_data, dict):
                    thumbnail_url = thumbnail_data.get("url")
                else:
                    thumbnail_url = thumbnail_data

        if video_url:
            # Upload to S3 (download from fal.ai → upload to S3 → get CDN URL)
            from app.services.media_upload import upload_external_video
            video_cdn_url, thumb_cdn_url = upload_external_video(
                url=video_url,
                user_id=str(user_id),
                job_id=str(job_id),
                s3_prefix="ai-videos",
            )

            # Use S3-generated thumbnail, fall back to fal.ai thumbnail if extraction failed
            if not thumb_cdn_url and thumbnail_url:
                from app.services.media_upload import upload_external_image
                thumb_cdn_url, _ = upload_external_image(
                    url=thumbnail_url,
                    user_id=str(user_id),
                    job_id=f"{job_id}_thumb",
                )

            job.progress = 95
            db.commit()

            # Create AIVideo record with S3/CDN URLs
            ai_video = AIVideo(
                id=uuid.uuid4(),
                job_id=job_id,
                user_id=user_id,
                url=video_cdn_url,
                thumbnail_url=thumb_cdn_url,
                prompt=prompt,
                model=model,
                duration=options.get("duration"),
                aspect_ratio=options.get("aspect_ratio"),
                resolution=options.get("resolution"),
            )
            db.add(ai_video)

            # Update job status
            job.status = "completed"
            job.progress = 100
            job.video_url = video_cdn_url
            job.thumbnail_url = thumb_cdn_url

            db.commit()
            logger.info(f"Video generation completed for job {job_id}, uploaded to S3")
        else:
            raise Exception("No video URL returned from Fal.ai")

    except Exception as e:
        logger.error(f"Video generation failed for job {job_id}: {str(e)}")

        # Update job with error
        job = db.query(AIVideoJob).filter(AIVideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()

        # Refund credits
        credit_cost = CREDIT_COSTS.get(model, 10)
        credit = db.query(Credit).filter(Credit.user_id == user_id).first()
        if credit:
            credit.credits_left += credit_cost
            db.commit()

    finally:
        db.close()


# ============================================
# AI Video Generation Endpoints
# ============================================
@router.post("/generate", response_model=AIVideoJobResponse)
async def generate_ai_video(
    job_data: AIVideoJobCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new AI video generation job.

    Models available:
    - sora2: Sora 2 (max 12s, 720p/1080p, 9:16/16:9)
    - veo3: Veo 3 (max 8s, supports negative prompt, audio, seed)
    - kling25: Kling 2.5 (5s/10s, supports negative prompt, CFG scale)
    - ltx2: LTX-2 (max 20s, advanced options, supports audio)
    """
    # Validate model
    if job_data.model not in VIDEO_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid model: {job_data.model}")

    # Check rate limit
    rate_allowed, remaining = check_rate_limit(user, db)
    if not rate_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily rate limit exceeded",
                "limit": RATE_LIMITS.get(user.plan, 5),
                "resets_in": "24 hours",
            }
        )

    # Get credit cost for this model
    credit_cost = CREDIT_COSTS.get(job_data.model, 10)

    # Check credits
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if not credit:
        credit = Credit(user_id=user.id, credits_left=10)
        db.add(credit)
        db.commit()

    if credit.credits_left < credit_cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": credit_cost,
                "available": credit.credits_left,
            }
        )

    # Validate and build options
    raw_options = {
        "duration": job_data.duration,
        "aspect_ratio": job_data.aspect_ratio,
        "resolution": job_data.resolution,
        "negative_prompt": job_data.negative_prompt,
        **(job_data.options or {}),
    }
    validated_options = validate_video_options(job_data.model, raw_options)

    # Handle reference image upload (available for ALL models)
    image_url = None
    if job_data.reference_image:
        image_url = upload_image_to_fal(job_data.reference_image)
        if image_url:
            logger.info(f"Reference image uploaded: {image_url}")

    # Enhance prompt using the PromptEnhancer service
    # This handles: preset injection, static quality enhancements, and optional LLM expansion
    final_prompt, final_negative = enhance_prompt(
        db=db,
        user_prompt=job_data.prompt,
        preset_id=job_data.preset_id,
        model=job_data.model,  # sora2, veo3, kling25, ltx2
        enhance_prompt_flag=job_data.enhance_prompt,
        reference_image=job_data.reference_image,
        user_negative_prompt=validated_options.get("negative_prompt") or job_data.negative_prompt,
    )

    # Update options with composed negative prompt
    if final_negative:
        validated_options["negative_prompt"] = final_negative

    # Deduct credits
    credit.credits_left -= credit_cost

    # Create job record (store original user prompt for reference)
    job_id = uuid.uuid4()
    ai_video_job = AIVideoJob(
        id=job_id,
        user_id=user.id,
        prompt=job_data.prompt,  # Store original user prompt
        negative_prompt=final_negative,  # Store composed negative prompt
        model=job_data.model,
        options=validated_options,
        duration=validated_options.get("duration", job_data.duration),
        aspect_ratio=validated_options.get("aspect_ratio", job_data.aspect_ratio),
        resolution=validated_options.get("resolution", job_data.resolution),
        status="queued",
        progress=0,
    )
    db.add(ai_video_job)
    db.commit()

    # Get database URL for background task
    from app.core.config import settings
    db_url = settings.DATABASE_URL

    # Start background generation using composed prompt (with preset applied)
    background_tasks.add_task(
        generate_video_with_fal,
        job_id=job_id,
        prompt=final_prompt,  # Use composed prompt with preset
        model=job_data.model,
        options=validated_options,
        user_id=user.id,
        db_url=db_url,
        image_url=image_url,
    )

    return AIVideoJobResponse(
        job_id=job_id,
        status="queued",
        progress=0,
        video_url=None,
        thumbnail_url=None,
        error_message=None,
    )


@router.get("/job/{job_id}", response_model=AIVideoJobResponse)
def get_ai_video_job_status(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of an AI video generation job."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = db.query(AIVideoJob).filter(
        and_(
            AIVideoJob.id == job_uuid,
            AIVideoJob.user_id == user.id
        )
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get video URL if completed
    video_url = job.video_url
    thumbnail_url = job.thumbnail_url

    if job.status == "completed" and not video_url:
        video = db.query(AIVideo).filter(AIVideo.job_id == job_uuid).first()
        if video:
            video_url = video.url
            thumbnail_url = video.thumbnail_url

    return AIVideoJobResponse(
        job_id=job_uuid,
        status=job.status,
        progress=job.progress,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        error_message=job.error_message,
    )


@router.get("/list", response_model=List[AIVideoResponse])
def list_ai_videos(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List all AI videos for the current user."""
    videos = db.query(AIVideo).filter(
        AIVideo.user_id == user.id
    ).order_by(
        AIVideo.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [
        AIVideoResponse(
            id=video.id,
            url=video.url,
            thumbnail_url=video.thumbnail_url,
            prompt=video.prompt,
            model=video.model,
            duration=video.duration,
            aspect_ratio=video.aspect_ratio,
            resolution=video.resolution,
            created_at=video.created_at,
        )
        for video in videos
    ]


@router.delete("/{video_id}")
def delete_ai_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a generated AI video."""
    try:
        video_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    video = db.query(AIVideo).filter(
        and_(
            AIVideo.id == video_uuid,
            AIVideo.user_id == user.id
        )
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete media files from S3
    from app.services.media_upload import delete_media_from_s3
    if video.url:
        delete_media_from_s3(video.url)
    if video.thumbnail_url:
        delete_media_from_s3(video.thumbnail_url)

    # Delete associated job if exists
    if video.job_id:
        job = db.query(AIVideoJob).filter(AIVideoJob.id == video.job_id).first()
        if job:
            db.delete(job)

    db.delete(video)
    db.commit()

    return {"success": True, "message": "Video deleted"}


@router.get("/limits")
def get_ai_video_limits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current rate limits and usage for AI video generation."""
    rate_allowed, remaining = check_rate_limit(user, db)

    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    credits_available = credit.credits_left if credit else 0

    return {
        "plan": user.plan,
        "rate_limit": {
            "daily_limit": RATE_LIMITS.get(user.plan, 5),
            "remaining": remaining,
            "resets_in": "24 hours",
        },
        "credits": {
            "available": credits_available,
            "costs": CREDIT_COSTS,
        }
    }


@router.post("/preview-prompt")
def preview_prompt_endpoint(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Preview prompt enhancement without starting generation.
    Runs the full prompt enhancement pipeline and returns the result.
    """
    user_prompt = data.get("prompt", "").strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    result = preview_prompt(
        db=db,
        user_prompt=user_prompt,
        preset_id=data.get("preset_id"),
        model=data.get("model", "image"),
        enhance_prompt_flag=data.get("enhance_prompt", True),
        user_negative_prompt=data.get("negative_prompt"),
    )

    return {
        "original_prompt": user_prompt,
        "enhanced_prompt": result.final_prompt,
        "negative_prompt": result.negative_prompt,
        "was_expanded": result.was_expanded,
    }


@router.get("/models")
def get_video_models():
    """Get available video models and their configurations."""
    models = {}
    for model_id, config in VIDEO_MODEL_CONFIGS.items():
        models[model_id] = AIVideoModelConfig(**config).model_dump()
    return {"models": models}


# NOTE: This route MUST be last to avoid matching "list", "limits", "models" etc. as video_id
@router.get("/{video_id}", response_model=AIVideoResponse)
def get_ai_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get metadata for a generated AI video."""
    try:
        video_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    video = db.query(AIVideo).filter(
        and_(
            AIVideo.id == video_uuid,
            AIVideo.user_id == user.id
        )
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return AIVideoResponse(
        id=video.id,
        url=video.url,
        thumbnail_url=video.thumbnail_url,
        prompt=video.prompt,
        model=video.model,
        duration=video.duration,
        aspect_ratio=video.aspect_ratio,
        resolution=video.resolution,
        created_at=video.created_at,
    )
