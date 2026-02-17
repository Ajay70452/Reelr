"""
SQLAlchemy ORM models for ClipKing database tables
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, Text, TIMESTAMP, 
    ForeignKey, DECIMAL, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    auth_provider = Column(String, default='supabase')
    created_at = Column(TIMESTAMP, server_default=func.now())
    plan = Column(String, default='free')

    # Relationships
    credits = relationship("Credit", back_populates="user", uselist=False)
    video_jobs = relationship("VideoJob", back_populates="user")
    videos = relationship("Video", back_populates="user")
    image_jobs = relationship("ImageJob", back_populates="user")
    images = relationship("Image", back_populates="user")
    billing_history = relationship("BillingHistory", back_populates="user")
    ai_video_jobs = relationship("AIVideoJob", back_populates="user")
    ai_videos = relationship("AIVideo", back_populates="user")
    script_video_jobs = relationship("ScriptToVideoJob", back_populates="user")
    script_videos = relationship("ScriptToVideo", back_populates="user")
    trending_video_jobs = relationship("TrendingVideoJob", back_populates="user")


class Credit(Base):
    __tablename__ = "credits"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    credits_left = Column(Integer, default=0)
    last_updated = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="credits")


class Genre(Base):
    __tablename__ = "genres"

    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    description = Column(Text)

    # Relationships
    video_jobs = relationship("VideoJob", back_populates="genre")


class VisualStyle(Base):
    __tablename__ = "visual_styles"

    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)

    # Relationships
    presets = relationship("Preset", back_populates="visual_style")
    video_jobs = relationship("VideoJob", back_populates="visual_style")


class Preset(Base):
    __tablename__ = "presets"

    id = Column(String, primary_key=True)
    visual_style_id = Column(String, ForeignKey("visual_styles.id"))
    display_name = Column(String, nullable=False)
    description = Column(Text)

    # Prompt engineering fields for AI generation
    prompt_prefix = Column(Text)  # Style prompt that goes before user prompt
    prompt_suffix = Column(Text)  # Style prompt that goes after user prompt
    negative_prompt = Column(Text)  # Things to avoid in generation
    thumbnail_url = Column(String)  # Visual preview of the preset

    # Relationships
    visual_style = relationship("VisualStyle", back_populates="presets")
    video_jobs = relationship("VideoJob", back_populates="preset")


class QualityOption(Base):
    __tablename__ = "quality_options"

    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    credits_required = Column(Integer, nullable=False)

    # Relationships
    video_jobs = relationship("VideoJob", back_populates="quality")


class Voice(Base):
    __tablename__ = "voices"

    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)

    # Relationships
    video_jobs = relationship("VideoJob", back_populates="voice")


class Music(Base):
    __tablename__ = "music"

    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    category = Column(String)
    is_premium = Column(Boolean, default=False)

    # Relationships
    video_jobs = relationship("VideoJob", back_populates="music")


class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # User selections
    genre_id = Column(String, ForeignKey("genres.id"))
    visual_style_id = Column(String, ForeignKey("visual_styles.id"))
    preset_id = Column(String, ForeignKey("presets.id"))
    quality_id = Column(String, ForeignKey("quality_options.id"))
    voice_id = Column(String, ForeignKey("voices.id"))
    music_id = Column(String, ForeignKey("music.id"))

    # Generation data
    topic = Column(Text)
    script = Column(Text)
    scenes = Column(JSON)

    # Settings
    duration = Column(Integer)
    aspect_ratio = Column(String)
    advanced = Column(JSON)

    # Status tracking
    status = Column(String, default='queued')
    progress = Column(Integer, default=0)
    error_message = Column(Text)
    fallback_used = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="video_jobs")
    genre = relationship("Genre", back_populates="video_jobs")
    visual_style = relationship("VisualStyle", back_populates="video_jobs")
    preset = relationship("Preset", back_populates="video_jobs")
    quality = relationship("QualityOption", back_populates="video_jobs")
    voice = relationship("Voice", back_populates="video_jobs")
    music = relationship("Music", back_populates="video_jobs")
    videos = relationship("Video", back_populates="job")
    worker_logs = relationship("WorkerLog", back_populates="job")


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("video_jobs.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(Integer)
    resolution = Column(String, default='1080p')
    size_mb = Column(DECIMAL(10, 2))

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="videos")
    job = relationship("VideoJob", back_populates="videos")


class BillingHistory(Base):
    __tablename__ = "billing_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    amount = Column(DECIMAL(10, 2))
    credits_added = Column(Integer)
    plan = Column(String)
    provider = Column(String)
    external_ref = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="billing_history")


class ImageJob(Base):
    """Image generation job tracking"""
    __tablename__ = "image_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Generation parameters
    prompt = Column(Text, nullable=False)
    model = Column(String, nullable=False)  # flux-2-pro, flux-2-max, nano-banana, nano-banana-pro
    image_size = Column(String, default='square_hd')
    seed = Column(Integer)
    safety_tolerance = Column(Integer, default=2)
    output_format = Column(String, default='jpeg')

    # Status tracking
    status = Column(String, default='queued')  # queued, processing, completed, failed
    progress = Column(Integer, default=0)
    error_message = Column(Text)

    # Fal.ai job tracking
    fal_request_id = Column(String)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="image_jobs")
    images = relationship("Image", back_populates="job")


class Image(Base):
    """Generated images"""
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("image_jobs.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Image data
    url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    prompt = Column(Text)
    model = Column(String)
    image_size = Column(String)
    seed = Column(Integer)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="images")
    job = relationship("ImageJob", back_populates="images")


class WorkerLog(Base):
    __tablename__ = "worker_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("video_jobs.id"))
    worker_type = Column(String)
    log = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    job = relationship("VideoJob", back_populates="worker_logs")


class AIVideoJob(Base):
    """AI Video generation job tracking (Sora 2, Veo 3, Kling 2.5, LTX-2)"""
    __tablename__ = "ai_video_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Generation parameters
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text)
    model = Column(String, nullable=False)  # sora2, veo3, kling25, ltx2

    # Model-specific options stored as JSON
    options = Column(JSON, default={})

    # Common settings
    duration = Column(Integer, default=8)
    aspect_ratio = Column(String, default='16:9')
    resolution = Column(String, default='1080p')

    # Status tracking
    status = Column(String, default='queued')  # queued, processing, completed, failed
    progress = Column(Integer, default=0)
    error_message = Column(Text)

    # Fal.ai job tracking
    fal_request_id = Column(String)

    # Result
    video_url = Column(String)
    thumbnail_url = Column(String)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="ai_video_jobs")


class AIVideo(Base):
    """Generated AI videos"""
    __tablename__ = "ai_videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("ai_video_jobs.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Video data
    url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    prompt = Column(Text)
    model = Column(String)
    duration = Column(Integer)
    aspect_ratio = Column(String)
    resolution = Column(String)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="ai_videos")


class ScriptToVideoJob(Base):
    """Script-to-Video generation job tracking (Moving Images V1)"""
    __tablename__ = "script_to_video_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # User input
    script = Column(Text, nullable=False)
    media_type = Column(String, default='moving_images')  # moving_images, ai_video (future), stock_video (future)

    # Settings
    preset_id = Column(String, ForeignKey("presets.id"))
    image_model = Column(String, default='flux-2-pro')
    aspect_ratio = Column(String, default='9:16')  # 9:16, 16:9, 1:1
    duration = Column(Integer, default=30)  # 30, 45, 60 seconds
    consistent_character = Column(Boolean, default=False)

    # Audio (UI only in V1)
    bgm_id = Column(String, ForeignKey("music.id"))
    voice_id = Column(String, ForeignKey("voices.id"))

    # Processed data
    normalized_lines = Column(JSON)  # Array of script lines
    scenes = Column(JSON)  # Array of scene objects with visual_intent
    character_anchor = Column(JSON)  # Character description for consistency

    # Status tracking
    status = Column(String, default='queued')  # queued, normalizing, segmenting, generating_images, applying_motion, stitching, completed, failed
    progress = Column(Integer, default=0)
    current_step = Column(String)
    total_scenes = Column(Integer)
    completed_scenes = Column(Integer, default=0)
    error_message = Column(Text)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="script_video_jobs")
    preset = relationship("Preset")
    bgm = relationship("Music")
    voice = relationship("Voice")
    videos = relationship("ScriptToVideo", back_populates="job")


class ScriptToVideo(Base):
    """Generated Script-to-Video outputs"""
    __tablename__ = "script_to_videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("script_to_video_jobs.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Video data
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(Integer)
    resolution = Column(String)
    aspect_ratio = Column(String)

    # Metadata
    scene_count = Column(Integer)
    script_preview = Column(Text)  # First 200 chars of script

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="script_videos")
    job = relationship("ScriptToVideoJob", back_populates="videos")


class TrendingVideoJob(Base):
    """Trending Video generation job tracking (Kling 3.0 powered)"""
    __tablename__ = "trending_video_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Flow type: "theme" or "custom"
    flow_type = Column(String, nullable=False)

    # Theme mode fields
    theme_id = Column(String)  # e.g. "dance_mania"

    # Custom mode fields
    prompt = Column(Text)
    reference_video_url = Column(String)

    # Shared fields
    reference_image_url = Column(String, nullable=False)
    composed_prompt = Column(Text)  # Final prompt sent to Kling
    intensity = Column(String, default='normal')  # subtle, normal, extreme
    duration = Column(Integer, default=8)
    aspect_ratio = Column(String, default='9:16')

    # Status tracking (queued, building_prompt, generating_video, composing, encoding, completed, failed)
    status = Column(String, default='queued')
    progress = Column(Integer, default=0)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    # Fal.ai tracking
    fal_request_id = Column(String)

    # Result
    video_url = Column(String)
    thumbnail_url = Column(String)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="trending_video_jobs")
