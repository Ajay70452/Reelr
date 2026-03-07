"""
Health check endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.db.models import User
from app.core.auth import get_current_user
from app.queue.connection import test_redis_connection, get_redis_info
from app.queue.health import (
    get_health_status,
    get_active_workers,
    get_failed_jobs,
    get_queue_depth_alerts,
    get_worker_health_alerts,
)
from app.queue.queues import get_all_queue_stats

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "Reelr API"
    }


@router.get("/health/db")
def health_check_db(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Health check with database connection test"""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@router.get("/health/redis")
def health_check_redis(user: User = Depends(get_current_user)):
    """Health check for Redis connection"""
    if test_redis_connection():
        info = get_redis_info()
        return {
            "status": "healthy",
            "redis": info
        }
    else:
        return {
            "status": "unhealthy",
            "redis": "disconnected"
        }


@router.get("/health/queues")
def health_check_queues(user: User = Depends(get_current_user)):
    """Get comprehensive queue system health status"""
    return get_health_status()


@router.get("/health/queues/stats")
def get_queue_statistics(user: User = Depends(get_current_user)):
    """Get detailed statistics for all queues"""
    return {
        "queues": get_all_queue_stats()
    }


@router.get("/health/workers")
def get_workers(user: User = Depends(get_current_user)):
    """Get list of active workers"""
    workers = get_active_workers()
    return {
        "count": len(workers),
        "workers": workers
    }


@router.get("/health/queues/failed")
def get_failed_jobs_list(limit: int = 50, user: User = Depends(get_current_user)):
    """Get recent failed jobs"""
    return {
        "failed_jobs": get_failed_jobs(limit=limit)
    }


@router.get("/health/alerts")
def get_health_alerts(user: User = Depends(get_current_user)):
    """Get current health alerts"""
    queue_alerts = get_queue_depth_alerts()
    worker_alerts = get_worker_health_alerts()

    all_alerts = queue_alerts + worker_alerts

    return {
        "alert_count": len(all_alerts),
        "alerts": all_alerts
    }
