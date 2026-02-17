"""
Trending Video Generation API Endpoints
Powered by Kling 2.6 Motion Control via Fal.ai

Two flows:
  1. Theme Mode — predefined motion reference videos, user provides image
  2. Custom Mode — user provides image + their own motion reference video
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import Optional
import uuid
import os
import logging

from app.db import get_db
from app.db.models import User, Credit, TrendingVideoJob
from app.core.auth import get_current_user
from app.schemas import (
    TrendingThemeJobCreate,
    TrendingCustomJobCreate,
    TrendingVideoJobResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trending-video", tags=["Trending Video"])


# ============================================
# Kling 2.6 Motion Control Models
# ============================================
KLING_MOTION_MODELS = {
    "standard": "fal-ai/kling-video/v2.6/standard/motion-control",
    "pro": "fal-ai/kling-video/v2.6/pro/motion-control",
}

# Credit costs per quality tier
CREDIT_COSTS = {
    "standard": 10,
    "pro": 20,
}

# Rate limits (per day)
RATE_LIMITS = {
    "free": 3,
    "basic": 10,
    "pro": 30,
    "premium": 100,
}


# ============================================
# Theme Configurations
# ============================================
# Each theme has a motion_video_url — a pre-recorded reference video
# showing the motion pattern that Kling will replicate onto the user's image.
# Replace placeholder URLs with actual hosted motion reference videos.
TRENDING_THEMES = {
    "dance_mania": {
        "id": "dance_mania",
        "display_name": "Dance Mania",
        "description": "High energy dance moves",
        "s3_key": "trending-media/1.mp4",  # S3 preview/motion reference video
        "default_duration": 8,
        "allowed_durations": [5, 8, 10],
    },
    "slow_glow_up": {
        "id": "slow_glow_up",
        "display_name": "Slow Glow Up",
        "description": "Smooth cinematic transformation",
        "s3_key": "trending-media/2.mp4",  # S3 preview/motion reference video
        "default_duration": 8,
        "allowed_durations": [5, 8, 10],
    },
    "anime_transform": {
        "id": "anime_transform",
        "display_name": "Anime Transform",
        "description": "Anime-style power up effect",
        "s3_key": "trending-media/3.mp4",  # S3 preview/motion reference video
        "default_duration": 8,
        "allowed_durations": [5, 8, 10],
    },
    "cinematic_walk": {
        "id": "cinematic_walk",
        "display_name": "Cinematic Walk",
        "description": "Movie-style slow walk",
        "s3_key": "trending-media/4.mp4",  # S3 preview/motion reference video
        "default_duration": 8,
        "allowed_durations": [5, 8, 10],
    },
    "meme_jump_cut": {
        "id": "meme_jump_cut",
        "display_name": "Meme Jump Cut",
        "description": "Quick chaotic energy",
        "s3_key": "trending-media/5.mp4",  # S3 preview/motion reference video
        "default_duration": 5,
        "allowed_durations": [5, 8],
    },
}


# ============================================
# Helpers
# ============================================
def check_rate_limit(user: User, db: Session) -> tuple[bool, int]:
    """Check daily rate limit for trending video."""
    daily_limit = RATE_LIMITS.get(user.plan, 3)
    cutoff = datetime.utcnow() - timedelta(hours=24)
    jobs_today = db.query(func.count(TrendingVideoJob.id)).filter(
        and_(
            TrendingVideoJob.user_id == user.id,
            TrendingVideoJob.created_at >= cutoff,
        )
    ).scalar()
    remaining = daily_limit - jobs_today
    return remaining > 0, max(0, remaining)


def upload_image_to_fal(reference_image: str) -> Optional[str]:
    """Upload reference image to Fal.ai storage. Returns public URL."""
    import fal_client
    import base64
    import tempfile

    if not reference_image:
        return None

    try:
        if reference_image.startswith(('http://', 'https://')):
            return reference_image

        if reference_image.startswith('data:'):
            header, data = reference_image.split(',', 1)
            if 'image/png' in header:
                ext = '.png'
            elif 'image/webp' in header:
                ext = '.webp'
            else:
                ext = '.jpg'

            image_bytes = base64.b64decode(data)
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(image_bytes)
                tmp_path = tmp.name

            try:
                url = fal_client.upload_file(tmp_path)
                logger.info(f"Uploaded trending video reference image: {url}")
                return url
            finally:
                os.unlink(tmp_path)

        return None
    except Exception as e:
        logger.error(f"Failed to upload reference image: {e}")
        return None


def upload_video_to_fal(video_data: str) -> Optional[str]:
    """Upload reference video to Fal.ai storage. Returns public URL."""
    import fal_client
    import base64
    import tempfile

    if not video_data:
        return None

    try:
        if video_data.startswith(('http://', 'https://')):
            return video_data

        if video_data.startswith('data:'):
            header, data = video_data.split(',', 1)
            if 'video/webm' in header:
                ext = '.webm'
            elif 'video/quicktime' in header:
                ext = '.mov'
            else:
                ext = '.mp4'

            video_bytes = base64.b64decode(data)
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(video_bytes)
                tmp_path = tmp.name

            try:
                url = fal_client.upload_file(tmp_path)
                logger.info(f"Uploaded trending video motion reference: {url}")
                return url
            finally:
                os.unlink(tmp_path)

        return None
    except Exception as e:
        logger.error(f"Failed to upload reference video: {e}")
        return None


# ============================================
# Background Task — Kling 2.6 Motion Control
# ============================================
async def generate_trending_video_task(
    job_id: uuid.UUID,
    image_url: str,
    motion_video_url: str,
    quality: str,
    user_id: uuid.UUID,
    db_url: str,
):
    """Background task to generate trending video with Kling 2.6 Motion Control via Fal.ai."""
    import fal_client
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    fal_model = KLING_MOTION_MODELS.get(quality, KLING_MOTION_MODELS["standard"])
    credit_cost = CREDIT_COSTS.get(quality, 10)

    try:
        job = db.query(TrendingVideoJob).filter(TrendingVideoJob.id == job_id).first()
        if not job:
            logger.error(f"Trending video job {job_id} not found")
            return

        # Stage: generating_video
        job.status = "generating_video"
        job.progress = 20
        db.commit()

        # Build Kling 2.6 Motion Control payload
        payload = {
            "image_url": image_url,
            "video_url": motion_video_url,
            "character_orientation": "video",
        }

        logger.info(f"Calling Kling 2.6 Motion Control: {fal_model}")
        logger.info(f"Payload: {payload}")

        # Use subscribe for Kling
        result = fal_client.subscribe(
            fal_model,
            arguments=payload,
        )

        job.progress = 80
        job.status = "encoding"
        db.commit()

        # Extract video URL from result
        video_url = None
        thumbnail_url = None

        if result:
            if "video" in result:
                video_data = result["video"]
                video_url = video_data.get("url") if isinstance(video_data, dict) else video_data
            elif "video_url" in result:
                video_url = result["video_url"]
            elif "url" in result:
                video_url = result["url"]

            if "thumbnail" in result:
                thumb_data = result["thumbnail"]
                thumbnail_url = thumb_data.get("url") if isinstance(thumb_data, dict) else thumb_data

        if video_url:
            # Upload to S3 (download from fal.ai → upload to S3 → get CDN URL)
            from app.services.media_upload import upload_external_video
            video_cdn_url, thumb_cdn_url = upload_external_video(
                url=video_url,
                user_id=str(user_id),
                job_id=str(job_id),
                s3_prefix="trending-videos",
            )

            # If fal.ai returned a thumbnail, upload that too as fallback
            if not thumb_cdn_url and thumbnail_url:
                from app.services.media_upload import upload_external_image
                thumb_cdn_url, _ = upload_external_image(
                    url=thumbnail_url,
                    user_id=str(user_id),
                    job_id=f"{job_id}_thumb",
                )

            job.status = "completed"
            job.progress = 100
            job.video_url = video_cdn_url
            job.thumbnail_url = thumb_cdn_url
            db.commit()
            logger.info(f"Trending video completed: job {job_id}, uploaded to S3")
        else:
            raise Exception("No video URL returned from Kling 2.6 Motion Control")

    except Exception as e:
        logger.error(f"Trending video generation failed for job {job_id}: {e}")

        # Retry once
        job = db.query(TrendingVideoJob).filter(TrendingVideoJob.id == job_id).first()
        if job and job.retry_count < 1:
            job.retry_count += 1
            job.status = "queued"
            job.progress = 0
            job.error_message = f"Retry after: {str(e)}"
            db.commit()
            logger.info(f"Retrying trending video job {job_id} (attempt {job.retry_count})")

            try:
                result = fal_client.subscribe(
                    fal_model,
                    arguments={
                        "image_url": image_url,
                        "video_url": motion_video_url,
                        "character_orientation": "video",
                    },
                )

                video_url = None
                if result:
                    if "video" in result:
                        video_data = result["video"]
                        video_url = video_data.get("url") if isinstance(video_data, dict) else video_data
                    elif "video_url" in result:
                        video_url = result["video_url"]
                    elif "url" in result:
                        video_url = result["url"]

                if video_url:
                    # Upload retry result to S3
                    from app.services.media_upload import upload_external_video
                    video_cdn_url, thumb_cdn_url = upload_external_video(
                        url=video_url,
                        user_id=str(user_id),
                        job_id=str(job_id),
                        s3_prefix="trending-videos",
                    )

                    job.status = "completed"
                    job.progress = 100
                    job.video_url = video_cdn_url
                    job.thumbnail_url = thumb_cdn_url
                    job.error_message = None
                    db.commit()
                    return
            except Exception as retry_err:
                logger.error(f"Retry also failed for job {job_id}: {retry_err}")

            job.status = "failed"
            job.error_message = str(e)
            db.commit()
        elif job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()

        # Refund credits
        credit = db.query(Credit).filter(Credit.user_id == user_id).first()
        if credit:
            credit.credits_left += credit_cost
            db.commit()
            logger.info(f"Refunded {credit_cost} credits for failed trending video job {job_id}")

    finally:
        db.close()


# ============================================
# API Endpoints
# ============================================

@router.post("/generate-theme", response_model=TrendingVideoJobResponse)
async def generate_theme_video(
    job_data: TrendingThemeJobCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a trending theme video using Kling 2.6 Motion Control.
    The theme provides the motion reference video — user only uploads their image.
    """
    # Validate theme
    theme = TRENDING_THEMES.get(job_data.theme_id)
    if not theme:
        raise HTTPException(status_code=400, detail=f"Unknown theme: {job_data.theme_id}")

    # Check theme has motion video configured
    if not theme.get("s3_key"):
        raise HTTPException(status_code=400, detail=f"Theme '{theme['display_name']}' motion video not yet configured.")

    # Validate duration against theme
    if job_data.duration not in theme["allowed_durations"]:
        raise HTTPException(
            status_code=400,
            detail=f"Duration {job_data.duration}s not allowed for theme '{theme['display_name']}'. "
                   f"Allowed: {theme['allowed_durations']}",
        )

    # Validate intensity
    if job_data.intensity not in ("subtle", "normal", "extreme"):
        raise HTTPException(status_code=400, detail=f"Invalid intensity: {job_data.intensity}")

    # Validate aspect ratio
    valid_ratios = ["9:16", "1:1", "16:9"]
    if job_data.aspect_ratio not in valid_ratios:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio: {job_data.aspect_ratio}")

    # Validate quality
    quality = job_data.quality if hasattr(job_data, 'quality') and job_data.quality else "standard"
    if quality not in KLING_MOTION_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid quality: {quality}")

    credit_cost = CREDIT_COSTS.get(quality, 10)

    # Rate limit
    rate_ok, remaining = check_rate_limit(user, db)
    if not rate_ok:
        raise HTTPException(
            status_code=429,
            detail={"error": "Daily rate limit exceeded", "limit": RATE_LIMITS.get(user.plan, 3)},
        )

    # Credits check
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if not credit:
        credit = Credit(user_id=user.id, credits_left=10)
        db.add(credit)
        db.commit()

    if credit.credits_left < credit_cost:
        raise HTTPException(
            status_code=402,
            detail={"error": "Insufficient credits", "required": credit_cost, "available": credit.credits_left},
        )

    # Upload reference image
    image_url = upload_image_to_fal(job_data.reference_image)
    if not image_url:
        raise HTTPException(status_code=400, detail="Failed to process reference image")

    # Generate presigned URL for motion reference video from S3
    from app.services.storage import get_cloudfront_url
    motion_video_url = get_cloudfront_url(theme["s3_key"])

    # Deduct credits
    credit.credits_left -= credit_cost

    # Create job
    job_id = uuid.uuid4()
    job = TrendingVideoJob(
        id=job_id,
        user_id=user.id,
        flow_type="theme",
        theme_id=job_data.theme_id,
        reference_image_url=image_url,
        reference_video_url=motion_video_url,
        intensity=job_data.intensity,
        duration=job_data.duration,
        aspect_ratio=job_data.aspect_ratio,
        status="building_prompt",
        progress=5,
    )
    db.add(job)
    db.commit()

    # Start background task
    from app.core.config import settings
    background_tasks.add_task(
        generate_trending_video_task,
        job_id=job_id,
        image_url=image_url,
        motion_video_url=motion_video_url,
        quality=quality,
        user_id=user.id,
        db_url=settings.DATABASE_URL,
    )

    return TrendingVideoJobResponse(
        job_id=job_id,
        status="building_prompt",
        progress=5,
        flow_type="theme",
        theme_id=job_data.theme_id,
    )


@router.post("/generate-custom", response_model=TrendingVideoJobResponse)
async def generate_custom_video(
    job_data: TrendingCustomJobCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a custom trending video using Kling 2.6 Motion Control.
    User provides their image + a motion reference video.
    """
    # Validate reference video (REQUIRED for motion control)
    if not job_data.reference_video:
        raise HTTPException(status_code=400, detail="Motion reference video is required for custom trending videos.")

    # Validate intensity
    if job_data.intensity not in ("subtle", "normal", "extreme"):
        raise HTTPException(status_code=400, detail=f"Invalid intensity: {job_data.intensity}")

    # Validate aspect ratio
    valid_ratios = ["9:16", "1:1", "16:9"]
    if job_data.aspect_ratio not in valid_ratios:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio: {job_data.aspect_ratio}")

    # Validate duration
    valid_durations = [5, 8, 10]
    if job_data.duration not in valid_durations:
        raise HTTPException(status_code=400, detail=f"Invalid duration: {job_data.duration}s")

    # Validate quality
    quality = job_data.quality if hasattr(job_data, 'quality') and job_data.quality else "standard"
    if quality not in KLING_MOTION_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid quality: {quality}")

    credit_cost = CREDIT_COSTS.get(quality, 10)

    # Rate limit
    rate_ok, remaining = check_rate_limit(user, db)
    if not rate_ok:
        raise HTTPException(
            status_code=429,
            detail={"error": "Daily rate limit exceeded", "limit": RATE_LIMITS.get(user.plan, 3)},
        )

    # Credits check
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if not credit:
        credit = Credit(user_id=user.id, credits_left=10)
        db.add(credit)
        db.commit()

    if credit.credits_left < credit_cost:
        raise HTTPException(
            status_code=402,
            detail={"error": "Insufficient credits", "required": credit_cost, "available": credit.credits_left},
        )

    # Upload reference image
    image_url = upload_image_to_fal(job_data.reference_image)
    if not image_url:
        raise HTTPException(status_code=400, detail="Failed to process reference image")

    # Upload motion reference video
    motion_video_url = upload_video_to_fal(job_data.reference_video)
    if not motion_video_url:
        raise HTTPException(status_code=400, detail="Failed to process motion reference video")

    # Deduct credits
    credit.credits_left -= credit_cost

    # Create job
    job_id = uuid.uuid4()
    job = TrendingVideoJob(
        id=job_id,
        user_id=user.id,
        flow_type="custom",
        prompt=job_data.prompt,
        reference_image_url=image_url,
        reference_video_url=motion_video_url,
        intensity=job_data.intensity,
        duration=job_data.duration,
        aspect_ratio=job_data.aspect_ratio,
        status="building_prompt",
        progress=5,
    )
    db.add(job)
    db.commit()

    # Start background task
    from app.core.config import settings
    background_tasks.add_task(
        generate_trending_video_task,
        job_id=job_id,
        image_url=image_url,
        motion_video_url=motion_video_url,
        quality=quality,
        user_id=user.id,
        db_url=settings.DATABASE_URL,
    )

    return TrendingVideoJobResponse(
        job_id=job_id,
        status="building_prompt",
        progress=5,
        flow_type="custom",
    )


@router.get("/job/{job_id}", response_model=TrendingVideoJobResponse)
def get_trending_video_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get trending video job status."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = db.query(TrendingVideoJob).filter(
        and_(TrendingVideoJob.id == job_uuid, TrendingVideoJob.user_id == user.id)
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return TrendingVideoJobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        video_url=job.video_url,
        thumbnail_url=job.thumbnail_url,
        error_message=job.error_message,
        flow_type=job.flow_type,
        theme_id=job.theme_id,
    )


@router.get("/themes")
def get_trending_themes():
    """Get available trending themes with preview URLs."""
    from app.services.storage import get_cloudfront_url

    themes = []
    for theme_id, config in TRENDING_THEMES.items():
        # Generate presigned URL for preview video
        preview_url = None
        if config.get("s3_key"):
            try:
                preview_url = get_cloudfront_url(config["s3_key"])
            except Exception as e:
                logger.warning(f"Failed to generate preview URL for {theme_id}: {e}")

        themes.append({
            "id": config["id"],
            "display_name": config["display_name"],
            "description": config["description"],
            "default_duration": config["default_duration"],
            "allowed_durations": config["allowed_durations"],
            "has_motion_video": bool(config.get("s3_key")),
            "preview_url": preview_url,
        })
    return {"themes": themes}


@router.get("/limits")
def get_trending_limits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get rate limits and credit info for trending video."""
    rate_ok, remaining = check_rate_limit(user, db)
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    credits_available = credit.credits_left if credit else 0

    return {
        "plan": user.plan,
        "rate_limit": {
            "daily_limit": RATE_LIMITS.get(user.plan, 3),
            "remaining": remaining,
        },
        "credits": {
            "available": credits_available,
            "costs": CREDIT_COSTS,
        },
    }
