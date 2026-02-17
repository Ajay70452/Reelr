"""
Services module
Contains service classes for external integrations
"""

from app.services.storage import S3Storage, get_storage

__all__ = ["S3Storage", "get_storage"]
