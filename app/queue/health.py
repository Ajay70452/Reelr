"""
Queue Health Monitoring
Monitor Redis and worker health
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from rq import Worker
from rq.job import Job

from app.queue.connection import get_redis_connection, get_redis_info, test_redis_connection
from app.queue.queues import QueueNames, get_queue, get_all_queue_stats, QUEUE_CONFIG


def get_health_status() -> Dict[str, Any]:
    """
    Get comprehensive health status of the queue system.

    Returns:
        Dictionary with overall health status
    """
    redis_healthy = test_redis_connection()
    redis_info = get_redis_info() if redis_healthy else {"connected": False}

    queue_stats = []
    total_queued = 0
    total_failed = 0

    if redis_healthy:
        queue_stats = get_all_queue_stats()
        for stat in queue_stats:
            total_queued += stat.get("count", 0)
            total_failed += stat.get("failed_jobs", 0)

    workers = get_active_workers() if redis_healthy else []

    return {
        "status": "healthy" if redis_healthy and len(workers) > 0 else "degraded" if redis_healthy else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "redis": redis_info,
        "queues": {
            "total_queued": total_queued,
            "total_failed": total_failed,
            "details": queue_stats,
        },
        "workers": {
            "active_count": len(workers),
            "details": workers,
        },
    }


def get_active_workers() -> List[Dict[str, Any]]:
    """Get list of active workers"""
    try:
        conn = get_redis_connection()
        workers = Worker.all(connection=conn)

        return [
            {
                "name": w.name,
                "state": w.state,
                "queues": [q.name for q in w.queues],
                "current_job": w.get_current_job_id(),
                "successful_jobs": w.successful_job_count,
                "failed_jobs": w.failed_job_count,
                "total_working_time": w.total_working_time,
                "birth_date": w.birth_date.isoformat() if w.birth_date else None,
                "last_heartbeat": w.last_heartbeat.isoformat() if w.last_heartbeat else None,
            }
            for w in workers
        ]
    except Exception:
        return []


def get_failed_jobs(queue_name: Optional[QueueNames] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent failed jobs"""
    try:
        conn = get_redis_connection()
        failed_jobs = []

        if queue_name:
            queues = [get_queue(queue_name)]
        else:
            queues = [get_queue(qn) for qn in QueueNames]

        for queue in queues:
            registry = queue.failed_job_registry
            job_ids = registry.get_job_ids(0, limit)

            for job_id in job_ids:
                try:
                    job = Job.fetch(job_id, connection=conn)
                    failed_jobs.append({
                        "job_id": job_id,
                        "queue": queue.name,
                        "func_name": job.func_name if job.func_name else "unknown",
                        "exc_info": job.exc_info[:500] if job.exc_info else None,
                        "ended_at": job.ended_at.isoformat() if job.ended_at else None,
                        "meta": job.meta,
                    })
                except Exception:
                    continue

        return failed_jobs[:limit]
    except Exception:
        return []


def get_queue_depth_alerts(threshold: int = 100) -> List[Dict[str, Any]]:
    """
    Check for queues with high job counts.

    Args:
        threshold: Alert if queue has more than this many jobs

    Returns:
        List of queue alerts
    """
    alerts = []
    queue_stats = get_all_queue_stats()

    for stat in queue_stats:
        if stat["count"] > threshold:
            alerts.append({
                "queue": stat["name"],
                "count": stat["count"],
                "threshold": threshold,
                "severity": "warning" if stat["count"] < threshold * 2 else "critical",
                "message": f"Queue {stat['name']} has {stat['count']} pending jobs",
            })

    return alerts


def get_worker_health_alerts() -> List[Dict[str, Any]]:
    """Check for worker health issues"""
    alerts = []
    workers = get_active_workers()

    # Check if any workers are running
    if not workers:
        alerts.append({
            "severity": "critical",
            "message": "No active workers found",
        })
        return alerts

    # Check for workers with high failure rates
    for worker in workers:
        total_jobs = worker.get("successful_jobs", 0) + worker.get("failed_jobs", 0)
        if total_jobs > 10:
            failure_rate = worker.get("failed_jobs", 0) / total_jobs
            if failure_rate > 0.1:  # More than 10% failures
                alerts.append({
                    "severity": "warning",
                    "worker": worker["name"],
                    "failure_rate": f"{failure_rate:.1%}",
                    "message": f"Worker {worker['name']} has high failure rate: {failure_rate:.1%}",
                })

    # Check for stale workers (no heartbeat in last 5 minutes)
    now = datetime.now(timezone.utc)
    for worker in workers:
        if worker.get("last_heartbeat"):
            last_heartbeat = datetime.fromisoformat(worker["last_heartbeat"])
            if now - last_heartbeat > timedelta(minutes=5):
                alerts.append({
                    "severity": "warning",
                    "worker": worker["name"],
                    "message": f"Worker {worker['name']} has stale heartbeat",
                })

    return alerts


def cleanup_stale_jobs(max_age_hours: int = 24) -> int:
    """
    Clean up stale jobs that have been stuck for too long.

    Returns:
        Number of jobs cleaned up
    """
    # TODO: Implement stale job cleanup
    # - Find jobs stuck in "started" state for too long
    # - Move to failed registry or requeue

    return 0
