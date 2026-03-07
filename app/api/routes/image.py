"""
Image Generation API Endpoints
Handles image generation jobs using Fal.ai
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
import os
import logging

from app.db import get_db
from app.db.models import User, Credit, ImageJob, Image
from app.core.auth import get_current_user
from app.schemas import ImageJobCreate, ImageJobResponse, ImageResponse
from app.services.model_router import (
    get_image_model,
    validate_image_size,
    IMAGE_MODELS,
    is_z_turbo_model,
    build_z_turbo_payload,
    get_z_turbo_image_size,
)
from app.services.prompt_enhancer import enhance_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/image", tags=["Image"])


# ============================================
# Rate Limiting Configuration
# ============================================
RATE_LIMITS = {
    "free": 20,      # 20 images per day
    "basic": 100,    # 100 images per day
    "pro": 300,      # 300 images per day
    "premium": 1000, # 1000 images per day
}

CREDIT_COST = 1  # Credits per image generation


# ============================================
# Helper Functions
# ============================================
def check_rate_limit(user: User, db: Session) -> tuple[bool, int]:
    """Check if user has exceeded their daily rate limit."""
    daily_limit = RATE_LIMITS.get(user.plan, 20)

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    jobs_today = db.query(func.count(ImageJob.id)).filter(
        and_(
            ImageJob.user_id == user.id,
            ImageJob.created_at >= cutoff
        )
    ).scalar()

    remaining = daily_limit - jobs_today
    return remaining > 0, max(0, remaining)


# Prompt enhancement is now handled by the centralized PromptEnhancer service
# See app/services/prompt_enhancer.py for the implementation


async def generate_image_with_fal(
    job_id: uuid.UUID,
    prompt: str,
    model: str,
    image_size: str,
    seed: Optional[int],
    safety_tolerance: int,
    output_format: str,
    user_id: uuid.UUID,
    db_url: str,
):
    """Background task to generate image with Fal.ai"""
    import fal_client
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Create new database session for background task
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get job
        job = db.query(ImageJob).filter(ImageJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update status to processing
        job.status = "processing"
        job.progress = 10
        db.commit()

        # Get fal.ai model endpoint
        fal_model = get_image_model(model)

        # Build request arguments based on model type
        if is_z_turbo_model(model):
            # Z-Turbo uses different payload structure
            arguments = build_z_turbo_payload(
                prompt=prompt,
                aspect_ratio=image_size,  # Will be converted by the function
                num_images=1,
            )
            # Override image_size with original if already in correct format
            if image_size in ["portrait_16_9", "landscape_16_9", "landscape_4_3", "portrait_4_3", "square"]:
                arguments["image_size"] = image_size
            else:
                arguments["image_size"] = get_z_turbo_image_size(image_size)
        else:
            # Standard model payload
            arguments = {
                "prompt": prompt,
                "image_size": image_size,
                "output_format": output_format,
                "safety_tolerance": safety_tolerance,
                "enable_safety_checker": True,
            }
            if seed is not None:
                arguments["seed"] = seed

        # Call Fal.ai
        job.progress = 30
        db.commit()

        logger.info(f"Calling Fal.ai model: {fal_model} with arguments: {list(arguments.keys())}")
        result = fal_client.subscribe(
            fal_model,
            arguments=arguments,
        )

        job.progress = 80
        db.commit()

        # Extract image URL
        if result and "images" in result and len(result["images"]) > 0:
            fal_image_url = result["images"][0]["url"]
            result_seed = result.get("seed")

            # Upload to S3 (download from fal.ai → upload to S3 → get CDN URL)
            from app.services.media_upload import upload_external_image
            image_cdn_url, thumbnail_cdn_url = upload_external_image(
                url=fal_image_url,
                user_id=str(user_id),
                job_id=str(job_id),
                output_format=output_format,
            )

            job.progress = 95
            db.commit()

            # Create Image record with S3/CDN URLs
            image = Image(
                id=uuid.uuid4(),
                job_id=job_id,
                user_id=user_id,
                url=image_cdn_url,
                thumbnail_url=thumbnail_cdn_url or image_cdn_url,
                prompt=prompt,
                model=model,
                image_size=image_size,
                seed=result_seed,
            )
            db.add(image)

            # Update job status
            job.status = "completed"
            job.progress = 100
            if result_seed:
                job.seed = result_seed

            db.commit()
            logger.info(f"Image generation completed for job {job_id}, uploaded to S3")
        else:
            raise Exception("No images returned from Fal.ai")

    except Exception as e:
        logger.error(f"Image generation failed for job {job_id}: {str(e)}")

        # Update job with error
        job = db.query(ImageJob).filter(ImageJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()

        # Refund credits
        credit = db.query(Credit).filter(Credit.user_id == user_id).first()
        if credit:
            credit.credits_left += CREDIT_COST
            db.commit()

    finally:
        db.close()


# ============================================
# Image Generation Endpoints
# ============================================
@router.post("/generate", response_model=ImageJobResponse)
async def generate_image(
    job_data: ImageJobCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new image generation job.

    Models available:
    - flux-2-pro: High quality Flux model
    - flux-2-max: Maximum quality Flux model
    - nano-banana: Fast generation
    - nano-banana-pro: Fast generation with better quality

    Image sizes:
    - square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
    """
    # Validate model
    if job_data.model not in IMAGE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid model: {job_data.model}")

    # Validate image size
    valid_size = validate_image_size(job_data.image_size)

    # Check rate limit
    rate_allowed, remaining = check_rate_limit(user, db)
    if not rate_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily rate limit exceeded",
                "limit": RATE_LIMITS.get(user.plan, 20),
                "resets_in": "24 hours",
            }
        )

    # Check credits
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if not credit:
        credit = Credit(user_id=user.id, credits_left=10)
        db.add(credit)
        db.commit()

    if credit.credits_left < CREDIT_COST:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": CREDIT_COST,
                "available": credit.credits_left,
            }
        )

    # Deduct credits
    credit.credits_left -= CREDIT_COST

    # Enhance prompt using the PromptEnhancer service
    # This handles: preset injection, static quality enhancements, and optional LLM expansion
    final_prompt, negative_prompt = enhance_prompt(
        db=db,
        user_prompt=job_data.prompt,
        preset_id=job_data.preset_id,
        model="image",
        enhance_prompt_flag=job_data.enhance_prompt,
    )

    # Create job record (store original user prompt for reference)
    job_id = uuid.uuid4()
    image_job = ImageJob(
        id=job_id,
        user_id=user.id,
        prompt=job_data.prompt,  # Store original user prompt
        model=job_data.model,
        image_size=valid_size,
        seed=job_data.seed,
        safety_tolerance=job_data.safety_tolerance,
        output_format=job_data.output_format,
        status="queued",
        progress=0,
    )
    db.add(image_job)
    db.commit()

    # Get database URL for background task
    from app.core.config import settings
    db_url = settings.DATABASE_URL

    # Start background generation using composed prompt (with preset applied)
    background_tasks.add_task(
        generate_image_with_fal,
        job_id=job_id,
        prompt=final_prompt,  # Use composed prompt with preset
        model=job_data.model,
        image_size=valid_size,
        seed=job_data.seed,
        safety_tolerance=job_data.safety_tolerance,
        output_format=job_data.output_format,
        user_id=user.id,
        db_url=db_url,
    )

    return ImageJobResponse(
        job_id=job_id,
        status="queued",
        progress=0,
        image_url=None,
        thumbnail_url=None,
        error_message=None,
    )


@router.get("/job/{job_id}", response_model=ImageJobResponse)
def get_image_job_status(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of an image generation job."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = db.query(ImageJob).filter(
        and_(
            ImageJob.id == job_uuid,
            ImageJob.user_id == user.id
        )
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get image URL if completed
    image_url = None
    thumbnail_url = None

    if job.status == "completed":
        image = db.query(Image).filter(Image.job_id == job_uuid).first()
        if image:
            image_url = image.url
            thumbnail_url = image.thumbnail_url

    return ImageJobResponse(
        job_id=job_uuid,
        status=job.status,
        progress=job.progress,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        error_message=job.error_message,
    )


@router.get("/list", response_model=List[ImageResponse])
def list_images(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List all images for the current user."""
    images = db.query(Image).filter(
        Image.user_id == user.id
    ).order_by(
        Image.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [
        ImageResponse(
            id=image.id,
            url=image.url,
            thumbnail_url=image.thumbnail_url,
            prompt=image.prompt,
            model=image.model,
            image_size=image.image_size,
            seed=image.seed,
            created_at=image.created_at,
        )
        for image in images
    ]


@router.delete("/{image_id}")
def delete_image(
    image_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a generated image."""
    try:
        image_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image ID format")

    image = db.query(Image).filter(
        and_(
            Image.id == image_uuid,
            Image.user_id == user.id
        )
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete media files from S3
    from app.services.media_upload import delete_media_from_s3
    if image.url:
        delete_media_from_s3(image.url)
    if image.thumbnail_url and image.thumbnail_url != image.url:
        delete_media_from_s3(image.thumbnail_url)

    # Delete associated job if exists
    if image.job_id:
        job = db.query(ImageJob).filter(ImageJob.id == image.job_id).first()
        if job:
            db.delete(job)

    db.delete(image)
    db.commit()

    return {"success": True, "message": "Image deleted"}


@router.get("/limits")
def get_image_limits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current rate limits and usage for image generation."""
    rate_allowed, remaining = check_rate_limit(user, db)

    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    credits_available = credit.credits_left if credit else 0

    return {
        "plan": user.plan,
        "rate_limit": {
            "daily_limit": RATE_LIMITS.get(user.plan, 20),
            "remaining": remaining,
            "resets_in": "24 hours",
        },
        "credits": {
            "available": credits_available,
            "cost_per_image": CREDIT_COST,
        }
    }


# NOTE: This route MUST be last to avoid matching "list", "limits", etc. as image_id
@router.get("/{image_id}", response_model=ImageResponse)
def get_image(
    image_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get metadata for a generated image."""
    try:
        image_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image ID format")

    image = db.query(Image).filter(
        and_(
            Image.id == image_uuid,
            Image.user_id == user.id
        )
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return ImageResponse(
        id=image.id,
        url=image.url,
        thumbnail_url=image.thumbnail_url,
        prompt=image.prompt,
        model=image.model,
        image_size=image.image_size,
        seed=image.seed,
        created_at=image.created_at,
    )
