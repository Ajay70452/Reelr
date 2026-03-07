"""
Library API Endpoints
Unified endpoint to fetch all user-generated videos across all pipelines.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import logging

from app.db import get_db
from app.db.models import (
    User,
    Video,
    ScriptToVideo,
    ScriptToVideoJob,
    AIVideo,
    AIVideoJob,
    TrendingVideoJob,
)
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("/videos")
def get_library_videos(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all completed videos for the current user across all pipelines.
    Returns a unified list sorted by creation date (newest first).
    """
    unified_videos = []

    # 1. Script-to-Video outputs
    try:
        script_videos = (
            db.query(ScriptToVideo)
            .filter(ScriptToVideo.user_id == user.id)
            .order_by(desc(ScriptToVideo.created_at))
            .all()
        )
        for sv in script_videos:
            # Get script preview from job if available
            script_preview = sv.script_preview or ""
            if not script_preview and sv.job:
                script_preview = (sv.job.script or "")[:100]

            unified_videos.append({
                "id": str(sv.id),
                "source": "script_to_video",
                "video_url": sv.video_url,
                "thumbnail_url": sv.thumbnail_url,
                "duration": sv.duration,
                "aspect_ratio": sv.aspect_ratio or "9:16",
                "resolution": sv.resolution or "1080p",
                "title": script_preview[:60] + ("..." if len(script_preview) > 60 else "") if script_preview else "Script Video",
                "created_at": sv.created_at.isoformat() if sv.created_at else None,
            })
    except Exception as e:
        logger.warning(f"Failed to fetch script-to-video: {e}")

    # 2. AI Videos (Sora 2, Veo 3, Kling 2.5, LTX-2)
    try:
        ai_videos = (
            db.query(AIVideo)
            .filter(AIVideo.user_id == user.id)
            .order_by(desc(AIVideo.created_at))
            .all()
        )
        for av in ai_videos:
            unified_videos.append({
                "id": str(av.id),
                "source": "ai_video",
                "video_url": av.url,
                "thumbnail_url": av.thumbnail_url,
                "duration": av.duration,
                "aspect_ratio": av.aspect_ratio or "16:9",
                "resolution": av.resolution or "1080p",
                "title": (av.prompt[:60] + "..." if len(av.prompt or "") > 60 else av.prompt) or "AI Video",
                "created_at": av.created_at.isoformat() if av.created_at else None,
            })
    except Exception as e:
        logger.warning(f"Failed to fetch AI videos: {e}")

    # 3. Trending Videos (completed jobs with video_url)
    try:
        trending_jobs = (
            db.query(TrendingVideoJob)
            .filter(
                TrendingVideoJob.user_id == user.id,
                TrendingVideoJob.status == "completed",
                TrendingVideoJob.video_url.isnot(None),
            )
            .order_by(desc(TrendingVideoJob.created_at))
            .all()
        )
        for tj in trending_jobs:
            theme_name = tj.theme_id.replace("_", " ").title() if tj.theme_id else "Custom"
            title = f"Trending — {theme_name}" if tj.flow_type == "theme" else "Trending — Custom"

            unified_videos.append({
                "id": str(tj.id),
                "source": "trending_video",
                "video_url": tj.video_url,
                "thumbnail_url": tj.thumbnail_url,
                "duration": tj.duration,
                "aspect_ratio": tj.aspect_ratio or "9:16",
                "resolution": "1080p",
                "title": title,
                "created_at": tj.created_at.isoformat() if tj.created_at else None,
            })
    except Exception as e:
        logger.warning(f"Failed to fetch trending videos: {e}")

    # 4. Classic pipeline videos (Video model)
    try:
        classic_videos = (
            db.query(Video)
            .filter(Video.user_id == user.id)
            .order_by(desc(Video.created_at))
            .all()
        )
        for v in classic_videos:
            unified_videos.append({
                "id": str(v.id),
                "source": "classic",
                "video_url": v.video_url,
                "thumbnail_url": v.thumbnail_url,
                "duration": v.duration,
                "aspect_ratio": "16:9",
                "resolution": v.resolution or "1080p",
                "title": "Generated Video",
                "created_at": v.created_at.isoformat() if v.created_at else None,
            })
    except Exception as e:
        logger.warning(f"Failed to fetch classic videos: {e}")

    # Sort all by created_at descending
    unified_videos.sort(
        key=lambda x: x.get("created_at") or "",
        reverse=True,
    )

    total = len(unified_videos)
    paginated = unified_videos[offset : offset + limit]

    return {
        "videos": paginated,
        "total": total,
        "limit": limit,
        "offset": offset,
    }
