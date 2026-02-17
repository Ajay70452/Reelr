"""
ClipKing Queue Module
Redis Queue infrastructure for async video generation pipeline
"""

from app.queue.connection import (
    get_redis_connection,
    redis_conn,
    test_redis_connection,
    init_redis,
)
from app.queue.queues import (
    QueueNames,
    get_queue,
    get_all_queues,
    enqueue_job,
    get_queue_stats,
    get_all_queue_stats,
    get_job,
)
from app.queue.job_manager import (
    JobStatus,
    PipelineStage,
    create_video_job,
    get_job_status,
    cancel_job,
)
from app.queue.health import (
    get_health_status,
    get_active_workers,
    get_failed_jobs,
)

__all__ = [
    # Connection
    "get_redis_connection",
    "redis_conn",
    "test_redis_connection",
    "init_redis",
    # Queues
    "QueueNames",
    "get_queue",
    "get_all_queues",
    "enqueue_job",
    "get_queue_stats",
    "get_all_queue_stats",
    "get_job",
    # Job Manager
    "JobStatus",
    "PipelineStage",
    "create_video_job",
    "get_job_status",
    "cancel_job",
    # Health
    "get_health_status",
    "get_active_workers",
    "get_failed_jobs",
]
