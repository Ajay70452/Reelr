"""
Base Worker Class
Provides common functionality for all pipeline workers
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
from functools import wraps
from rq import get_current_job
from rq.job import Job

from app.queue.queues import QueueNames, enqueue_job

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


class WorkerException(Exception):
    """Base exception for worker errors"""
    def __init__(self, message: str, retryable: bool = True):
        self.message = message
        self.retryable = retryable
        super().__init__(self.message)


class PermanentFailure(WorkerException):
    """Non-retryable failure"""
    def __init__(self, message: str):
        super().__init__(message, retryable=False)


class RetryableFailure(WorkerException):
    """Retryable failure"""
    def __init__(self, message: str):
        super().__init__(message, retryable=True)


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger for a worker"""
    return logging.getLogger(f"worker.{name}")


def worker_task(
    worker_name: str,
    max_retries: int = 2,
    fallback_queue: Optional[QueueNames] = None,
    fallback_func: Optional[Callable] = None,
):
    """
    Decorator for worker tasks that provides:
    - Automatic logging
    - Retry logic
    - Fallback handling
    - Job metadata updates

    Args:
        worker_name: Name for logging
        max_retries: Maximum retry attempts
        fallback_queue: Queue to use if all retries fail
        fallback_func: Function to call as fallback
    """
    logger = get_logger(worker_name)

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(job_data: Dict[str, Any], *args, **kwargs):
            job = get_current_job()
            job_id = job_data.get("job_id", "unknown")

            # Track retry count
            retry_count = job.meta.get("retry_count", 0) if job else 0

            logger.info(f"[{job_id}] Starting {worker_name} (attempt {retry_count + 1}/{max_retries + 1})")

            try:
                # Update job metadata
                if job:
                    job.meta["worker"] = worker_name
                    job.meta["started_at"] = datetime.utcnow().isoformat()
                    job.save_meta()

                # Execute the actual worker function
                result = func(job_data, *args, **kwargs)

                logger.info(f"[{job_id}] {worker_name} completed successfully")
                return result

            except PermanentFailure as e:
                logger.error(f"[{job_id}] {worker_name} permanent failure: {e.message}")
                _handle_failure(job, job_data, e, logger, fallback_queue, fallback_func)
                raise

            except RetryableFailure as e:
                logger.warning(f"[{job_id}] {worker_name} retryable failure: {e.message}")

                if retry_count < max_retries:
                    # Retry the job
                    logger.info(f"[{job_id}] Retrying {worker_name} (attempt {retry_count + 2})")
                    if job:
                        job.meta["retry_count"] = retry_count + 1
                        job.save_meta()
                    raise  # Let RQ handle the retry

                else:
                    # Max retries reached, try fallback
                    logger.error(f"[{job_id}] Max retries reached for {worker_name}")
                    _handle_failure(job, job_data, e, logger, fallback_queue, fallback_func)
                    raise

            except Exception as e:
                logger.exception(f"[{job_id}] {worker_name} unexpected error: {str(e)}")

                if retry_count < max_retries:
                    if job:
                        job.meta["retry_count"] = retry_count + 1
                        job.save_meta()
                    raise

                _handle_failure(job, job_data, e, logger, fallback_queue, fallback_func)
                raise

        return wrapper
    return decorator


def _handle_failure(
    job: Optional[Job],
    job_data: Dict[str, Any],
    error: Exception,
    logger: logging.Logger,
    fallback_queue: Optional[QueueNames],
    fallback_func: Optional[Callable],
):
    """Handle worker failure with optional fallback"""
    job_id = job_data.get("job_id", "unknown")

    if fallback_queue and fallback_func:
        logger.info(f"[{job_id}] Triggering fallback to {fallback_queue.value}")

        # Mark fallback in job data
        job_data["fallback_used"] = True
        job_data["fallback_reason"] = str(error)

        # Enqueue fallback
        enqueue_job(
            queue_name=fallback_queue,
            func=fallback_func,
            job_data=job_data,
            job_id=f"{job_id}_fallback",
            meta={
                "original_job_id": job_id,
                "fallback": True,
            },
        )

        if job:
            job.meta["fallback_triggered"] = True
            job.meta["fallback_queue"] = fallback_queue.value
            job.save_meta()

    else:
        logger.error(f"[{job_id}] No fallback available, job failed permanently")


def update_job_progress(progress: int, stage: str) -> None:
    """Update current job progress and stage"""
    job = get_current_job()
    if job:
        job.meta["progress"] = progress
        job.meta["stage"] = stage
        job.meta["updated_at"] = datetime.utcnow().isoformat()
        job.save_meta()


def update_video_job_db(
    job_id: str,
    status: Optional[str] = None,
    progress: Optional[int] = None,
    script: Optional[str] = None,
    scenes: Optional[list] = None,
    error_message: Optional[str] = None,
    fallback_used: Optional[bool] = None,
) -> None:
    """
    Update VideoJob record in database.

    Args:
        job_id: The job UUID (may have prefix like 'job_')
        status: New status (queued, processing, completed, failed)
        progress: Progress percentage (0-100)
        script: Generated script text
        scenes: List of scene dictionaries
        error_message: Error message if failed
        fallback_used: Whether fallback was triggered
    """
    from app.db.database import SessionLocal
    from app.db.models import VideoJob
    import uuid

    # Extract UUID from job_id (remove any prefix)
    job_uuid_str = job_id
    if job_id.startswith("job_"):
        # This is a queue job ID, need to find the actual DB record
        # The job_data should contain the actual UUID
        return

    try:
        job_uuid = uuid.UUID(job_uuid_str)
    except (ValueError, AttributeError):
        logging.getLogger("worker.db").warning(f"Invalid job_id format: {job_id}")
        return

    db = SessionLocal()
    try:
        video_job = db.query(VideoJob).filter(VideoJob.id == job_uuid).first()
        if video_job:
            if status is not None:
                video_job.status = status
            if progress is not None:
                video_job.progress = progress
            if script is not None:
                video_job.script = script
            if scenes is not None:
                video_job.scenes = scenes
            if error_message is not None:
                video_job.error_message = error_message
            if fallback_used is not None:
                video_job.fallback_used = fallback_used

            db.commit()
    except Exception as e:
        logging.getLogger("worker.db").error(f"Failed to update VideoJob {job_id}: {str(e)}")
        db.rollback()
    finally:
        db.close()


def get_job_data() -> Optional[Dict[str, Any]]:
    """Get the current job's data"""
    job = get_current_job()
    if job:
        return job.args[0] if job.args else None
    return None


class BaseWorker(ABC):
    """
    Abstract base class for workers.
    Provides common functionality for pipeline workers.
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = get_logger(name)

    @abstractmethod
    def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a job. Must be implemented by subclasses."""
        pass

    def log_info(self, job_id: str, message: str) -> None:
        """Log an info message"""
        self.logger.info(f"[{job_id}] {message}")

    def log_error(self, job_id: str, message: str) -> None:
        """Log an error message"""
        self.logger.error(f"[{job_id}] {message}")
