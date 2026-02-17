"""
Media Serving API Endpoints
Serves local media files when S3 is not configured
"""

import logging
import mimetypes
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from app.services.storage import get_local_storage, is_s3_configured

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["Media"])


def get_content_type(file_path: Path) -> str:
    """Determine content type from file extension"""
    ext = file_path.suffix.lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
    }
    return content_types.get(ext, mimetypes.guess_type(str(file_path))[0] or "application/octet-stream")


@router.get("/{file_path:path}")
async def serve_media_file(file_path: str):
    """
    Serve a media file from local storage.
    This endpoint is used when S3 is not configured.

    Args:
        file_path: Path to the file relative to media directory
    """
    storage = get_local_storage()
    full_path = storage.get_file_path(file_path)

    if not full_path.exists():
        logger.warning(f"Media file not found: {full_path}")
        raise HTTPException(status_code=404, detail="File not found")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Not a file")

    # Security: ensure path doesn't escape media directory
    try:
        full_path.resolve().relative_to(storage.media_dir.resolve())
    except ValueError:
        logger.warning(f"Path traversal attempt: {file_path}")
        raise HTTPException(status_code=403, detail="Access denied")

    content_type = get_content_type(full_path)

    # For video files, support range requests for proper seeking
    if content_type.startswith("video/"):
        return FileResponse(
            path=str(full_path),
            media_type=content_type,
            filename=full_path.name,
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            },
        )

    # For images and other files
    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        filename=full_path.name,
    )


@router.head("/{file_path:path}")
async def head_media_file(file_path: str):
    """
    HEAD request for media files (used by video players for range requests).
    """
    storage = get_local_storage()
    full_path = storage.get_file_path(file_path)

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    content_type = get_content_type(full_path)
    file_size = full_path.stat().st_size

    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )
