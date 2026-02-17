"""
Configuration settings for ClipKing application
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "ClipKing"
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
