"""
Finalize Worker
Uploads final video to S3, generates thumbnail, and cleans up
Queue: finalize_queue
"""

import os
import shutil
import subprocess
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path
from decimal import Decimal

from app.workers.base import (
    worker_task,
    get_logger,
    update_job_progress,
    update_video_job_db,
    RetryableFailure,
    PermanentFailure,
)
from app.queue.queues import QueueNames
from app.queue.job_manager import PipelineStage
from app.core.config import settings
from app.services.storage import get_storage, get_cloudfront_url

logger = get_logger("finalize")


# ============================================
# Thumbnail Generation
# ============================================
def generate_thumbnail(
    video_path: str,
    output_path: str,
    timestamp: Optional[float] = None,
    width: int = 640,
    height: int = 360,
) -> str:
    """
    Generate a thumbnail from a video using FFmpeg.

    Args:
        video_path: Path to source video
        output_path: Path to save thumbnail
        timestamp: Time in seconds to capture (None = middle of video)
        width: Thumbnail width
        height: Thumbnail height

    Returns:
        Path to generated thumbnail
    """
    # Get video duration if timestamp not specified
    if timestamp is None:
        duration = get_video_duration(video_path)
        timestamp = duration / 2 if duration > 0 else 1.0

    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-ss", str(timestamp),
        "-i", video_path,
        "-vframes", "1",
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-q:v", "2",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            logger.warning(f"Thumbnail generation failed: {result.stderr}")
            # Try alternative: first frame
            return generate_thumbnail_first_frame(video_path, output_path, width, height)

        if os.path.exists(output_path):
            logger.info(f"Generated thumbnail: {output_path}")
            return output_path

        raise Exception("Thumbnail not created")

    except subprocess.TimeoutExpired:
        logger.warning("Thumbnail generation timed out, trying first frame")
        return generate_thumbnail_first_frame(video_path, output_path, width, height)
    except Exception as e:
        logger.warning(f"Thumbnail generation error: {e}, trying first frame")
        return generate_thumbnail_first_frame(video_path, output_path, width, height)


def generate_thumbnail_first_frame(
    video_path: str,
    output_path: str,
    width: int = 640,
    height: int = 360,
) -> str:
    """Generate thumbnail from first frame as fallback"""
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vframes", "1",
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-q:v", "2",
        output_path,
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if os.path.exists(output_path):
            logger.info(f"Generated first-frame thumbnail: {output_path}")
            return output_path

        raise Exception("First-frame thumbnail not created")

    except Exception as e:
        logger.error(f"First-frame thumbnail failed: {e}")
        raise


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using FFprobe"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def get_video_info(video_path: str) -> Dict[str, Any]:
    """Get video metadata using FFprobe"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration,codec_name",
        "-show_entries", "format=duration,size",
        "-of", "json",
        video_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )

        import json
        data = json.loads(result.stdout)

        # Extract info
        stream = data.get("streams", [{}])[0]
        fmt = data.get("format", {})

        duration = float(fmt.get("duration", 0) or stream.get("duration", 0))
        size_bytes = int(fmt.get("size", 0))

        return {
            "width": stream.get("width", 0),
            "height": stream.get("height", 0),
            "duration": duration,
            "codec": stream.get("codec_name", "h264"),
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2),
        }

    except Exception as e:
        logger.warning(f"Failed to get video info: {e}")

        # Fallback: get file size at least
        size_bytes = os.path.getsize(video_path) if os.path.exists(video_path) else 0

        return {
            "width": 0,
            "height": 0,
            "duration": 0,
            "codec": "unknown",
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2),
        }


# ============================================
# CloudFront URL Generation
# ============================================

# ============================================
# Database Updates
# ============================================
def create_video_record(
    job_id: str,
    user_id: str,
    video_url: str,
    thumbnail_url: Optional[str],
    duration: int,
    resolution: str,
    size_mb: float,
) -> Optional[str]:
    """
    Create a new Video record in the database.

    Args:
        job_id: Video job UUID
        user_id: User UUID
        video_url: CDN URL for video
        thumbnail_url: CDN URL for thumbnail
        duration: Video duration in seconds
        resolution: Video resolution (e.g., "1080p")
        size_mb: File size in MB

    Returns:
        Video record UUID or None on failure
    """
    from app.db.database import SessionLocal
    from app.db.models import Video
    import uuid as uuid_module

    db = SessionLocal()
    try:
        # Parse UUIDs
        try:
            job_uuid = uuid_module.UUID(job_id)
            user_uuid = uuid_module.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid UUID format: {e}")
            return None

        # Create video record
        video = Video(
            id=uuid_module.uuid4(),
            job_id=job_uuid,
            user_id=user_uuid,
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            duration=duration,
            resolution=resolution,
            size_mb=Decimal(str(size_mb)),
        )

        db.add(video)
        db.commit()
        db.refresh(video)

        logger.info(f"Created video record: {video.id}")
        return str(video.id)

    except Exception as e:
        logger.error(f"Failed to create video record: {e}")
        db.rollback()
        return None
    finally:
        db.close()


def mark_job_completed(
    job_id: str,
    fallback_used: bool = False,
) -> bool:
    """
    Mark a video job as completed in the database.

    Args:
        job_id: Video job UUID
        fallback_used: Whether fallback was used during processing

    Returns:
        True if update succeeded
    """
    from app.db.database import SessionLocal
    from app.db.models import VideoJob
    import uuid as uuid_module

    db = SessionLocal()
    try:
        job_uuid = uuid_module.UUID(job_id)

        video_job = db.query(VideoJob).filter(VideoJob.id == job_uuid).first()
        if video_job:
            video_job.status = "completed"
            video_job.progress = 100
            video_job.fallback_used = fallback_used
            db.commit()
            logger.info(f"Marked job {job_id} as completed")
            return True
        else:
            logger.warning(f"Job {job_id} not found in database")
            return False

    except Exception as e:
        logger.error(f"Failed to mark job completed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def mark_job_failed(
    job_id: str,
    error_message: str,
) -> bool:
    """
    Mark a video job as failed in the database.

    Args:
        job_id: Video job UUID
        error_message: Error description

    Returns:
        True if update succeeded
    """
    from app.db.database import SessionLocal
    from app.db.models import VideoJob
    import uuid as uuid_module

    db = SessionLocal()
    try:
        job_uuid = uuid_module.UUID(job_id)

        video_job = db.query(VideoJob).filter(VideoJob.id == job_uuid).first()
        if video_job:
            video_job.status = "failed"
            video_job.error_message = error_message[:500]  # Truncate if too long
            db.commit()
            logger.info(f"Marked job {job_id} as failed")
            return True
        else:
            logger.warning(f"Job {job_id} not found in database")
            return False

    except Exception as e:
        logger.error(f"Failed to mark job as failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


# ============================================
# Credit Refund
# ============================================
def refund_credits(
    user_id: str,
    credits: int,
    reason: str,
) -> bool:
    """
    Refund credits to a user after a failed job.

    Args:
        user_id: User UUID
        credits: Number of credits to refund
        reason: Reason for refund

    Returns:
        True if refund succeeded
    """
    if credits <= 0:
        return True

    from app.db.database import SessionLocal
    from app.db.models import Credit, BillingHistory
    import uuid as uuid_module

    db = SessionLocal()
    try:
        user_uuid = uuid_module.UUID(user_id)

        # Update credits
        credit_record = db.query(Credit).filter(Credit.user_id == user_uuid).first()
        if credit_record:
            credit_record.credits_left += credits
        else:
            # Create credit record if doesn't exist
            credit_record = Credit(
                user_id=user_uuid,
                credits_left=credits,
            )
            db.add(credit_record)

        # Log refund in billing history
        billing_entry = BillingHistory(
            id=uuid_module.uuid4(),
            user_id=user_uuid,
            amount=Decimal("0"),
            credits_added=credits,
            plan=None,
            provider="system_refund",
            external_ref=reason[:255],
        )
        db.add(billing_entry)

        db.commit()
        logger.info(f"Refunded {credits} credits to user {user_id}: {reason}")
        return True

    except Exception as e:
        logger.error(f"Failed to refund credits: {e}")
        db.rollback()
        return False
    finally:
        db.close()


# ============================================
# Cleanup Functions
# ============================================
def cleanup_temp_files(job_id: str) -> int:
    """
    Clean up temporary files for a job.

    Args:
        job_id: Job identifier

    Returns:
        Number of files/folders deleted
    """
    deleted_count = 0

    # Clean local temp directory
    temp_dir = Path(settings.TEMP_DIR) / job_id
    if temp_dir.exists():
        try:
            shutil.rmtree(temp_dir)
            deleted_count += 1
            logger.info(f"Deleted local temp directory: {temp_dir}")
        except Exception as e:
            logger.warning(f"Failed to delete local temp dir: {e}")

    # Clean S3 temp files
    try:
        storage = get_storage()
        s3_deleted = storage.cleanup_job_temp_files(job_id)
        deleted_count += s3_deleted

        # Also clean up AI renders (intermediate files)
        ai_deleted = storage.delete_prefix(f"ai-renders/{job_id}/")
        deleted_count += ai_deleted

    except Exception as e:
        logger.warning(f"Failed to delete S3 temp files: {e}")

    logger.info(f"[{job_id}] Cleaned up {deleted_count} temp items")
    return deleted_count


def cleanup_on_failure(job_id: str, user_id: str, credits_consumed: int) -> None:
    """
    Handle cleanup and refund on job failure.

    Args:
        job_id: Job identifier
        user_id: User identifier
        credits_consumed: Credits to refund
    """
    # Clean up temp files
    cleanup_temp_files(job_id)

    # Refund credits
    if credits_consumed > 0:
        refund_credits(user_id, credits_consumed, f"Job {job_id} failed during finalization")


# ============================================
# Main Worker Function
# ============================================
@worker_task(
    worker_name="video_finalizer",
    max_retries=1,
)
def finalize_video(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Upload final video to S3, generate thumbnail, and cleanup.

    Input job_data keys:
        - rendered_video_path: Local path to rendered video
        - job_id: Unique job identifier
        - db_job_id: Database UUID for the job
        - user_id: User ID
        - render_duration: Video duration from render
        - fallback_used: Whether fallback was used
        - aspect_ratio: Video aspect ratio
        - quality_id: Quality setting used

    Output:
        - video_url: CDN URL for final video
        - thumbnail_url: CDN URL for thumbnail
        - duration: Final video duration
        - size_mb: File size in MB
        - video_id: Database video record ID
    """
    job_id = job_data.get("job_id")
    db_job_id = job_data.get("db_job_id")
    user_id = job_data.get("user_id")
    rendered_video_path = job_data.get("rendered_video_path")
    render_duration = job_data.get("render_duration", 0)
    fallback_used = job_data.get("fallback_used", False)
    aspect_ratio = job_data.get("aspect_ratio", "9:16")
    quality_id = job_data.get("quality_id", "standard")
    credits_consumed = job_data.get("credits_consumed", 0)

    logger.info(f"[{job_id}] Finalizing video for user={user_id}")

    update_job_progress(92, PipelineStage.FINALIZING.value)

    # Update database status
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            status="processing",
            progress=92,
        )

    try:
        # Validate video file exists
        if not rendered_video_path or not os.path.exists(rendered_video_path):
            raise PermanentFailure(f"Rendered video not found: {rendered_video_path}")

        # Get video info
        video_info = get_video_info(rendered_video_path)
        duration = int(video_info.get("duration", render_duration))
        size_mb = video_info.get("size_mb", 0)

        logger.info(f"[{job_id}] Video info: {duration}s, {size_mb}MB")

        update_job_progress(93, PipelineStage.FINALIZING.value)

        # ============================================
        # 1. Upload final video to S3
        # ============================================
        storage = get_storage()

        # Determine resolution string
        resolution = _get_resolution_string(video_info.get("height", 1080))

        # Upload video
        video_s3_key = f"final-videos/{user_id}/{job_id}.mp4"
        try:
            storage.upload_file(
                file_path=rendered_video_path,
                s3_key=video_s3_key,
                content_type="video/mp4",
            )
            logger.info(f"[{job_id}] Uploaded video to S3: {video_s3_key}")
        except Exception as e:
            logger.error(f"[{job_id}] S3 video upload failed: {e}")
            raise RetryableFailure(f"S3 upload failed: {str(e)}")

        update_job_progress(95, PipelineStage.FINALIZING.value)

        # ============================================
        # 2. Generate and upload thumbnail
        # ============================================
        temp_dir = Path(settings.TEMP_DIR) / job_id / "finalize"
        temp_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_path = str(temp_dir / "thumbnail.jpg")

        # Determine thumbnail dimensions based on aspect ratio
        thumb_width, thumb_height = _get_thumbnail_dimensions(aspect_ratio)

        try:
            generate_thumbnail(
                video_path=rendered_video_path,
                output_path=thumbnail_path,
                width=thumb_width,
                height=thumb_height,
            )

            # Upload thumbnail
            thumbnail_s3_key = f"thumbnails/{user_id}/{job_id}.jpg"
            storage.upload_file(
                file_path=thumbnail_path,
                s3_key=thumbnail_s3_key,
                content_type="image/jpeg",
            )
            logger.info(f"[{job_id}] Uploaded thumbnail to S3: {thumbnail_s3_key}")

        except Exception as e:
            logger.warning(f"[{job_id}] Thumbnail generation/upload failed: {e}")
            thumbnail_s3_key = None

        update_job_progress(97, PipelineStage.FINALIZING.value)

        # ============================================
        # 3. Generate CDN URLs
        # ============================================
        video_url = get_cloudfront_url(video_s3_key)
        thumbnail_url = get_cloudfront_url(thumbnail_s3_key) if thumbnail_s3_key else None

        logger.info(f"[{job_id}] Video URL: {video_url}")

        update_job_progress(98, PipelineStage.FINALIZING.value)

        # ============================================
        # 4. Create database records
        # ============================================
        video_record_id = None

        if db_job_id and user_id:
            # Create video record
            video_record_id = create_video_record(
                job_id=str(db_job_id),
                user_id=user_id,
                video_url=video_url,
                thumbnail_url=thumbnail_url,
                duration=duration,
                resolution=resolution,
                size_mb=size_mb,
            )

            # Mark job as completed
            mark_job_completed(str(db_job_id), fallback_used)

        update_job_progress(99, PipelineStage.FINALIZING.value)

        # ============================================
        # 5. Cleanup temporary files
        # ============================================
        cleanup_temp_files(job_id)

        update_job_progress(100, PipelineStage.COMPLETED.value)

        if db_job_id:
            update_video_job_db(
                job_id=str(db_job_id),
                status="completed",
                progress=100,
            )

        logger.info(f"[{job_id}] Video finalized successfully: {video_url}")

        return {
            "job_id": job_id,
            "db_job_id": db_job_id,
            "status": "completed",
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "video_id": video_record_id,
            "duration": duration,
            "size_mb": size_mb,
            "resolution": resolution,
            "fallback_used": fallback_used,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    except PermanentFailure as e:
        logger.error(f"[{job_id}] Permanent failure: {str(e)}")

        # Mark job as failed in database
        if db_job_id:
            mark_job_failed(str(db_job_id), str(e))

        # Cleanup and refund
        cleanup_on_failure(job_id, user_id, credits_consumed)

        raise

    except RetryableFailure:
        raise

    except Exception as e:
        logger.error(f"[{job_id}] Finalization failed: {str(e)}")

        # Mark job as failed
        if db_job_id:
            mark_job_failed(str(db_job_id), str(e))

        # Cleanup and refund on final failure
        cleanup_on_failure(job_id, user_id, credits_consumed)

        raise RetryableFailure(f"Finalization error: {str(e)}")


# ============================================
# Helper Functions
# ============================================
def _get_resolution_string(height: int) -> str:
    """Convert pixel height to resolution string"""
    if height >= 2160:
        return "4K"
    elif height >= 1440:
        return "1440p"
    elif height >= 1080:
        return "1080p"
    elif height >= 720:
        return "720p"
    elif height >= 480:
        return "480p"
    else:
        return f"{height}p"


def _get_thumbnail_dimensions(aspect_ratio: str) -> tuple:
    """Get thumbnail dimensions based on video aspect ratio"""
    aspect_map = {
        "9:16": (360, 640),   # Portrait/TikTok
        "1:1": (480, 480),    # Square/Instagram
        "16:9": (640, 360),   # Landscape/YouTube
        "4:5": (400, 500),    # Instagram portrait
    }
    return aspect_map.get(aspect_ratio, (640, 360))
