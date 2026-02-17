"""
Queue Configuration
Defines all queues for the video generation pipeline
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from rq import Queue
from rq.job import Job
from datetime import timedelta

from app.queue.connection import get_redis_connection


class QueueNames(str, Enum):
    """
    All queue names for the video generation pipeline.
    Jobs flow through queues in this order:
    LLM -> SCENE -> VISUAL -> AUDIO -> CAPTION -> RENDER -> FINALIZE
    """

    # Pipeline queues (in order of execution)
    LLM = "llm_queue"              # Script generation (CPU, fast)
    SCENE = "scene_queue"          # Scene parsing (CPU, fast)
    VISUAL = "visual_queue"        # Main visual routing queue
    VISUAL_KLING = "visual_kling_queue"    # Kling 2.6 video generation (GPU)
    VISUAL_MOTION = "visual_motion_queue"  # Moving images - Flux + motion (GPU)
    VISUAL_STOCK = "visual_stock_queue"    # Stock footage fallback (CPU)
    AUDIO = "audio_queue"          # TTS + music processing (CPU)
    CAPTION = "caption_queue"      # Caption timing generation (CPU)
    RENDER = "render_queue"        # FFmpeg composition (CPU-heavy)
    FINALIZE = "finalize_queue"    # S3 upload + cleanup (CPU)

    # Priority queues
    HIGH_PRIORITY = "high_priority_queue"  # Premium user jobs

    # Utility queues
    CLEANUP = "cleanup_queue"      # Cleanup failed/abandoned jobs
    WEBHOOK = "webhook_queue"      # Webhook notifications


# Queue configurations
QUEUE_CONFIG: Dict[QueueNames, dict] = {
    QueueNames.LLM: {
        "default_timeout": 60,       # 1 minute
        "max_retries": 2,
        "description": "LLM script generation",
    },
    QueueNames.SCENE: {
        "default_timeout": 30,       # 30 seconds
        "max_retries": 1,
        "description": "Scene parsing and structuring",
    },
    QueueNames.VISUAL: {
        "default_timeout": 300,      # 5 minutes
        "max_retries": 2,
        "description": "Visual content routing",
    },
    QueueNames.VISUAL_KLING: {
        "default_timeout": 600,      # 10 minutes (GPU heavy)
        "max_retries": 2,
        "description": "Kling 2.6 cinematic video generation",
    },
    QueueNames.VISUAL_MOTION: {
        "default_timeout": 300,      # 5 minutes (GPU)
        "max_retries": 2,
        "description": "Flux + AnimateDiff motion generation",
    },
    QueueNames.VISUAL_STOCK: {
        "default_timeout": 120,      # 2 minutes
        "max_retries": 1,
        "description": "Stock footage fallback",
    },
    QueueNames.AUDIO: {
        "default_timeout": 120,      # 2 minutes
        "max_retries": 1,
        "description": "TTS voice + music processing",
    },
    QueueNames.CAPTION: {
        "default_timeout": 60,       # 1 minute
        "max_retries": 1,
        "description": "Caption timing generation",
    },
    QueueNames.RENDER: {
        "default_timeout": 300,      # 5 minutes
        "max_retries": 1,
        "description": "FFmpeg video composition",
    },
    QueueNames.FINALIZE: {
        "default_timeout": 120,      # 2 minutes
        "max_retries": 1,
        "description": "S3 upload and cleanup",
    },
    QueueNames.HIGH_PRIORITY: {
        "default_timeout": 600,      # 10 minutes
        "max_retries": 2,
        "description": "Premium user priority queue",
    },
    QueueNames.CLEANUP: {
        "default_timeout": 300,
        "max_retries": 0,
        "description": "Cleanup and maintenance",
    },
    QueueNames.WEBHOOK: {
        "default_timeout": 30,
        "max_retries": 3,
        "description": "Webhook notifications",
    },
}


# Cache for queue instances
_queue_cache: Dict[str, Queue] = {}


def get_queue(queue_name: QueueNames) -> Queue:
    """Get or create a queue by name"""
    name = queue_name.value

    if name not in _queue_cache:
        conn = get_redis_connection()
        config = QUEUE_CONFIG.get(queue_name, {})

        _queue_cache[name] = Queue(
            name=name,
            connection=conn,
            default_timeout=config.get("default_timeout", 180),
        )

    return _queue_cache[name]


def get_all_queues() -> Dict[str, Queue]:
    """Get all pipeline queues"""
    return {qn.value: get_queue(qn) for qn in QueueNames}


def enqueue_job(
    queue_name: QueueNames,
    func: Callable,
    *args,
    job_id: Optional[str] = None,
    job_timeout: Optional[int] = None,
    result_ttl: int = 86400,  # Keep results for 24 hours
    failure_ttl: int = 604800,  # Keep failures for 7 days
    meta: Optional[dict] = None,
    depends_on: Optional[List[Job]] = None,
    at_front: bool = False,
    **kwargs
) -> Job:
    """
    Enqueue a job to a specific queue.

    Args:
        queue_name: Target queue
        func: Function to execute
        *args: Positional arguments for the function
        job_id: Custom job ID (optional)
        job_timeout: Override default timeout (optional)
        result_ttl: How long to keep successful results
        failure_ttl: How long to keep failed job info
        meta: Additional metadata to store with job
        depends_on: Jobs this job depends on
        at_front: Push to front of queue (for retries)
        **kwargs: Keyword arguments for the function

    Returns:
        The enqueued Job instance
    """
    queue = get_queue(queue_name)
    config = QUEUE_CONFIG.get(queue_name, {})

    timeout = job_timeout or config.get("default_timeout", 180)

    job = queue.enqueue(
        func,
        *args,
        job_id=job_id,
        job_timeout=timeout,
        result_ttl=result_ttl,
        failure_ttl=failure_ttl,
        meta=meta or {},
        depends_on=depends_on,
        at_front=at_front,
        **kwargs
    )

    return job


def get_job(job_id: str) -> Optional[Job]:
    """Get a job by ID from any queue"""
    conn = get_redis_connection()
    try:
        return Job.fetch(job_id, connection=conn)
    except Exception:
        return None


def get_queue_stats(queue_name: QueueNames) -> dict:
    """Get statistics for a specific queue"""
    queue = get_queue(queue_name)
    config = QUEUE_CONFIG.get(queue_name, {})

    return {
        "name": queue_name.value,
        "description": config.get("description", ""),
        "count": len(queue),
        "started_jobs": queue.started_job_registry.count,
        "finished_jobs": queue.finished_job_registry.count,
        "failed_jobs": queue.failed_job_registry.count,
        "scheduled_jobs": queue.scheduled_job_registry.count,
        "deferred_jobs": queue.deferred_job_registry.count,
    }


def get_all_queue_stats() -> List[dict]:
    """Get statistics for all queues"""
    return [get_queue_stats(qn) for qn in QueueNames]


def clear_queue(queue_name: QueueNames) -> int:
    """Clear all jobs from a queue. Returns number of jobs removed."""
    queue = get_queue(queue_name)
    count = len(queue)
    queue.empty()
    return count
