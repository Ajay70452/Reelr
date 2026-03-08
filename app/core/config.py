"""
Configuration settings for ClipKing application
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Reelr"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str
    
    # Database
    DATABASE_URL: str
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""  # Required for JWT verification
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # AI Services
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""
    FAL_KEY: str = ""

    # Deepgram (TTS & STT)
    DEEPGRAM_API_KEY: str = ""

    # Google Gemini (Script Enhancement)
    GEMINI_API_KEY: str = ""

    # Image Generation Settings
    IMAGE_GEN_MAX_RETRIES: int = 3
    IMAGE_GEN_MIN_SUCCESS_RATE: float = 0.5  # 50% minimum
    IMAGE_GEN_RETRY_DELAY: float = 1.0  # seconds
    ALLOW_IMAGE_EXTENSION: bool = False  # Extend previous image if failed

    # Stock Footage APIs
    PEXELS_API_KEY: str = ""

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""

    # CloudFront CDN
    CLOUDFRONT_DOMAIN: str = ""

    # Local temp directory for processing
    TEMP_DIR: str = "/tmp/clipking"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # Monitoring
    SENTRY_DSN: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def validate_production_settings() -> list[str]:
    """Validate that all required settings are configured for production.
    Returns a list of error messages (empty if all good)."""
    errors = []
    if settings.APP_ENV != "production":
        return errors

    if settings.SECRET_KEY in ("", "your-secret-key-here-change-this"):
        errors.append("SECRET_KEY must be set to a strong random value")
    if not settings.SUPABASE_JWT_SECRET:
        errors.append("SUPABASE_JWT_SECRET is required for JWT verification")
    if not settings.DATABASE_URL or "localhost" in settings.DATABASE_URL:
        errors.append("DATABASE_URL must point to a production database")
    if not settings.AWS_ACCESS_KEY_ID or settings.AWS_ACCESS_KEY_ID == "your_aws_access_key":
        errors.append("AWS credentials must be configured for S3 storage")
    if not settings.S3_BUCKET_NAME:
        errors.append("S3_BUCKET_NAME must be set")
    if not settings.SUPABASE_URL:
        errors.append("SUPABASE_URL must be set")
    if not settings.SUPABASE_KEY:
        errors.append("SUPABASE_KEY must be set")
    return errors
