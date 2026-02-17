"""
Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional, List
from datetime import datetime


# ============================================
# Genre Schemas
# ============================================
class GenreSchema(BaseModel):
    id: str
    display_name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================
# Visual Style Schemas
# ============================================
class VisualStyleSchema(BaseModel):
    id: str
    display_name: str
    
    class Config:
        from_attributes = True


# ============================================
# Preset Schemas
# ============================================
class PresetSchema(BaseModel):
    id: str
    visual_style_id: str
    display_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AIPresetSchema(BaseModel):
    """Preset schema for AI Image/Video generation with prompt engineering fields"""
    id: str
    display_name: str
    description: Optional[str] = None
    prompt_prefix: Optional[str] = None
    prompt_suffix: Optional[str] = None
    negative_prompt: Optional[str] = None
    thumbnail_url: Optional[str] = None

    class Config:
        from_attributes = True


class AIPresetsResponse(BaseModel):
    """Response for AI generation presets"""
    presets: List[AIPresetSchema]


# ============================================
# Quality Option Schemas
# ============================================
class QualityOptionSchema(BaseModel):
    id: str
    display_name: str
    credits_required: int
    
    class Config:
        from_attributes = True


# ============================================
# Voice Schemas
# ============================================
class VoiceSchema(BaseModel):
    id: str
    display_name: str
    provider: str
    is_premium: bool
    
    class Config:
        from_attributes = True


# ============================================
# Music Schemas
# ============================================
class MusicSchema(BaseModel):
    id: str
    display_name: str
    category: Optional[str] = None
    is_premium: bool
    
    class Config:
        from_attributes = True


# ============================================
# User Schemas
# ============================================
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None


class UserResponse(UserBase):
    id: UUID4
    plan: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreditsResponse(BaseModel):
    credits: int
    plan: str


# ============================================
# Video Job Schemas
# ============================================
class VideoJobCreate(BaseModel):
    genre_id: Optional[str] = None  # Optional when custom topic is provided
    style_id: str = "cinematic_video"  # Default to cinematic
    preset_id: str = "cinematic_cv"
    quality: str = "standard"
    topic: Optional[str] = None  # Required when genre_id is None
    voice_id: str = "male_confident"
    music_id: str = "none"
    duration: int = 8  # Duration in seconds (8, 10, 12 for new models)
    aspect_ratio: str = "16:9"
    model_id: str = "kling2.6"  # AI model: sora2, veo3, kling2.6
    reference_image_url: Optional[str] = None  # Optional reference image for image-to-video
    advanced: Optional[dict] = None


class VideoJobResponse(BaseModel):
    job_id: UUID4
    status: str
    progress: Optional[int] = 0
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================
# Video Schemas
# ============================================
class VideoResponse(BaseModel):
    id: UUID4
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    resolution: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Image Job Schemas
# ============================================
class ImageJobCreate(BaseModel):
    prompt: str
    model: str = "flux-2-pro"  # flux-2-pro, flux-2-max, nano-banana, nano-banana-pro
    image_size: str = "square_hd"  # square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
    seed: Optional[int] = None
    safety_tolerance: int = 2  # 1-5
    enable_safety_checker: bool = True
    output_format: str = "jpeg"  # jpeg, png

    # Style preset - optional, augments the user prompt
    preset_id: Optional[str] = None

    # Prompt enhancement - if True, uses LLM to expand short prompts
    enhance_prompt: bool = False


class ImageJobResponse(BaseModel):
    job_id: UUID4
    status: str
    progress: Optional[int] = 0
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# Image Schemas
# ============================================
class ImageResponse(BaseModel):
    id: UUID4
    url: str
    thumbnail_url: Optional[str] = None
    prompt: str
    model: str
    image_size: str
    seed: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Metadata Response Schemas
# ============================================
class GenresResponse(BaseModel):
    genres: List[GenreSchema]


class VisualStylesResponse(BaseModel):
    styles: List[VisualStyleSchema]


class PresetsResponse(BaseModel):
    presets: List[PresetSchema]


class QualityOptionsResponse(BaseModel):
    quality: List[QualityOptionSchema]


class VoicesResponse(BaseModel):
    voices: List[VoiceSchema]


class MusicResponse(BaseModel):
    music: List[MusicSchema]


# ============================================
# AI Video Job Schemas (Sora 2, Veo 3, Kling 2.5, LTX-2)
# ============================================
class AIVideoJobCreate(BaseModel):
    """Request to generate an AI video"""
    prompt: str
    model: str = "kling25"  # sora2, veo3, kling25, ltx2

    # Common options
    duration: int = 8
    aspect_ratio: str = "16:9"
    resolution: Optional[str] = "1080p"
    negative_prompt: Optional[str] = None

    # Reference image - available for ALL models
    # Can be base64 data URL or public URL
    reference_image: Optional[str] = None

    # Style preset - optional, augments the user prompt
    preset_id: Optional[str] = None

    # Prompt enhancement - if True, uses LLM to expand short prompts
    enhance_prompt: bool = False

    # Model-specific options (JSON object)
    options: Optional[dict] = None


class AIVideoJobResponse(BaseModel):
    """Response for AI video job status"""
    job_id: UUID4
    status: str
    progress: Optional[int] = 0
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class AIVideoResponse(BaseModel):
    """Response for a generated AI video"""
    id: UUID4
    url: str
    thumbnail_url: Optional[str] = None
    prompt: str
    model: str
    duration: Optional[int] = None
    aspect_ratio: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AIVideoModelConfig(BaseModel):
    """Configuration for a video model (for frontend)"""
    name: str
    resolutions: Optional[List[str]] = None
    aspect_ratios: List[str]
    durations: List[int]
    supports_negative_prompt: bool = False
    supports_audio: bool = False
    supports_seed: bool = False
    max_duration: int
    default_duration: int
    default_aspect_ratio: str
    # Model-specific
    supports_cfg_scale: Optional[bool] = None
    supports_fps: Optional[bool] = None
    supports_video_quality: Optional[bool] = None
    supports_prompt_expansion: Optional[bool] = None
    supports_safety_checker: Optional[bool] = None
    supports_multiscale: Optional[bool] = None
    supports_camera_lora: Optional[bool] = None
    supports_auto_fix_prompt: Optional[bool] = None
    estimated_time: Optional[str] = None


# ============================================
# Script-to-Video Schemas (Moving Images V1)
# ============================================
class ScriptScene(BaseModel):
    """A single scene extracted from script"""
    scene_id: int
    text: str
    visual_intent: str
    duration: Optional[float] = None  # Auto-calculated based on text length


class CharacterAnchor(BaseModel):
    """Character description for consistent character across scenes"""
    gender: Optional[str] = None
    age: Optional[str] = None
    appearance: str


class ScriptToVideoJobCreate(BaseModel):
    """Request to create a script-to-video job"""
    script: str  # Full script or short prompt

    # Media type (V1: only 'moving_images' is enabled)
    media_type: str = "moving_images"  # moving_images, ai_video (locked), stock_video (locked)

    # Style & quality
    preset_id: Optional[str] = None
    image_model: str = "flux-2-pro"  # flux-2-pro, flux-2-max, nano-banana, nano-banana-pro

    # Output settings
    aspect_ratio: str = "9:16"  # 9:16, 16:9, 1:1
    duration: int = 30  # 30, 45, or 60 seconds

    # Consistent character
    consistent_character: bool = False

    # Audio (UI only in V1 - no processing)
    bgm_id: Optional[str] = None
    voice_id: Optional[str] = None

    # Prompt enhancement
    enhance_prompt: bool = False


class SceneBreakdown(BaseModel):
    """A single scene's processed data (what Gemini/fallback produced)"""
    scene_id: int
    narration: str  # What gets sent to voiceover (Deepgram TTS)
    visual_description: str  # What gets sent to image gen (fal.ai Flux)
    duration: float

class ScriptToVideoJobResponse(BaseModel):
    """Response for script-to-video job status"""
    job_id: UUID4
    status: str  # queued, normalizing, segmenting, generating_images, applying_motion, stitching, completed, failed
    progress: int = 0
    current_step: Optional[str] = None
    total_scenes: Optional[int] = None
    completed_scenes: Optional[int] = None
    scenes: Optional[List[SceneBreakdown]] = None  # Processed scene data from Gemini/fallback
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class ScriptToVideoResponse(BaseModel):
    """Response for a completed script-to-video"""
    id: UUID4
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    aspect_ratio: Optional[str] = None
    scene_count: Optional[int] = None
    script_preview: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Trending Video Schemas (Kling 2.6 Motion Control)
# ============================================
class TrendingThemeJobCreate(BaseModel):
    """Request to generate a trending theme video (motion from theme)"""
    theme_id: str
    reference_image: str  # Base64 data URL or public URL
    intensity: str = "normal"  # subtle, normal, extreme
    duration: int = 8
    aspect_ratio: str = "9:16"
    quality: str = "standard"  # standard or pro


class TrendingCustomJobCreate(BaseModel):
    """Request to generate a custom trending video (motion from user video)"""
    prompt: Optional[str] = None  # Optional description (stored, not sent to Kling)
    reference_image: str  # Base64 data URL or public URL
    reference_video: str  # REQUIRED — motion reference video (base64 or URL)
    intensity: str = "normal"  # subtle, normal, extreme
    duration: int = 8
    aspect_ratio: str = "9:16"
    quality: str = "standard"  # standard or pro


class TrendingVideoJobResponse(BaseModel):
    """Response for trending video job status"""
    job_id: UUID4
    status: str
    progress: Optional[int] = 0
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None
    flow_type: Optional[str] = None
    theme_id: Optional[str] = None

    class Config:
        from_attributes = True
