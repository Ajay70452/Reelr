"""
Script-to-Video API Endpoints
Handles script-to-video generation jobs (Moving Images V1)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging

from app.db import get_db
from app.db.models import User, Credit, ScriptToVideoJob, ScriptToVideo
from app.core.auth import get_current_user
from app.schemas import (
    ScriptToVideoJobCreate,
    ScriptToVideoJobResponse,
    ScriptToVideoResponse,
    SceneBreakdown,
)
from app.services.model_router import IMAGE_MODELS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/script-to-video", tags=["Script-to-Video"])


# ============================================
# Configuration
# ============================================
RATE_LIMITS = {
    "free": 50,      # 50 videos per day (generous for dev/testing)
    "basic": 100,    # 100 videos per day
    "pro": 500,      # 500 videos per day
    "premium": 200,  # 200 videos per day
}

# Credits per video (base cost, scales with scene count)
BASE_CREDIT_COST = 5
CREDIT_PER_SCENE = 1


# ============================================
# Helper Functions
# ============================================
def check_rate_limit(user: User, db: Session) -> tuple[bool, int]:
    """Check if user has exceeded their daily rate limit."""
    daily_limit = RATE_LIMITS.get(user.plan, 5)

    cutoff = datetime.utcnow() - timedelta(hours=24)
    jobs_today = db.query(func.count(ScriptToVideoJob.id)).filter(
        and_(
            ScriptToVideoJob.user_id == user.id,
            ScriptToVideoJob.created_at >= cutoff
        )
    ).scalar()

    remaining = daily_limit - jobs_today
    return remaining > 0, max(0, remaining)


DURATION_TO_SCENES = {30: 4, 45: 5, 60: 6}


def scenes_for_duration(duration: int) -> int:
    """Get exact scene count for a duration."""
    return DURATION_TO_SCENES.get(duration, 4)


def calculate_credits(duration: int) -> int:
    """Calculate credit cost based on duration (predictable pricing)."""
    scene_count = scenes_for_duration(duration)
    return BASE_CREDIT_COST + (scene_count * CREDIT_PER_SCENE)


def run_script_to_video_job_sync(job_id: uuid.UUID, db_url: str):
    """Background task wrapper - runs async job in sync context."""
    from app.services.script_to_video import process_script_to_video_job
    import asyncio

    # Create new event loop for this thread (BackgroundTasks runs in thread pool)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(process_script_to_video_job(job_id, db_url))
    finally:
        loop.close()


# ============================================
# Endpoints
# ============================================
@router.post("/generate", response_model=ScriptToVideoJobResponse)
async def generate_script_to_video(
    job_data: ScriptToVideoJobCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new script-to-video generation job.

    Media types:
    - moving_images: AI-generated images with motion (V1 - enabled)
    - ai_video: Full AI video generation (Coming soon)
    - stock_video: Stock footage compilation (Coming soon)

    Image models:
    - flux-2-pro: High quality Flux model
    - flux-2-max: Maximum quality Flux model
    - nano-banana: Fast generation
    - nano-banana-pro: Fast generation with better quality
    """
    # Validate media type (V1: only moving_images)
    if job_data.media_type != "moving_images":
        raise HTTPException(
            status_code=400,
            detail=f"Media type '{job_data.media_type}' is not available yet. Use 'moving_images'."
        )

    # Validate image model
    if job_data.image_model not in IMAGE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image model: {job_data.image_model}"
        )

    # Validate aspect ratio
    valid_ratios = ["9:16", "16:9", "1:1"]
    if job_data.aspect_ratio not in valid_ratios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid aspect ratio. Must be one of: {valid_ratios}"
        )

    # Validate duration
    valid_durations = [30, 45, 60]
    if job_data.duration not in valid_durations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid duration. Must be one of: {valid_durations}"
        )

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

    # Calculate credit cost (based on duration = predictable)
    credit_cost = calculate_credits(job_data.duration)

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

    # Deduct credits
    credit.credits_left -= credit_cost

    # Create job record
    job_id = uuid.uuid4()
    job = ScriptToVideoJob(
        id=job_id,
        user_id=user.id,
        script=job_data.script,
        media_type=job_data.media_type,
        preset_id=job_data.preset_id,
        image_model=job_data.image_model,
        aspect_ratio=job_data.aspect_ratio,
        duration=job_data.duration,
        consistent_character=job_data.consistent_character,
        bgm_id=job_data.bgm_id,
        voice_id=job_data.voice_id,
        status="queued",
        progress=0,
    )
    db.add(job)
    db.commit()

    # Get database URL for background task
    from app.core.config import settings
    db_url = settings.DATABASE_URL

    # Start background processing
    background_tasks.add_task(run_script_to_video_job_sync, job_id, db_url)

    return ScriptToVideoJobResponse(
        job_id=job_id,
        status="queued",
        progress=0,
        current_step="Queued for processing",
        total_scenes=None,
        completed_scenes=None,
        video_url=None,
        thumbnail_url=None,
        error_message=None,
    )


@router.get("/job/{job_id}", response_model=ScriptToVideoJobResponse)
def get_job_status(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of a script-to-video generation job."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = db.query(ScriptToVideoJob).filter(
        and_(
            ScriptToVideoJob.id == job_uuid,
            ScriptToVideoJob.user_id == user.id
        )
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get video URL if completed
    video_url = None
    thumbnail_url = None

    if job.status == "completed":
        video = db.query(ScriptToVideo).filter(ScriptToVideo.job_id == job_uuid).first()
        if video:
            video_url = video.video_url
            thumbnail_url = video.thumbnail_url

    # Parse stored scenes into response format
    scenes_breakdown = None
    if job.scenes:
        scenes_breakdown = [
            SceneBreakdown(
                scene_id=s.get("scene_id", i + 1),
                narration=s.get("narration", ""),
                visual_description=s.get("visual_description", ""),
                duration=s.get("duration", 0),
            )
            for i, s in enumerate(job.scenes)
        ]

    return ScriptToVideoJobResponse(
        job_id=job_uuid,
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        total_scenes=job.total_scenes,
        completed_scenes=job.completed_scenes,
        scenes=scenes_breakdown,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        error_message=job.error_message,
    )


@router.get("/list", response_model=List[ScriptToVideoResponse])
def list_videos(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List all script-to-video outputs for the current user."""
    videos = db.query(ScriptToVideo).filter(
        ScriptToVideo.user_id == user.id
    ).order_by(
        ScriptToVideo.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [
        ScriptToVideoResponse(
            id=video.id,
            video_url=video.video_url,
            thumbnail_url=video.thumbnail_url,
            duration=video.duration,
            resolution=video.resolution,
            aspect_ratio=video.aspect_ratio,
            scene_count=video.scene_count,
            script_preview=video.script_preview,
            created_at=video.created_at,
        )
        for video in videos
    ]


@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a generated video."""
    try:
        video_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    video = db.query(ScriptToVideo).filter(
        and_(
            ScriptToVideo.id == video_uuid,
            ScriptToVideo.user_id == user.id
        )
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete associated job if exists
    if video.job_id:
        job = db.query(ScriptToVideoJob).filter(ScriptToVideoJob.id == video.job_id).first()
        if job:
            db.delete(job)

    db.delete(video)
    db.commit()

    return {"success": True, "message": "Video deleted"}


@router.get("/limits")
def get_limits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current rate limits and usage for script-to-video."""
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
            "base_cost": BASE_CREDIT_COST,
            "cost_per_scene": CREDIT_PER_SCENE,
        }
    }


@router.post("/estimate")
def estimate_cost(
    duration: int = 30,
    user: User = Depends(get_current_user),
):
    """Estimate credit cost for a given duration."""
    scene_count = scenes_for_duration(duration)
    credit_cost = calculate_credits(duration)

    return {
        "duration": duration,
        "scene_count": scene_count,
        "credit_cost": credit_cost,
        "breakdown": {
            "base_cost": BASE_CREDIT_COST,
            "scene_cost": scene_count * CREDIT_PER_SCENE,
        }
    }


# NOTE: This route MUST be last to avoid matching other endpoints
@router.get("/{video_id}", response_model=ScriptToVideoResponse)
def get_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get metadata for a generated video."""
    try:
        video_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    video = db.query(ScriptToVideo).filter(
        and_(
            ScriptToVideo.id == video_uuid,
            ScriptToVideo.user_id == user.id
        )
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return ScriptToVideoResponse(
        id=video.id,
        video_url=video.video_url,
        thumbnail_url=video.thumbnail_url,
        duration=video.duration,
        resolution=video.resolution,
        aspect_ratio=video.aspect_ratio,
        scene_count=video.scene_count,
        script_preview=video.script_preview,
        created_at=video.created_at,
    )
