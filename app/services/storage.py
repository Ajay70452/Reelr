"""
Storage Service
Handles S3 file uploads, downloads, and URL generation
Includes local storage fallback when S3 is not configured
"""

import os
import logging
import shutil
import uuid
from typing import Optional, BinaryIO
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# Local Storage Fallback
# ============================================
class LocalStorage:
    """Local file storage fallback when S3 is not configured"""

    def __init__(self, base_dir: str = None):
        # Use temp directory appropriate for the OS
        if base_dir:
            self.base_dir = Path(base_dir)
        elif settings.TEMP_DIR and settings.TEMP_DIR != "/tmp/clipking":
            self.base_dir = Path(settings.TEMP_DIR)
        else:
            import tempfile
            self.base_dir = Path(tempfile.gettempdir()) / "clipking"

        self.media_dir = self.base_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"LocalStorage initialized at {self.media_dir}")

    # Bucket prefixes (matching S3Storage)
    PREFIX_RAW_ASSETS = "raw-assets"
    PREFIX_AI_RENDERS = "ai-renders"
    PREFIX_FINAL_VIDEOS = "final-videos"
    PREFIX_TEMP = "temp"
    PREFIX_AUDIO = "audio"
    PREFIX_THUMBNAILS = "thumbnails"

    def upload_file(
        self,
        file_path: str,
        s3_key: str,
        content_type: Optional[str] = None,
        extra_args: Optional[dict] = None,
    ) -> str:
        """Copy file to local media directory"""
        dest_path = self.media_dir / s3_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(file_path, dest_path)
        logger.info(f"Copied {file_path} to {dest_path}")

        # Return a URL path that will be served by the API
        return f"/api/v1/media/{s3_key}"

    def upload_bytes(
        self,
        data: bytes,
        s3_key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Write bytes to local media directory"""
        dest_path = self.media_dir / s3_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        dest_path.write_bytes(data)
        logger.info(f"Wrote {len(data)} bytes to {dest_path}")

        return f"/api/v1/media/{s3_key}"

    def get_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
        method: str = "get_object",
    ) -> str:
        """Return local API URL for file"""
        return f"/api/v1/media/{s3_key}"

    def get_file_path(self, s3_key: str) -> Path:
        """Get the local filesystem path for a key"""
        return self.media_dir / s3_key

    def file_exists(self, s3_key: str) -> bool:
        """Check if file exists locally"""
        return (self.media_dir / s3_key).exists()

    def delete_file(self, s3_key: str) -> bool:
        """Delete a local file"""
        try:
            file_path = self.media_dir / s3_key
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete {s3_key}: {e}")
            return False


class S3Storage:
    """S3 storage service for video assets"""

    # Bucket prefixes
    PREFIX_RAW_ASSETS = "raw-assets"
    PREFIX_AI_RENDERS = "ai-renders"
    PREFIX_FINAL_VIDEOS = "final-videos"
    PREFIX_TEMP = "temp"
    PREFIX_AUDIO = "audio"
    PREFIX_THUMBNAILS = "thumbnails"

    def __init__(self):
        self._client = None
        self._bucket_name = settings.S3_BUCKET_NAME

    @property
    def client(self):
        """Lazy-load S3 client"""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"},
                ),
            )
        return self._client

    def upload_file(
        self,
        file_path: str,
        s3_key: str,
        content_type: Optional[str] = None,
        extra_args: Optional[dict] = None,
    ) -> str:
        """
        Upload a local file to S3.

        Args:
            file_path: Local file path
            s3_key: S3 object key (path in bucket)
            content_type: Optional MIME type
            extra_args: Additional S3 upload arguments

        Returns:
            S3 URI (s3://bucket/key)
        """
        args = extra_args or {}
        if content_type:
            args["ContentType"] = content_type

        try:
            self.client.upload_file(
                file_path,
                self._bucket_name,
                s3_key,
                ExtraArgs=args if args else None,
            )
            logger.info(f"Uploaded {file_path} to s3://{self._bucket_name}/{s3_key}")
            return f"s3://{self._bucket_name}/{s3_key}"

        except ClientError as e:
            logger.error(f"Failed to upload {file_path}: {e}")
            raise

    def upload_fileobj(
        self,
        file_obj: BinaryIO,
        s3_key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """
        Upload a file-like object to S3.

        Args:
            file_obj: File-like object
            s3_key: S3 object key
            content_type: Optional MIME type

        Returns:
            S3 URI
        """
        args = {}
        if content_type:
            args["ContentType"] = content_type

        try:
            self.client.upload_fileobj(
                file_obj,
                self._bucket_name,
                s3_key,
                ExtraArgs=args if args else None,
            )
            logger.info(f"Uploaded fileobj to s3://{self._bucket_name}/{s3_key}")
            return f"s3://{self._bucket_name}/{s3_key}"

        except ClientError as e:
            logger.error(f"Failed to upload fileobj to {s3_key}: {e}")
            raise

    def upload_bytes(
        self,
        data: bytes,
        s3_key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """
        Upload bytes directly to S3.

        Args:
            data: Bytes to upload
            s3_key: S3 object key
            content_type: Optional MIME type

        Returns:
            S3 URI
        """
        from io import BytesIO

        return self.upload_fileobj(BytesIO(data), s3_key, content_type)

    def download_file(self, s3_key: str, local_path: str) -> str:
        """
        Download a file from S3 to local path.

        Args:
            s3_key: S3 object key
            local_path: Local destination path

        Returns:
            Local file path
        """
        try:
            # Ensure directory exists
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)

            self.client.download_file(self._bucket_name, s3_key, local_path)
            logger.info(f"Downloaded s3://{self._bucket_name}/{s3_key} to {local_path}")
            return local_path

        except ClientError as e:
            logger.error(f"Failed to download {s3_key}: {e}")
            raise

    def get_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
        method: str = "get_object",
    ) -> str:
        """
        Generate a presigned URL for S3 object.

        Args:
            s3_key: S3 object key
            expires_in: URL expiration in seconds (default 1 hour)
            method: S3 operation (get_object or put_object)

        Returns:
            Presigned URL
        """
        try:
            url = self.client.generate_presigned_url(
                method,
                Params={"Bucket": self._bucket_name, "Key": s3_key},
                ExpiresIn=expires_in,
            )
            return url

        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
            raise

    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3.

        Args:
            s3_key: S3 object key

        Returns:
            True if deleted successfully
        """
        try:
            self.client.delete_object(Bucket=self._bucket_name, Key=s3_key)
            logger.info(f"Deleted s3://{self._bucket_name}/{s3_key}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete {s3_key}: {e}")
            return False

    def delete_prefix(self, prefix: str) -> int:
        """
        Delete all files with a given prefix.

        Args:
            prefix: S3 key prefix

        Returns:
            Number of objects deleted
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self._bucket_name,
                Prefix=prefix,
            )

            if "Contents" not in response:
                return 0

            objects = [{"Key": obj["Key"]} for obj in response["Contents"]]

            if objects:
                self.client.delete_objects(
                    Bucket=self._bucket_name,
                    Delete={"Objects": objects},
                )
                logger.info(f"Deleted {len(objects)} objects with prefix {prefix}")

            return len(objects)

        except ClientError as e:
            logger.error(f"Failed to delete prefix {prefix}: {e}")
            return 0

    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists in S3"""
        try:
            self.client.head_object(Bucket=self._bucket_name, Key=s3_key)
            return True
        except ClientError:
            return False

    # Helper methods for specific asset types

    def upload_ai_render(
        self,
        file_path: str,
        job_id: str,
        scene_id: int,
        file_type: str = "mp4",
    ) -> str:
        """Upload an AI-rendered clip"""
        s3_key = f"{self.PREFIX_AI_RENDERS}/{job_id}/scene_{scene_id}.{file_type}"
        content_type = "video/mp4" if file_type == "mp4" else "image/png"
        return self.upload_file(file_path, s3_key, content_type)

    def upload_final_video(
        self,
        file_path: str,
        job_id: str,
        filename: str = "final.mp4",
    ) -> str:
        """Upload the final rendered video"""
        s3_key = f"{self.PREFIX_FINAL_VIDEOS}/{job_id}/{filename}"
        return self.upload_file(file_path, s3_key, "video/mp4")

    def upload_thumbnail(
        self,
        file_path: str,
        job_id: str,
        filename: str = "thumbnail.jpg",
    ) -> str:
        """Upload a video thumbnail"""
        s3_key = f"{self.PREFIX_THUMBNAILS}/{job_id}/{filename}"
        return self.upload_file(file_path, s3_key, "image/jpeg")

    def upload_audio(
        self,
        file_path: str,
        job_id: str,
        audio_type: str = "voiceover",
    ) -> str:
        """Upload an audio file"""
        ext = Path(file_path).suffix or ".mp3"
        s3_key = f"{self.PREFIX_AUDIO}/{job_id}/{audio_type}{ext}"
        content_type = "audio/mpeg" if ext == ".mp3" else "audio/wav"
        return self.upload_file(file_path, s3_key, content_type)

    def get_job_folder(self, job_id: str, prefix: str = PREFIX_AI_RENDERS) -> str:
        """Get the S3 folder path for a job"""
        return f"{prefix}/{job_id}/"

    def cleanup_job_temp_files(self, job_id: str) -> int:
        """Clean up all temporary files for a job"""
        return self.delete_prefix(f"{self.PREFIX_TEMP}/{job_id}/")


# Singleton instances
_storage_instance: Optional[S3Storage] = None
_local_storage_instance: Optional[LocalStorage] = None


def is_s3_configured() -> bool:
    """Check if S3 is properly configured"""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.S3_BUCKET_NAME
        and settings.AWS_ACCESS_KEY_ID != "your_aws_access_key"
    )


def get_cloudfront_url(s3_key: str) -> str:
    """
    Generate CloudFront CDN URL for an S3 object.

    Args:
        s3_key: S3 object key

    Returns:
        CloudFront URL or S3 presigned URL fallback
    """
    cloudfront_domain = settings.CLOUDFRONT_DOMAIN

    if cloudfront_domain:
        return f"https://{cloudfront_domain}/{s3_key}"
    else:
        storage = get_storage()
        return storage.get_presigned_url(s3_key, expires_in=604800)


def get_storage():
    """
    Get the storage instance.
    Returns S3Storage if configured, otherwise LocalStorage fallback.
    """
    global _storage_instance, _local_storage_instance

    if is_s3_configured():
        if _storage_instance is None:
            _storage_instance = S3Storage()
            logger.info("Using S3 storage")
        return _storage_instance
    else:
        if _local_storage_instance is None:
            _local_storage_instance = LocalStorage()
            logger.info("S3 not configured - using local storage fallback")
        return _local_storage_instance


def get_local_storage() -> LocalStorage:
    """Get the local storage instance (for serving files)"""
    global _local_storage_instance
    if _local_storage_instance is None:
        _local_storage_instance = LocalStorage()
    return _local_storage_instance
