"""
Video Generation API Endpoints
Handles video job creation, status polling, and video retrieval
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from app.db import get_db
from app.db.models import User, Credit, VideoJob, Video, QualityOption
from app.core.auth import get_current_user
from app.schemas import VideoJobCreate, VideoJobResponse, VideoResponse
from app.queue.job_manager import (
    create_video_job,
    get_job_status,
    cancel_job,
    JobStatus,
)

router = APIRouter(prefix="/video", tags=["Video"])


# ============================================
# Rate Limiting Configuration
# ============================================
RATE_LIMITS = {
    "free": 10,      # 10 jobs per day
    "basic": 50,     # 50 jobs per day
    "pro": 100,      # 100 jobs per day
    "premium": 500,  # 500 jobs per day
}

MAX_CONCURRENT_JOBS = {
    "free": 1,
    "basic": 2,
    "pro": 3,
    "premium": 5,
}


# ============================================
# Helper Functions
# ============================================
def check_rate_limit(user: User, db: Session) -> tuple[bool, int]:
    """
    Check if user has exceeded their daily rate limit.

    Returns:
        Tuple of (is_allowed, jobs_remaining)
    """
    daily_limit = RATE_LIMITS.get(user.plan, 10)

    # Count jobs created in the last 24 hours
    cutoff = datetime.utcnow() - timedelta(hours=24)
    jobs_today = db.query(func.count(VideoJob.id)).filter(
        and_(
            VideoJob.user_id == user.id,
            VideoJob.created_at >= cutoff
        )
    ).scalar()

    remaining = daily_limit - jobs_today
    return remaining > 0, max(0, remaining)


def check_concurrent_limit(user: User, db: Session) -> tuple[bool, int]:
    """
    Check if user has too many concurrent jobs.

    Returns:
        Tuple of (is_allowed, active_jobs_count)
    """
    max_concurrent = MAX_CONCURRENT_JOBS.get(user.plan, 1)

    # Count active jobs (queued or processing)
    active_jobs = db.query(func.count(VideoJob.id)).filter(
        and_(
            VideoJob.user_id == user.id,
            VideoJob.status.in_(['queued', 'processing'])
        )
    ).scalar()

    return active_jobs < max_concurrent, active_jobs


def get_credits_required(quality_id: str, db: Session) -> int:
    """Get credits required for a quality option"""
    quality = db.query(QualityOption).filter(QualityOption.id == quality_id).first()
    if not quality:
        raise HTTPException(status_code=400, detail=f"Invalid quality option: {quality_id}")
    return quality.credits_required


def validate_job_inputs(job_data: VideoJobCreate, db: Session) -> None:
    """Validate all job inputs exist in database"""
    from app.db.models import Genre, VisualStyle, Preset, Voice, Music

    # Validate genre
    if not db.query(Genre).filter(Genre.id == job_data.genre_id).first():
        raise HTTPException(status_code=400, detail=f"Invalid genre: {job_data.genre_id}")

    # Validate visual style
    if not db.query(VisualStyle).filter(VisualStyle.id == job_data.style_id).first():
        raise HTTPException(status_code=400, detail=f"Invalid visual style: {job_data.style_id}")

    # Validate preset belongs to the visual style
    preset = db.query(Preset).filter(Preset.id == job_data.preset_id).first()
    if not preset:
        raise HTTPException(status_code=400, detail=f"Invalid preset: {job_data.preset_id}")
    if preset.visual_style_id != job_data.style_id:
        raise HTTPException(status_code=400, detail=f"Preset {job_data.preset_id} does not belong to style {job_data.style_id}")

    # Validate quality option
    if not db.query(QualityOption).filter(QualityOption.id == job_data.quality).first():
        raise HTTPException(status_code=400, detail=f"Invalid quality option: {job_data.quality}")

    # Validate voice
    if not db.query(Voice).filter(Voice.id == job_data.voice_id).first():
        raise HTTPException(status_code=400, detail=f"Invalid voice: {job_data.voice_id}")

    # Validate music
    if not db.query(Music).filter(Music.id == job_data.music_id).first():
        raise HTTPException(status_code=400, detail=f"Invalid music: {job_data.music_id}")

    # Validate duration
    if job_data.duration not in [15, 30, 45, 60]:
        raise HTTPException(status_code=400, detail="Duration must be 15, 30, 45, or 60 seconds")

    # Validate aspect ratio
    if job_data.aspect_ratio not in ["9:16", "1:1", "16:9"]:
        raise HTTPException(status_code=400, detail="Aspect ratio must be 9:16, 1:1, or 16:9")


# ============================================
# Video Generation Endpoints
# ============================================
@router.post("/generate", response_model=VideoJobResponse)
def generate_video(
    job_data: VideoJobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new video generation job.

    This endpoint:
    1. Validates all input parameters
    2. Checks user credits
    3. Checks rate limits
    4. Checks concurrent job limit
    5. Deducts credits
    6. Creates database entry
    7. Enqueues job to llm_queue
    8. Returns job_id for status polling
    """
    # 1. Validate all inputs
    validate_job_inputs(job_data, db)

    # 2. Check rate limit
    rate_allowed, jobs_remaining = check_rate_limit(user, db)
    if not rate_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily rate limit exceeded",
                "limit": RATE_LIMITS.get(user.plan, 10),
                "resets_in": "24 hours",
                "upgrade_url": "/pricing"
            }
        )

    # 3. Check concurrent job limit
    concurrent_allowed, active_jobs = check_concurrent_limit(user, db)
    if not concurrent_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Too many concurrent jobs",
                "active_jobs": active_jobs,
                "limit": MAX_CONCURRENT_JOBS.get(user.plan, 1),
                "message": "Please wait for current job to complete"
            }
        )

    # 4. Get credits required and check balance
    credits_required = get_credits_required(job_data.quality, db)

    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if not credit:
        # Create credits entry if doesn't exist (new user)
        credit = Credit(user_id=user.id, credits_left=10)
        db.add(credit)
        db.commit()

    if credit.credits_left < credits_required:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": credits_required,
                "available": credit.credits_left,
                "purchase_url": "/credits"
            }
        )

    # 5. Deduct credits immediately
    credit.credits_left -= credits_required

    # 6. Create database entry
    job_id = uuid.uuid4()
    video_job = VideoJob(
        id=job_id,
        user_id=user.id,
        genre_id=job_data.genre_id,
        visual_style_id=job_data.style_id,
        preset_id=job_data.preset_id,
        quality_id=job_data.quality,
        voice_id=job_data.voice_id,
        music_id=job_data.music_id,
        topic=job_data.topic,
        duration=job_data.duration,
        aspect_ratio=job_data.aspect_ratio,
        advanced=job_data.advanced or {
            "emphasis_words": True,
            "fast_cuts": False,
            "auto_effects": True,
            "auto_captions": True,
        },
        status="queued",
        progress=0,
    )
    db.add(video_job)
    db.commit()

    # 7. Enqueue job to llm_queue
    try:
        queue_result = create_video_job(
            user_id=str(user.id),
            genre_id=job_data.genre_id,
            visual_style_id=job_data.style_id,
            preset_id=job_data.preset_id,
            quality_id=job_data.quality,
            voice_id=job_data.voice_id,
            music_id=job_data.music_id,
            topic=job_data.topic,
            duration=job_data.duration,
            aspect_ratio=job_data.aspect_ratio,
            advanced_options=job_data.advanced,
            is_premium=user.plan in ["pro", "premium"],
            db_job_id=str(job_id),  # Pass database job UUID
        )

        # Update job with queue job_id
        video_job.status = queue_result["status"]
        db.commit()

    except Exception as e:
        # Refund credits if enqueue fails
        credit.credits_left += credits_required
        video_job.status = "failed"
        video_job.error_message = str(e)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to enqueue job",
                "message": str(e),
                "credits_refunded": True
            }
        )

    # 8. Return job response
    return VideoJobResponse(
        job_id=job_id,
        status="queued",
        progress=0,
        video_url=None,
        thumbnail_url=None,
        error_message=None,
    )


@router.get("/job/{job_id}", response_model=VideoJobResponse)
def get_video_job_status(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Poll the status of a video generation job.

    Returns:
        - status: queued, processing, completed, failed
        - progress: 0-100 percentage
        - video_url: URL when completed
        - thumbnail_url: Thumbnail URL when completed
        - error_message: Error details if failed
    """
    # Parse job_id
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    # Get job from database
    video_job = db.query(VideoJob).filter(
        and_(
            VideoJob.id == job_uuid,
            VideoJob.user_id == user.id  # Ensure user owns this job
        )
    ).first()

    if not video_job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Try to get real-time status from queue
    queue_status = get_job_status(f"job_{job_id.replace('-', '')[:12]}")

    if queue_status:
        # Update database with latest status
        if queue_status["status"] != video_job.status:
            video_job.status = queue_status["status"]
            video_job.progress = queue_status.get("progress", 0)

            if queue_status["status"] == "completed":
                video_job.progress = 100
            elif queue_status["status"] == "failed":
                video_job.error_message = queue_status.get("error", "Unknown error")

            db.commit()

    # Get video URL if completed
    video_url = None
    thumbnail_url = None

    if video_job.status == "completed":
        video = db.query(Video).filter(Video.job_id == job_uuid).first()
        if video:
            video_url = video.video_url
            thumbnail_url = video.thumbnail_url

    return VideoJobResponse(
        job_id=job_uuid,
        status=video_job.status,
        progress=video_job.progress,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        error_message=video_job.error_message,
    )


@router.post("/job/{job_id}/cancel")
def cancel_video_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a queued video job.

    Only jobs in 'queued' status can be cancelled.
    Credits will be refunded.
    """
    # Parse job_id
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    # Get job from database
    video_job = db.query(VideoJob).filter(
        and_(
            VideoJob.id == job_uuid,
            VideoJob.user_id == user.id
        )
    ).first()

    if not video_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if video_job.status != "queued":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job in '{video_job.status}' status"
        )

    # Try to cancel in queue
    cancelled = cancel_job(f"job_{job_id.replace('-', '')[:12]}")

    # Refund credits
    credits_required = get_credits_required(video_job.quality_id, db)
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    if credit:
        credit.credits_left += credits_required

    # Update job status
    video_job.status = "cancelled"
    db.commit()

    return {
        "success": True,
        "message": "Job cancelled",
        "credits_refunded": credits_required
    }


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get metadata for a completed video.
    """
    # Parse video_id
    try:
        video_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    video = db.query(Video).filter(
        and_(
            Video.id == video_uuid,
            Video.user_id == user.id
        )
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return VideoResponse(
        id=video.id,
        video_url=video.video_url,
        thumbnail_url=video.thumbnail_url,
        duration=video.duration,
        resolution=video.resolution,
        created_at=video.created_at,
    )


@router.get("/list", response_model=List[VideoResponse])
def list_videos(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    List all videos for the current user.

    Supports pagination with limit and offset.
    """
    videos = db.query(Video).filter(
        Video.user_id == user.id
    ).order_by(
        Video.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [
        VideoResponse(
            id=video.id,
            video_url=video.video_url,
            thumbnail_url=video.thumbnail_url,
            duration=video.duration,
            resolution=video.resolution,
            created_at=video.created_at,
        )
        for video in videos
    ]


@router.get("/jobs", response_model=List[VideoJobResponse])
def list_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    List all video jobs for the current user.

    Optionally filter by status (queued, processing, completed, failed).
    """
    query = db.query(VideoJob).filter(VideoJob.user_id == user.id)

    if status:
        if status not in ["queued", "processing", "completed", "failed", "cancelled"]:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.filter(VideoJob.status == status)

    jobs = query.order_by(VideoJob.created_at.desc()).offset(offset).limit(limit).all()

    # Get associated videos for completed jobs
    job_ids = [j.id for j in jobs if j.status == "completed"]
    videos = {v.job_id: v for v in db.query(Video).filter(Video.job_id.in_(job_ids)).all()} if job_ids else {}

    return [
        VideoJobResponse(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            video_url=videos.get(job.id).video_url if job.id in videos else None,
            thumbnail_url=videos.get(job.id).thumbnail_url if job.id in videos else None,
            error_message=job.error_message,
        )
        for job in jobs
    ]


@router.get("/limits")
def get_user_limits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current rate limits and usage for the user.
    """
    rate_allowed, jobs_remaining = check_rate_limit(user, db)
    concurrent_allowed, active_jobs = check_concurrent_limit(user, db)

    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    credits_available = credit.credits_left if credit else 0

    return {
        "plan": user.plan,
        "rate_limit": {
            "daily_limit": RATE_LIMITS.get(user.plan, 10),
            "jobs_remaining": jobs_remaining,
            "resets_in": "24 hours",
        },
        "concurrent_limit": {
            "max_concurrent": MAX_CONCURRENT_JOBS.get(user.plan, 1),
            "active_jobs": active_jobs,
            "can_create": concurrent_allowed,
        },
        "credits": {
            "available": credits_available,
        }
    }
