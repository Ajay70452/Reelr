"""
Model Router
Central model selection logic for Fal.ai visual generation pipeline.
Determines which Fal model to use based on visual style, preset, and quality.
"""

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for a visual generation pipeline"""
    image_model: str
    motion_model: Optional[str] = None
    video_model: Optional[str] = None
    upscale_model: Optional[str] = None

    # Model-specific defaults
    image_size: str = "1024x1024"
    motion_type: str = "subtle"
    motion_duration: int = 4
    video_fps: int = 24
    video_num_frames: int = 120
    cfg_scale: float = 3.5


# ============================================
# Model Registry
# ============================================

# Image generation models (for AI Image Generator)
IMAGE_MODELS = {
    # Primary models (from docs/image_gen.md)
    "flux-2-pro": "fal-ai/flux-2-pro",
    "flux-2-max": "fal-ai/flux-2-max",
    "nano-banana": "fal-ai/nano-banana",
    "nano-banana-pro": "fal-ai/nano-banana-pro",
    "z-turbo": "fal-ai/z-image/turbo",  # Z-Turbo fast image generation
    # Legacy models (for video pipeline)
    "flux_pro": "fal-ai/flux-pro/v1.1",
    "flux_dev": "fal-ai/flux/dev",
    "flux_schnell": "fal-ai/flux/schnell",
    "flux_realism": "fal-ai/flux-realism",
    "recraft_v3": "fal-ai/recraft-v3",
    "ideogram": "fal-ai/ideogram/v2/turbo",
    "playground": "fal-ai/playground-v25",
}

# Z-Turbo specific configuration
Z_TURBO_CONFIG = {
    "num_inference_steps": 8,
    "enable_safety_checker": True,
    "output_format": "png",
    "acceleration": "regular",
}

# Aspect ratio mapping for Z-Turbo (UI -> API)
Z_TURBO_ASPECT_RATIOS = {
    "9:16": "portrait_16_9",
    "16:9": "landscape_16_9",
    "1:1": "square",
    # Additional mappings
    "portrait_16_9": "portrait_16_9",
    "landscape_16_9": "landscape_16_9",
    "landscape_4_3": "landscape_4_3",
    "portrait_4_3": "portrait_4_3",
    "square": "square",
    "square_hd": "square",
}

# Valid image sizes for Fal.ai
IMAGE_SIZES = [
    "square_hd",
    "square",
    "portrait_4_3",
    "portrait_16_9",
    "landscape_4_3",
    "landscape_16_9",
]

# Motion / animated image models
MOTION_MODELS = {
    "animatediff": "fal-ai/animatediff-sparsectrl-lcm",
    "stable_video": "fal-ai/stable-video-diffusion",
    "luma_img2video": "fal-ai/luma-dream-machine/image-to-video",
}

# Full AI video models (text-to-video) - From docs/vid_gen.md
VIDEO_MODELS = {
    # Primary models (AI Video Generator)
    "sora2": "fal-ai/sora-2/text-to-video/pro",
    "veo3": "fal-ai/veo3",
    "kling25": "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    "ltx2": "fal-ai/ltx-2-19b/distilled/text-to-video",
    # Legacy models (for backward compatibility)
    "kling_pro": "fal-ai/kling-video/v1.6/pro/text-to-video",
    "kling_standard": "fal-ai/kling-video/v1.6/standard/text-to-video",
    "veo2": "fal-ai/veo2",
    "minimax": "fal-ai/minimax-video/video-01",
    "luma": "fal-ai/luma-dream-machine",
}

# Video model configurations (constraints per model)
VIDEO_MODEL_CONFIGS = {
    "sora2": {
        "name": "Sora 2",
        "resolutions": ["720p", "1080p"],
        "aspect_ratios": ["9:16", "16:9"],
        "durations": [4, 8, 12],
        "supports_negative_prompt": False,
        "supports_audio": False,  # Auto-enabled
        "supports_seed": False,
        "max_duration": 12,
        "default_duration": 8,
        "default_resolution": "1080p",
        "default_aspect_ratio": "16:9",
        "estimated_time": "30-90s",
    },
    "veo3": {
        "name": "Veo 3",
        "resolutions": ["720p", "1080p"],
        "aspect_ratios": ["16:9", "9:16"],
        "durations": [4, 6, 8],
        "supports_negative_prompt": True,
        "supports_audio": True,
        "supports_seed": True,
        "supports_auto_fix_prompt": True,
        "max_duration": 8,
        "default_duration": 6,
        "default_resolution": "1080p",
        "default_aspect_ratio": "16:9",
        "estimated_time": "45-120s",
    },
    "kling25": {
        "name": "Kling 2.5",
        "aspect_ratios": ["16:9", "9:16", "1:1"],
        "durations": [5, 10],
        "supports_negative_prompt": True,
        "supports_audio": False,
        "supports_seed": False,
        "supports_cfg_scale": True,
        "cfg_scale_default": 0.5,
        "max_duration": 10,
        "default_duration": 5,
        "default_aspect_ratio": "16:9",
        "estimated_time": "20-60s",
    },
    "ltx2": {
        "name": "LTX-2",
        "aspect_ratios": ["landscape_4_3", "landscape_16_9", "portrait_16_9"],
        "durations": [4, 8, 12, 16, 20],
        "supports_negative_prompt": True,
        "supports_audio": True,
        "supports_seed": True,
        "supports_fps": True,
        "fps_default": 25,
        "supports_video_quality": True,
        "video_quality_options": ["high", "balanced"],
        "supports_prompt_expansion": True,
        "supports_safety_checker": True,
        "supports_multiscale": True,
        "supports_camera_lora": True,
        "max_duration": 20,
        "default_duration": 8,
        "default_aspect_ratio": "landscape_16_9",
        "estimated_time": "60-180s",
    },
}

# Image-to-video models
IMAGE_TO_VIDEO_MODELS = {
    "kling_i2v_pro": "fal-ai/kling-video/v1.6/pro/image-to-video",
    "kling_i2v_standard": "fal-ai/kling-video/v1.6/standard/image-to-video",
    "veo2_i2v": "fal-ai/veo2/image-to-video",
    "minimax_i2v": "fal-ai/minimax-video/video-01-live/image-to-video",
    "luma_i2v": "fal-ai/luma-dream-machine/image-to-video",
}

# Upscaling models
UPSCALE_MODELS = {
    "realesrgan": "fal-ai/realesrgan",
    "clarity_upscaler": "fal-ai/clarity-upscaler",
}

# Model display names for frontend
MODEL_DISPLAY_NAMES = {
    "sora2": "kling_pro",      # Map frontend "Sora 2" to Kling Pro (best quality)
    "veo3": "veo2",            # Map frontend "Veo 3" to Veo 2
    "kling2.6": "kling_standard",  # Map frontend "Kling 2.6" to Kling Standard
}


# ============================================
# Preset-to-Style Mapping
# ============================================

# Negative prompts by preset style
NEGATIVE_PROMPTS = {
    "default": "blurry, low quality, watermark, text, logo, distorted, deformed",
    "cinematic": "blurry, low quality, watermark, text, logo, cartoon, anime, flat lighting",
    "anime": "blurry, low quality, watermark, text, logo, photorealistic, 3d render",
    "aesthetic": "blurry, low quality, watermark, text, logo, ugly, dark, gritty",
    "neon": "blurry, low quality, watermark, text, logo, natural lighting, daylight",
    "minimal": "blurry, low quality, watermark, text, logo, cluttered, busy, complex",
    "dark": "blurry, low quality, watermark, text, logo, bright, colorful, cheerful",
    "vaporwave": "blurry, low quality, watermark, text, logo, modern, realistic",
    "nature": "blurry, low quality, watermark, text, logo, urban, artificial, indoor",
}

# Style prompt suffixes applied to image generation
STYLE_SUFFIXES = {
    "cinematic_mi": "cinematic lighting, dramatic composition, film grain, anamorphic",
    "aesthetic_mi": "dreamy aesthetic, soft pastel colors, ethereal glow, beautiful",
    "anime_mi": "anime style, vibrant colors, cel shading, japanese animation",
    "neon_mi": "neon glow, cyberpunk, dark background, vibrant neon colors, futuristic",
    "minimal_mi": "clean minimal design, simple composition, modern, whitespace",
    "dark_mi": "dark moody atmosphere, dramatic shadows, desaturated, noir",
    "vaporwave_mi": "vaporwave aesthetic, retro 80s, pink purple blue gradient, glitch",
    "nature_mi": "natural landscape, golden hour, photorealistic nature, outdoor",
    "cinematic_cv": "cinematic shot, Hollywood quality, shallow depth of field, 4K",
    "pov_cv": "first person perspective, immersive POV, dynamic movement",
    "hyperreal_cv": "hyperrealistic, ultra detailed, photorealistic, 8K resolution",
    "dreamy_cv": "surreal dreamlike, soft focus, ethereal atmosphere, fantasy",
    "action_cv": "dynamic action, fast motion, dramatic angle, high energy",
    "nature_cv": "nature documentary, BBC Earth quality, macro detail, wildlife",
}


def get_model_config(
    visual_style: str,
    preset: str = "",
    quality: str = "standard",
) -> ModelConfig:
    """
    Determine which Fal.ai models to use based on user selections.

    Args:
        visual_style: "moving_images", "cinematic_video", or "stock_default"
        preset: Preset ID (e.g., "cinematic_mi", "anime_mi")
        quality: "standard", "premium", or "ultra_premium"

    Returns:
        ModelConfig with selected models and parameters
    """
    if visual_style == "moving_images":
        return _get_moving_images_config(quality)

    elif visual_style == "cinematic_video":
        return _get_cinematic_video_config(quality)

    elif visual_style == "stock_default":
        # Stock footage doesn't use AI generation
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_schnell"],
            image_size="1024x576",
        )

    else:
        logger.warning(f"Unknown visual_style '{visual_style}', falling back to moving_images")
        return _get_moving_images_config(quality)


def _get_moving_images_config(quality: str) -> ModelConfig:
    """Config for Moving Images style: generate image then animate it"""
    if quality == "ultra_premium":
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_pro"],
            motion_model=MOTION_MODELS["stable_video"],
            upscale_model=UPSCALE_MODELS["realesrgan"],
            image_size="1024x1024",
            motion_type="smooth",
            motion_duration=5,
        )
    elif quality == "standard":
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_schnell"],
            motion_model=MOTION_MODELS["animatediff"],
            image_size="768x768",
            motion_type="subtle",
            motion_duration=3,
        )
    else:  # premium
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_pro"],
            motion_model=MOTION_MODELS["animatediff"],
            image_size="1024x1024",
            motion_type="subtle",
            motion_duration=4,
        )


def _get_cinematic_video_config(quality: str, model_id: str = "kling_standard") -> ModelConfig:
    """Config for Cinematic Video style: full AI video generation"""
    # Map frontend model names to backend model keys
    model_key = MODEL_DISPLAY_NAMES.get(model_id, model_id)
    video_model = VIDEO_MODELS.get(model_key, VIDEO_MODELS["kling_standard"])

    if quality == "ultra_premium":
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_pro"],
            video_model=video_model,
            upscale_model=UPSCALE_MODELS["clarity_upscaler"],
            image_size="1024x1024",
            video_fps=24,
            video_num_frames=120,
            cfg_scale=3.5,
        )
    elif quality == "standard":
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_schnell"],
            video_model=video_model,
            image_size="768x768",
            video_fps=24,
            video_num_frames=72,
            cfg_scale=4.0,
        )
    else:  # premium
        return ModelConfig(
            image_model=IMAGE_MODELS["flux_pro"],
            video_model=video_model,
            image_size="1024x1024",
            video_fps=24,
            video_num_frames=96,
            cfg_scale=3.5,
        )


def get_video_model_for_frontend(frontend_model: str) -> str:
    """
    Map frontend model selection to actual fal.ai model ID.

    Args:
        frontend_model: Model ID from frontend (e.g., "sora2", "veo3", "kling2.6")

    Returns:
        Actual fal.ai model endpoint
    """
    model_key = MODEL_DISPLAY_NAMES.get(frontend_model, "kling_standard")
    return VIDEO_MODELS.get(model_key, VIDEO_MODELS["kling_standard"])


def get_image_to_video_model(frontend_model: str) -> str:
    """
    Get the image-to-video model for a given frontend model selection.
    Used when user provides a reference image.
    """
    mapping = {
        "sora2": IMAGE_TO_VIDEO_MODELS["kling_i2v_pro"],
        "veo3": IMAGE_TO_VIDEO_MODELS["veo2_i2v"],
        "kling2.6": IMAGE_TO_VIDEO_MODELS["kling_i2v_standard"],
    }
    return mapping.get(frontend_model, IMAGE_TO_VIDEO_MODELS["kling_i2v_standard"])


def get_style_suffix(preset: str) -> str:
    """Get the style prompt suffix for a preset"""
    return STYLE_SUFFIXES.get(preset, "")


def get_negative_prompt(preset: str) -> str:
    """Get the negative prompt for a preset style"""
    # Extract base style from preset (e.g., "cinematic_mi" -> "cinematic")
    base_style = preset.rsplit("_", 1)[0] if "_" in preset else preset
    return NEGATIVE_PROMPTS.get(base_style, NEGATIVE_PROMPTS["default"])


def build_image_prompt(scene_prompt: str, preset: str) -> str:
    """Build a complete image prompt with style suffix"""
    suffix = get_style_suffix(preset)
    if suffix:
        return f"{scene_prompt}, {suffix}"
    return scene_prompt


# ============================================
# Image Generation Helpers
# ============================================

def get_image_model(model_id: str) -> str:
    """
    Get the Fal.ai model endpoint for image generation.

    Args:
        model_id: Frontend model ID (e.g., "flux-2-pro", "nano-banana")

    Returns:
        Actual fal.ai model endpoint
    """
    return IMAGE_MODELS.get(model_id, IMAGE_MODELS["flux-2-pro"])


def validate_image_size(size: str) -> str:
    """Validate and return a valid image size"""
    if size in IMAGE_SIZES:
        return size
    return "square_hd"  # Default


def is_z_turbo_model(model_id: str) -> bool:
    """Check if the model is Z-Turbo"""
    return model_id == "z-turbo" or model_id == "fal-ai/z-image/turbo"


def get_z_turbo_image_size(aspect_ratio: str) -> str:
    """
    Convert UI aspect ratio to Z-Turbo image_size parameter.

    Args:
        aspect_ratio: UI aspect ratio (e.g., "9:16", "16:9", "1:1")

    Returns:
        Z-Turbo compatible image_size value
    """
    return Z_TURBO_ASPECT_RATIOS.get(aspect_ratio, "square")


def build_z_turbo_payload(
    prompt: str,
    aspect_ratio: str = "1:1",
    num_images: int = 1,
) -> dict:
    """
    Build the Fal.ai request payload for Z-Turbo model.

    Args:
        prompt: User prompt (should be enhanced)
        aspect_ratio: UI aspect ratio
        num_images: Number of images to generate

    Returns:
        Z-Turbo API payload
    """
    return {
        "prompt": prompt,
        "image_size": get_z_turbo_image_size(aspect_ratio),
        "num_inference_steps": Z_TURBO_CONFIG["num_inference_steps"],
        "num_images": num_images,
        "enable_safety_checker": Z_TURBO_CONFIG["enable_safety_checker"],
        "output_format": Z_TURBO_CONFIG["output_format"],
        "acceleration": Z_TURBO_CONFIG["acceleration"],
    }


# ============================================
# Video Generation Helpers
# ============================================

def get_video_model(model_id: str) -> str:
    """
    Get the Fal.ai model endpoint for video generation.

    Args:
        model_id: Frontend model ID (e.g., "sora2", "veo3", "kling25", "ltx2")

    Returns:
        Actual fal.ai model endpoint
    """
    return VIDEO_MODELS.get(model_id, VIDEO_MODELS["kling25"])


def get_video_model_config(model_id: str) -> dict:
    """
    Get the configuration/constraints for a video model.

    Args:
        model_id: Frontend model ID

    Returns:
        Model configuration dict
    """
    return VIDEO_MODEL_CONFIGS.get(model_id, VIDEO_MODEL_CONFIGS["kling25"])


def validate_video_options(model_id: str, options: dict) -> dict:
    """
    Validate and sanitize video generation options for a model.

    Args:
        model_id: Frontend model ID
        options: User-provided options

    Returns:
        Validated options dict
    """
    config = get_video_model_config(model_id)
    validated = {}

    # Duration
    duration = options.get("duration", config.get("default_duration", 8))
    if duration not in config.get("durations", [8]):
        duration = config.get("default_duration", 8)
    validated["duration"] = duration

    # Aspect ratio
    aspect_ratio = options.get("aspect_ratio", config.get("default_aspect_ratio", "16:9"))
    if aspect_ratio not in config.get("aspect_ratios", ["16:9"]):
        aspect_ratio = config.get("default_aspect_ratio", "16:9")
    validated["aspect_ratio"] = aspect_ratio

    # Resolution (if supported)
    if "resolutions" in config:
        resolution = options.get("resolution", config.get("default_resolution", "1080p"))
        if resolution not in config["resolutions"]:
            resolution = config.get("default_resolution", "1080p")
        validated["resolution"] = resolution

    # Negative prompt (if supported)
    if config.get("supports_negative_prompt"):
        validated["negative_prompt"] = options.get("negative_prompt", "")

    # Audio (if supported)
    if config.get("supports_audio"):
        validated["generate_audio"] = options.get("generate_audio", False)

    # Seed (if supported)
    if config.get("supports_seed"):
        seed = options.get("seed")
        if seed is not None:
            validated["seed"] = seed

    # CFG Scale (Kling)
    if config.get("supports_cfg_scale"):
        validated["cfg_scale"] = options.get("cfg_scale", config.get("cfg_scale_default", 0.5))

    # LTX-2 specific options
    if model_id == "ltx2":
        if config.get("supports_fps"):
            validated["fps"] = options.get("fps", config.get("fps_default", 25))
        if config.get("supports_video_quality"):
            quality = options.get("video_quality", "high")
            if quality in config.get("video_quality_options", ["high"]):
                validated["video_quality"] = quality
            else:
                validated["video_quality"] = "high"
        if config.get("supports_prompt_expansion"):
            validated["enable_prompt_expansion"] = options.get("enable_prompt_expansion", True)
        if config.get("supports_safety_checker"):
            validated["enable_safety_checker"] = options.get("enable_safety_checker", True)
        if config.get("supports_multiscale"):
            validated["multiscale"] = options.get("multiscale", False)
        if config.get("supports_camera_lora"):
            validated["camera_lora"] = options.get("camera_lora")
            validated["camera_lora_scale"] = options.get("camera_lora_scale", 1.0)

    # Veo 3 specific
    if model_id == "veo3":
        if config.get("supports_auto_fix_prompt"):
            validated["auto_fix_prompt"] = options.get("auto_fix_prompt", True)

    return validated


def build_video_payload(model_id: str, prompt: str, options: dict, image_url: str = None) -> dict:
    """
    Build the Fal.ai request payload for a specific video model.

    Args:
        model_id: Frontend model ID
        prompt: User prompt
        options: Validated options
        image_url: Optional reference image URL (available for ALL models)

    Returns:
        Fal.ai API payload
    """
    if model_id == "sora2":
        return _build_sora_payload(prompt, options, image_url)
    elif model_id == "veo3":
        return _build_veo_payload(prompt, options, image_url)
    elif model_id == "kling25":
        return _build_kling_payload(prompt, options, image_url)
    elif model_id == "ltx2":
        return _build_ltx_payload(prompt, options, image_url)
    else:
        # Default to Kling
        return _build_kling_payload(prompt, options, image_url)


def _build_sora_payload(prompt: str, options: dict, image_url: str = None) -> dict:
    """Build Sora 2 specific payload - image_url supported for all models"""
    payload = {
        "prompt": prompt,
        "resolution": options.get("resolution", "1080p"),
        "aspect_ratio": options.get("aspect_ratio", "16:9"),
        "duration": options.get("duration", 8),
        "delete_video": True,  # As per docs
    }

    # Reference image - available for all models
    if image_url:
        payload["image_url"] = image_url

    return payload


def _build_veo_payload(prompt: str, options: dict, image_url: str = None) -> dict:
    """Build Veo 3 specific payload - image_url supported for all models"""
    payload = {
        "prompt": prompt,
        "aspect_ratio": options.get("aspect_ratio", "16:9"),
        "duration": options.get("duration", 6),
        "resolution": options.get("resolution", "1080p"),
        "generate_audio": options.get("generate_audio", False),
        "auto_fix_prompt": options.get("auto_fix_prompt", True),
    }

    if options.get("negative_prompt"):
        payload["negative_prompt"] = options["negative_prompt"]

    if options.get("seed") is not None:
        payload["seed"] = options["seed"]

    # Reference image - available for all models
    if image_url:
        payload["image_url"] = image_url

    return payload


def _build_kling_payload(prompt: str, options: dict, image_url: str = None) -> dict:
    """Build Kling 2.5 specific payload - image_url supported for all models"""
    payload = {
        "prompt": prompt,
        "duration": options.get("duration", 5),
        "aspect_ratio": options.get("aspect_ratio", "16:9"),
        "cfg_scale": options.get("cfg_scale", 0.5),
    }

    if options.get("negative_prompt"):
        payload["negative_prompt"] = options["negative_prompt"]

    # Reference image - available for all models
    if image_url:
        payload["image_url"] = image_url

    return payload


def _build_ltx_payload(prompt: str, options: dict, image_url: str = None) -> dict:
    """Build LTX-2 specific payload - image_url supported for all models"""
    duration = options.get("duration", 8)
    fps = options.get("fps", 25)

    payload = {
        "prompt": prompt,
        "num_frames": duration * fps,  # Convert duration to frames
        "video_size": options.get("aspect_ratio", "landscape_16_9"),
        "fps": fps,
        "generate_audio": options.get("generate_audio", False),
        "video_quality": options.get("video_quality", "high"),
        "enable_prompt_expansion": options.get("enable_prompt_expansion", True),
        "enable_safety_checker": options.get("enable_safety_checker", True),
    }

    if options.get("negative_prompt"):
        payload["negative_prompt"] = options["negative_prompt"]

    if options.get("seed") is not None:
        payload["seed"] = options["seed"]

    if options.get("multiscale"):
        payload["multiscale"] = True

    if options.get("camera_lora"):
        payload["camera_lora"] = options["camera_lora"]
        payload["camera_lora_scale"] = options.get("camera_lora_scale", 1.0)

    # Reference image - available for all models
    if image_url:
        payload["image_url"] = image_url

    return payload
