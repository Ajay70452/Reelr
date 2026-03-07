"""
API router aggregator
"""

from fastapi import APIRouter
from app.api.routes import health, meta, user, video, image, ai_video, script_to_video, media, trending_video, library

api_router = APIRouter()

# Include all route modules
api_router.include_router(health.router)
api_router.include_router(meta.router)
api_router.include_router(user.router)
api_router.include_router(video.router)
api_router.include_router(image.router)
api_router.include_router(ai_video.router)
api_router.include_router(script_to_video.router)
api_router.include_router(media.router)
api_router.include_router(trending_video.router)
api_router.include_router(library.router)
