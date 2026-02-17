"""
Media Upload Service
Downloads media from external URLs (fal.ai, etc.) and uploads to S3.
Generates thumbnails for videos and images.
"""

import os
import logging
import subprocess
import tempfile
import requests
from pathlib import Path
from typing import Optional, Tuple

from app.services.storage import get_storage, get_cloudfront_url
from app.core.config import settings

logger = logging.getLogger(__name__)


def download_file(url: str, output_path: str, timeout: int = 120) -> str:
    """Download a file from URL to local path."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(url, stream=True, timeout=timeout)
    response.raise_for_status()

    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    return output_path


def _get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ],
            capture_output=True, text=True, timeout=15,
        )
        return float(result.stdout.strip()) if result.stdout.strip() else 0
    except Exception:
        return 0


def _generate_video_thumbnail(
    video_path: str,
    output_path: str,
    width: int = 640,
    height: int = 360,
) -> Optional[str]:
    """Extract a thumbnail frame from a video at 50% duration."""
    try:
        duration = _get_video_duration(video_path)
        timestamp = duration / 2 if duration > 0 else 1.0

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(timestamp),
                "-i", video_path,
                "-vframes", "1",
                "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                output_path,
            ],
            capture_output=True, timeout=30,
            check=True,
        )

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
        return None
    except Exception as e:
        logger.warning(f"Thumbnail generation failed: {e}")
        return None


def _generate_image_thumbnail(
    image_path: str,
    output_path: str,
    width: int = 400,
) -> Optional[str]:
    """Resize an image to create a thumbnail using ffmpeg."""
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", image_path,
                "-vf", f"scale={width}:-1",
                output_path,
            ],
            capture_output=True, timeout=15,
            check=True,
        )

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
        return None
    except Exception as e:
        logger.warning(f"Image thumbnail generation failed: {e}")
        return None


def upload_external_image(
    url: str,
    user_id: str,
    job_id: str,
    output_format: str = "png",
) -> Tuple[str, Optional[str]]:
    """
    Download an image from an external URL, upload to S3, and generate a thumbnail.

    Args:
        url: External image URL (e.g. fal.ai)
        user_id: User ID for S3 path
        job_id: Job ID for S3 path
        output_format: Image format (png, jpg, webp)

    Returns:
        Tuple of (image_cdn_url, thumbnail_cdn_url)
    """
    storage = get_storage()
    temp_dir = Path(tempfile.mkdtemp(prefix="clipking_img_"))

    try:
        # Download image
        image_path = str(temp_dir / f"image.{output_format}")
        download_file(url, image_path)
        logger.info(f"Downloaded image for job {job_id} ({os.path.getsize(image_path)} bytes)")

        # Upload image to S3
        s3_key = f"images/{user_id}/{job_id}.{output_format}"
        content_type = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
        }.get(output_format, "image/png")

        storage.upload_file(image_path, s3_key, content_type)
        image_cdn_url = get_cloudfront_url(s3_key)

        # Generate and upload thumbnail
        thumbnail_cdn_url = None
        thumb_path = str(temp_dir / "thumbnail.jpg")
        if _generate_image_thumbnail(image_path, thumb_path):
            thumb_s3_key = f"thumbnails/{user_id}/{job_id}_thumb.jpg"
            storage.upload_file(thumb_path, thumb_s3_key, "image/jpeg")
            thumbnail_cdn_url = get_cloudfront_url(thumb_s3_key)
        else:
            # Use the full image as thumbnail fallback
            thumbnail_cdn_url = image_cdn_url

        logger.info(f"Uploaded image to S3: {s3_key}")
        return image_cdn_url, thumbnail_cdn_url

    finally:
        # Cleanup temp files
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)


def upload_external_video(
    url: str,
    user_id: str,
    job_id: str,
    s3_prefix: str = "ai-videos",
) -> Tuple[str, Optional[str]]:
    """
    Download a video from an external URL, upload to S3, and generate a thumbnail.

    Args:
        url: External video URL (e.g. fal.ai)
        user_id: User ID for S3 path
        job_id: Job ID for S3 path
        s3_prefix: S3 key prefix (ai-videos, trending-videos, etc.)

    Returns:
        Tuple of (video_cdn_url, thumbnail_cdn_url)
    """
    storage = get_storage()
    temp_dir = Path(tempfile.mkdtemp(prefix="clipking_vid_"))

    try:
        # Download video
        video_path = str(temp_dir / "video.mp4")
        download_file(url, video_path)
        logger.info(f"Downloaded video for job {job_id} ({os.path.getsize(video_path)} bytes)")

        # Upload video to S3
        video_s3_key = f"{s3_prefix}/{user_id}/{job_id}.mp4"
        storage.upload_file(video_path, video_s3_key, "video/mp4")
        video_cdn_url = get_cloudfront_url(video_s3_key)

        # Generate and upload thumbnail
        thumbnail_cdn_url = None
        thumb_path = str(temp_dir / "thumbnail.jpg")
        if _generate_video_thumbnail(video_path, thumb_path):
            thumb_s3_key = f"thumbnails/{user_id}/{job_id}_thumb.jpg"
            storage.upload_file(thumb_path, thumb_s3_key, "image/jpeg")
            thumbnail_cdn_url = get_cloudfront_url(thumb_s3_key)

        logger.info(f"Uploaded video to S3: {video_s3_key}")
        return video_cdn_url, thumbnail_cdn_url

    finally:
        # Cleanup temp files
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)


def extract_s3_key_from_url(url: str) -> Optional[str]:
    """
    Extract the S3 key from a CloudFront or presigned S3 URL.

    Args:
        url: CDN or presigned URL

    Returns:
        S3 key or None if not an S3/CDN URL
    """
    if not url:
        return None

    # CloudFront URL: https://domain.cloudfront.net/images/user/job.png
    cloudfront_domain = settings.CLOUDFRONT_DOMAIN
    if cloudfront_domain and cloudfront_domain in url:
        return url.split(cloudfront_domain + "/", 1)[-1]

    # S3 presigned URL: https://bucket.s3.region.amazonaws.com/key?params
    if ".s3." in url and ".amazonaws.com" in url:
        path = url.split(".amazonaws.com/", 1)[-1]
        return path.split("?")[0]

    # Local fallback URL: /api/v1/media/key
    if url.startswith("/api/v1/media/"):
        return url.replace("/api/v1/media/", "")

    return None


def delete_media_from_s3(url: str) -> bool:
    """
    Delete a media file from S3 given its CDN/presigned URL.

    Returns:
        True if deleted, False otherwise
    """
    s3_key = extract_s3_key_from_url(url)
    if not s3_key:
        return False

    storage = get_storage()
    return storage.delete_file(s3_key)
