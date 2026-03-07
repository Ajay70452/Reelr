"""
Visual Worker
Generates video/image content using Fal.ai (Flux, AnimateDiff, CogVideoX) or stock fallback
Queue: visual_queue, visual_kling_queue, visual_motion_queue, visual_stock_queue
"""

import os
import time
import subprocess
import requests
import logging
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path

from app.workers.base import (
    worker_task,
    get_logger,
    update_job_progress,
    update_video_job_db,
    RetryableFailure,
    PermanentFailure,
)
from app.queue.queues import QueueNames, enqueue_job
from app.queue.job_manager import PipelineStage, enqueue_next_stage
from app.core.config import settings
from app.services.storage import get_storage
from app.services.model_router import (
    get_model_config,
    get_negative_prompt,
    build_image_prompt,
    get_video_model_for_frontend,
    get_image_to_video_model,
    ModelConfig,
    VIDEO_MODELS,
    IMAGE_TO_VIDEO_MODELS,
)

logger = get_logger("visual")


# ============================================
# Fal.ai Client
# ============================================
class FalClient:
    """Client for Fal.ai API calls"""

    def __init__(self):
        self.api_key = settings.FAL_KEY
        if not self.api_key:
            raise PermanentFailure("FAL_KEY not configured")

    def run_sync(
        self,
        model_id: str,
        arguments: Dict[str, Any],
        timeout: int = 600,
    ) -> Dict[str, Any]:
        """
        Run a Fal.ai model synchronously using the REST API with polling.

        Args:
            model_id: Fal model ID (e.g., "fal-ai/flux-pro/v1.1")
            arguments: Model input arguments
            timeout: Max wait time in seconds

        Returns:
            Model output dict
        """
        headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
        }

        base_url = f"https://queue.fal.run/{model_id}"

        # Submit the job
        submit_response = requests.post(
            base_url,
            headers=headers,
            json=arguments,
            timeout=30,
        )

        if submit_response.status_code not in (200, 201):
            raise RetryableFailure(
                f"Fal API submit error ({submit_response.status_code}): {submit_response.text[:300]}"
            )

        submit_data = submit_response.json()

        # If result is returned directly (fast models)
        if "images" in submit_data or "video" in submit_data or "image" in submit_data:
            return submit_data

        # Otherwise poll for result
        request_id = submit_data.get("request_id")
        if not request_id:
            # Might be a direct response
            return submit_data

        status_url = f"https://queue.fal.run/{model_id}/requests/{request_id}/status"
        result_url = f"https://queue.fal.run/{model_id}/requests/{request_id}"

        start_time = time.time()
        poll_interval = 3

        while time.time() - start_time < timeout:
            status_response = requests.get(status_url, headers=headers, timeout=15)

            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get("status")

                if status == "COMPLETED":
                    # Fetch the result
                    result_response = requests.get(result_url, headers=headers, timeout=30)
                    if result_response.status_code == 200:
                        return result_response.json()
                    raise RetryableFailure(f"Failed to fetch result: {result_response.text[:200]}")

                elif status == "FAILED":
                    error = status_data.get("error", "Unknown error")
                    raise RetryableFailure(f"Fal model failed: {error}")

                elif status in ("IN_QUEUE", "IN_PROGRESS"):
                    time.sleep(poll_interval)
                    # Increase poll interval for longer tasks
                    if time.time() - start_time > 60:
                        poll_interval = 5
                    continue

            time.sleep(poll_interval)

        raise RetryableFailure(f"Fal model timed out after {timeout}s")


# ============================================
# Fal.ai Image Generation (Flux)
# ============================================
def generate_fal_image(
    prompt: str,
    model_id: str,
    negative_prompt: str = "",
    aspect_ratio: str = "9:16",
    image_size: str = "1024x1024",
) -> str:
    """
    Generate an image using Fal.ai (Flux Pro / Schnell / Playground).

    Args:
        prompt: Image generation prompt
        model_id: Fal model ID
        negative_prompt: Negative prompt
        aspect_ratio: Image aspect ratio
        image_size: Fallback image size

    Returns:
        URL of the generated image
    """
    client = FalClient()

    # Map aspect ratio to Fal image_size format
    aspect_sizes = {
        "9:16": {"width": 768, "height": 1344},
        "16:9": {"width": 1344, "height": 768},
        "1:1": {"width": 1024, "height": 1024},
        "4:5": {"width": 896, "height": 1120},
    }

    size = aspect_sizes.get(aspect_ratio, aspect_sizes["9:16"])

    arguments = {
        "prompt": prompt,
        "image_size": {
            "width": size["width"],
            "height": size["height"],
        },
        "num_images": 1,
        "safety_tolerance": "2",
        "enable_safety_checker": True,
    }

    if negative_prompt:
        arguments["negative_prompt"] = negative_prompt

    logger.info(f"Generating Fal image ({model_id}): {prompt[:80]}...")

    result = client.run_sync(model_id, arguments, timeout=120)

    # Extract image URL from result
    images = result.get("images", [])
    if images:
        return images[0].get("url", "")

    # Some models return single image
    image = result.get("image", {})
    if isinstance(image, dict) and image.get("url"):
        return image["url"]

    raise RetryableFailure(f"No image output from {model_id}")


# ============================================
# Fal.ai Motion Generation (AnimateDiff / SVD)
# ============================================
def generate_fal_motion(
    image_url: str,
    model_id: str,
    motion_type: str = "subtle",
    duration: int = 4,
) -> str:
    """
    Animate a static image using Fal.ai motion models.

    Args:
        image_url: URL of source image
        model_id: Fal motion model ID
        motion_type: Motion intensity (subtle, smooth, dynamic)
        duration: Clip duration in seconds

    Returns:
        URL of the generated video clip
    """
    client = FalClient()

    arguments = {
        "image_url": image_url,
        "motion_bucket_id": _motion_type_to_bucket(motion_type),
        "fps": 24,
    }

    logger.info(f"Generating Fal motion ({model_id}), type={motion_type}")

    result = client.run_sync(model_id, arguments, timeout=300)

    # Extract video URL
    video = result.get("video", {})
    if isinstance(video, dict) and video.get("url"):
        return video["url"]

    # Some models return different structure
    if isinstance(video, str):
        return video

    raise RetryableFailure(f"No video output from motion model {model_id}")


def _motion_type_to_bucket(motion_type: str) -> int:
    """Convert motion type to AnimateDiff motion_bucket_id"""
    mapping = {
        "subtle": 40,
        "smooth": 80,
        "dynamic": 127,
    }
    return mapping.get(motion_type, 40)


# ============================================
# Fal.ai Full Video Generation (Kling, Veo2, Minimax, CogVideoX)
# ============================================
def generate_fal_video(
    prompt: str,
    model_id: str,
    duration: int = 8,
    aspect_ratio: str = "16:9",
    num_frames: int = 96,
    fps: int = 24,
    cfg_scale: float = 3.5,
    negative_prompt: str = "",
    image_url: Optional[str] = None,
) -> str:
    """
    Generate a full AI video using Fal.ai (Kling, Veo2, Minimax, CogVideoX).

    Args:
        prompt: Video generation prompt
        model_id: Fal video model ID
        duration: Video duration in seconds (for Kling/Veo2/Minimax)
        aspect_ratio: Aspect ratio (16:9, 9:16, 1:1)
        num_frames: Number of frames (for CogVideoX)
        fps: Frames per second
        cfg_scale: CFG scale
        negative_prompt: Negative prompt
        image_url: Reference image URL for image-to-video models

    Returns:
        URL of the generated video
    """
    client = FalClient()

    # Build arguments based on model type
    if "kling" in model_id.lower():
        # Kling 2.6 API format
        arguments = {
            "prompt": prompt,
            "duration": str(duration),  # "5" or "10" seconds
            "aspect_ratio": aspect_ratio,
        }
        if negative_prompt:
            arguments["negative_prompt"] = negative_prompt
        if image_url:
            arguments["image_url"] = image_url
        timeout = 600

    elif "veo2" in model_id.lower():
        # Veo2 API format
        arguments = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
        }
        if image_url:
            arguments["image_url"] = image_url
        timeout = 600

    elif "minimax" in model_id.lower():
        # Minimax/Hailuo API format
        arguments = {
            "prompt": prompt,
        }
        if image_url:
            arguments["image_url"] = image_url
        timeout = 600

    elif "luma" in model_id.lower():
        # Luma Dream Machine API format
        arguments = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
        }
        if image_url:
            arguments["image_url"] = image_url
        timeout = 300

    else:
        # CogVideoX / legacy format
        arguments = {
            "prompt": prompt,
            "num_frames": num_frames,
            "fps": fps,
            "guidance_scale": cfg_scale,
        }
        timeout = 600

    logger.info(f"Generating Fal video ({model_id}): {prompt[:80]}...")

    result = client.run_sync(model_id, arguments, timeout=timeout)

    # Extract video URL - different models return different structures
    video = result.get("video", {})
    if isinstance(video, dict) and video.get("url"):
        return video["url"]

    if isinstance(video, str):
        return video

    # Some models return the URL directly
    if result.get("url"):
        return result["url"]

    # Kling returns video_url
    if result.get("video_url"):
        return result["video_url"]

    raise RetryableFailure(f"No video output from {model_id}")


# ============================================
# Fal.ai Upscaling (RealESRGAN)
# ============================================
def upscale_image(image_url: str, model_id: str) -> str:
    """
    Upscale an image using Fal.ai.

    Args:
        image_url: URL of source image
        model_id: Upscale model ID

    Returns:
        URL of upscaled image
    """
    client = FalClient()

    arguments = {"image_url": image_url}

    logger.info(f"Upscaling image via {model_id}")

    result = client.run_sync(model_id, arguments, timeout=120)

    image = result.get("image", {})
    if isinstance(image, dict) and image.get("url"):
        return image["url"]

    images = result.get("images", [])
    if images:
        return images[0].get("url", "")

    raise RetryableFailure(f"No upscale output from {model_id}")


# ============================================
# Ken Burns Effect (FFmpeg) — Fixed with pre-scaling
# ============================================
# Ken Burns effect cycle: 3 distinct movement types.
# IMPORTANT: We pre-scale the image to 115% before applying zoompan.
# Without this, zoompan hits the original image boundary and shows BLACK EDGES.
KEN_BURNS_EFFECTS = ["zoom_out", "zoom_in", "pan_right"]


def apply_ken_burns_effect(
    image_path: str,
    output_path: str,
    duration: float = 5.0,
    effect_type: str = "zoom_out",
    fps: int = 30,
    width: int = 1080,
    height: int = 1920,
) -> str:
    """
    Apply Ken Burns (pan/zoom) effect to a static image using FFmpeg.

    Uses a pre-scale step (image scaled to 115%) before applying zoompan,
    which prevents black edge artifacts when the zoom/pan reaches the image boundary.

    Args:
        image_path: Path to input image
        output_path: Path for output video
        duration: Duration in seconds
        effect_type: Type of effect (zoom_out, zoom_in, pan_right)
        fps: Output frame rate
        width: Target output width
        height: Target output height

    Returns:
        Path to output video
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    total_frames = int(duration * fps)
    # Pre-scaled dimensions — 15% extra canvas to avoid black edges during pan/zoom
    scaled_w = int(width * 1.15)
    scaled_h = int(height * 1.15)
    output_res = f"{width}x{height}"

    # Each effect: pre-scale to 115% FIRST, then apply zoompan within that canvas.
    if effect_type == "zoom_out":
        # Starts at 1.15x zoom (already pre-scaled) and slowly eases out to 1.0x
        vf = (
            f"scale={scaled_w}:{scaled_h},"
            f"zoompan=z='1.15-0.15*on/{total_frames}'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={output_res}:fps={fps}"
        )
    elif effect_type == "zoom_in":
        # Starts at 1.0x and zooms slowly into 1.15x
        vf = (
            f"scale={scaled_w}:{scaled_h},"
            f"zoompan=z='1.0+0.15*on/{total_frames}'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={output_res}:fps={fps}"
        )
    elif effect_type == "pan_right":
        # Holds 1.15x zoom steady and pans horizontally right
        vf = (
            f"scale={scaled_w}:{scaled_h},"
            f"zoompan=z=1.15:x='0.15*iw*on/{total_frames}':y='ih*0.075'"
            f":d={total_frames}:s={output_res}:fps={fps}"
        )
    elif effect_type == "pan_left":
        # Holds 1.15x zoom steady and pans horizontally left
        vf = (
            f"scale={scaled_w}:{scaled_h},"
            f"zoompan=z=1.15:x='0.15*iw*(1-on/{total_frames})':y='ih*0.075'"
            f":d={total_frames}:s={output_res}:fps={fps}"
        )
    else:
        # Default fallback: gentle zoom out
        vf = (
            f"scale={scaled_w}:{scaled_h},"
            f"zoompan=z='1.15-0.15*on/{total_frames}'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={total_frames}:s={output_res}:fps={fps}"
        )

    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", image_path,
        "-vf", vf,
        "-t", str(duration),
        "-r", str(fps),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        output_path,
    ]

    logger.info(f"Applying Ken Burns effect ({effect_type}) to {image_path}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg Ken Burns error: {result.stderr[-500:]}")
            raise RetryableFailure(f"FFmpeg Ken Burns failed: {result.stderr[:200]}")

        return output_path

    except subprocess.TimeoutExpired:
        raise RetryableFailure("FFmpeg Ken Burns timed out")
    except FileNotFoundError:
        raise PermanentFailure("FFmpeg not found — please install FFmpeg")


# ============================================
# Pexels Stock Footage - Unchanged
# ============================================
def fetch_pexels_video(
    query: str,
    orientation: str = "portrait",
    min_duration: int = 3,
) -> Optional[Dict[str, Any]]:
    """Fetch a stock video from Pexels API."""
    api_key = settings.PEXELS_API_KEY
    if not api_key:
        logger.warning("PEXELS_API_KEY not configured")
        return None

    headers = {"Authorization": api_key}
    params = {
        "query": query,
        "orientation": orientation,
        "per_page": 10,
    }

    try:
        response = requests.get(
            "https://api.pexels.com/videos/search",
            headers=headers,
            params=params,
            timeout=30,
        )

        if response.status_code != 200:
            logger.error(f"Pexels API error: {response.text}")
            return None

        data = response.json()
        videos = data.get("videos", [])

        for video in videos:
            duration = video.get("duration", 0)
            if duration >= min_duration:
                video_files = video.get("video_files", [])
                for vf in video_files:
                    if vf.get("quality") == "hd" and vf.get("width", 0) >= 720:
                        return {
                            "url": vf["link"],
                            "width": vf["width"],
                            "height": vf["height"],
                            "duration": duration,
                            "pexels_id": video["id"],
                        }

        return None

    except Exception as e:
        logger.error(f"Pexels API error: {e}")
        return None


def download_file(url: str, output_path: str, timeout: int = 120) -> str:
    """Download a file from URL to local path"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(url, stream=True, timeout=timeout)
    response.raise_for_status()

    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    return output_path


# ============================================
# Main Router Worker
# ============================================
@worker_task(
    worker_name="visual_router",
    max_retries=1,
)
def generate_visuals(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Route visual generation to appropriate sub-worker based on visual_style_id.

    Routes to:
        - visual_kling_queue for cinematic_video (CogVideoX via Fal)
        - visual_motion_queue for moving_images (Flux + AnimateDiff via Fal)
        - visual_stock_queue for stock (Pexels fallback)
    """
    job_id = job_data.get("job_id")
    visual_style_id = job_data.get("visual_style_id")

    logger.info(f"[{job_id}] Routing visual generation for style={visual_style_id}")

    update_job_progress(25, PipelineStage.VISUAL_GENERATION.value)

    db_job_id = job_data.get("db_job_id")
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            status="processing",
            progress=25,
        )

    if visual_style_id in ("cinematic_video", "sora_video"):
        enqueue_job(
            queue_name=QueueNames.VISUAL_KLING,
            func=process_cinematic_video,
            job_data=job_data,
            job_id=f"{job_id}_cinematic",
        )
    elif visual_style_id == "moving_images":
        enqueue_job(
            queue_name=QueueNames.VISUAL_MOTION,
            func=process_motion_images,
            job_data=job_data,
            job_id=f"{job_id}_motion",
        )
    else:
        enqueue_job(
            queue_name=QueueNames.VISUAL_STOCK,
            func=process_stock_visuals,
            job_data=job_data,
            job_id=f"{job_id}_stock",
        )

    return {"visual_routed": True, "target_style": visual_style_id}


# ============================================
# Cinematic Video Worker (CogVideoX via Fal)
# ============================================
@worker_task(
    worker_name="cinematic_video_generator",
    max_retries=2,
    fallback_queue=QueueNames.VISUAL_MOTION,
    fallback_func=lambda job_data: process_motion_images(job_data),
)
def process_cinematic_video(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate cinematic video clips using CogVideoX via Fal.ai.
    Falls back to moving_images (AnimateDiff) if CogVideoX fails.
    """
    job_id = job_data.get("job_id")
    parsed_scenes = job_data.get("parsed_scenes", [])
    aspect_ratio = job_data.get("aspect_ratio", "9:16")
    quality = job_data.get("quality_id", "standard")
    preset = job_data.get("preset_id", "")

    logger.info(f"[{job_id}] Generating cinematic videos for {len(parsed_scenes)} scenes via Fal CogVideoX")

    update_job_progress(30, PipelineStage.VISUAL_GENERATION.value)

    # Get model config from router
    config = get_model_config("cinematic_video", preset, quality)

    storage = get_storage()
    temp_dir = Path(settings.TEMP_DIR) / job_id / "visuals"
    temp_dir.mkdir(parents=True, exist_ok=True)

    visual_clips = []

    try:
        for i, scene in enumerate(parsed_scenes):
            scene_id = scene.get("scene_id", i + 1)
            prompt = scene.get("enhanced_prompt") or scene.get("visual_prompt", "")
            prompt = build_image_prompt(prompt, preset)
            duration = scene.get("duration", 5)

            logger.info(f"[{job_id}] Generating CogVideoX clip for scene {scene_id}")

            # Generate video via CogVideoX
            video_url = generate_fal_video(
                prompt=prompt,
                model_id=config.video_model,
                num_frames=config.video_num_frames,
                fps=config.video_fps,
                cfg_scale=config.cfg_scale,
            )

            # Download to temp
            temp_path = str(temp_dir / f"scene_{scene_id}.mp4")
            download_file(video_url, temp_path)

            # Upload to S3
            s3_url = storage.upload_ai_render(temp_path, job_id, scene_id, "mp4")

            clip = {
                "scene_id": scene_id,
                "clip_url": s3_url,
                "clip_local_path": temp_path,
                "duration": duration,
                "type": "cinematic_video",
                "model": config.video_model,
            }
            visual_clips.append(clip)

            progress = 30 + int((i + 1) / len(parsed_scenes) * 20)
            update_job_progress(progress, PipelineStage.VISUAL_GENERATION.value)

            db_job_id = job_data.get("db_job_id")
            if db_job_id:
                update_video_job_db(job_id=str(db_job_id), progress=progress)

        logger.info(f"[{job_id}] Generated {len(visual_clips)} cinematic clips")

        result = {
            "visual_clips": visual_clips,
            "visual_type": "cinematic_video",
        }

        enqueue_next_stage(job_data, PipelineStage.VISUAL_GENERATION, result)
        return result

    except Exception as e:
        logger.error(f"[{job_id}] CogVideoX generation failed: {str(e)}")
        raise RetryableFailure(f"CogVideoX error: {str(e)}")


# ============================================
# Motion Images Worker (Flux + AnimateDiff via Fal)
# ============================================
@worker_task(
    worker_name="motion_image_generator",
    max_retries=2,
    fallback_queue=QueueNames.VISUAL_STOCK,
    fallback_func=lambda job_data: process_stock_visuals(job_data),
)
def process_motion_images(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate moving images: Flux image → AnimateDiff motion OR Ken Burns fallback.
    Falls back to stock footage if all generation fails.
    """
    job_id = job_data.get("job_id")
    parsed_scenes = job_data.get("parsed_scenes", [])
    aspect_ratio = job_data.get("aspect_ratio", "9:16")
    quality = job_data.get("quality_id", "standard")
    preset = job_data.get("preset_id", "")

    logger.info(f"[{job_id}] Generating motion images for {len(parsed_scenes)} scenes via Fal")

    update_job_progress(30, PipelineStage.VISUAL_GENERATION.value)

    config = get_model_config("moving_images", preset, quality)
    neg_prompt = get_negative_prompt(preset)

    storage = get_storage()
    temp_dir = Path(settings.TEMP_DIR) / job_id / "visuals"
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Resolve output dimensions from aspect ratio
    aspect_dims = {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
    }
    kb_width, kb_height = aspect_dims.get(aspect_ratio, (1080, 1920))

    visual_clips = []

    try:
        for i, scene in enumerate(parsed_scenes):
            scene_id = scene.get("scene_id", i + 1)
            prompt = scene.get("enhanced_prompt") or scene.get("visual_prompt", "")
            prompt = build_image_prompt(prompt, preset)
            duration = scene.get("duration", 4)

            logger.info(f"[{job_id}] Generating Fal Flux image for scene {scene_id}")

            # Step 1: Generate image via Flux
            image_url = generate_fal_image(
                prompt=prompt,
                model_id=config.image_model,
                negative_prompt=neg_prompt,
                aspect_ratio=aspect_ratio,
                image_size=config.image_size,
            )

            # Step 1.5: Upscale if ultra premium
            if config.upscale_model:
                try:
                    image_url = upscale_image(image_url, config.upscale_model)
                    logger.info(f"[{job_id}] Upscaled image for scene {scene_id}")
                except Exception as e:
                    logger.warning(f"[{job_id}] Upscale failed, using original: {e}")

            # Step 2: Try AnimateDiff motion, fall back to Ken Burns
            video_path = str(temp_dir / f"scene_{scene_id}.mp4")

            if config.motion_model:
                try:
                    motion_url = generate_fal_motion(
                        image_url=image_url,
                        model_id=config.motion_model,
                        motion_type=config.motion_type,
                        duration=duration,
                    )
                    download_file(motion_url, video_path)
                    clip_type = "fal_motion"
                    logger.info(f"[{job_id}] AnimateDiff motion generated for scene {scene_id}")

                except Exception as e:
                    logger.warning(f"[{job_id}] AnimateDiff failed for scene {scene_id}, using Ken Burns: {e}")
                    # Fallback: download image and apply Ken Burns
                    image_path = str(temp_dir / f"image_{scene_id}.png")
                    download_file(image_url, image_path)

                    effect_type = KEN_BURNS_EFFECTS[i % len(KEN_BURNS_EFFECTS)]
                    apply_ken_burns_effect(
                        image_path=image_path,
                        output_path=video_path,
                        duration=duration,
                        effect_type=effect_type,
                        width=kb_width,
                        height=kb_height,
                    )
                    clip_type = "ken_burns"
            else:
                # No motion model configured, use Ken Burns
                image_path = str(temp_dir / f"image_{scene_id}.png")
                download_file(image_url, image_path)

                effect_type = KEN_BURNS_EFFECTS[i % len(KEN_BURNS_EFFECTS)]
                apply_ken_burns_effect(
                    image_path=image_path,
                    output_path=video_path,
                    duration=duration,
                    effect_type=effect_type,
                    width=kb_width,
                    height=kb_height,
                )
                clip_type = "ken_burns"

            # Upload to S3
            s3_url = storage.upload_ai_render(video_path, job_id, scene_id, "mp4")

            clip = {
                "scene_id": scene_id,
                "clip_url": s3_url,
                "clip_local_path": video_path,
                "duration": duration,
                "type": clip_type,
                "model": config.image_model,
            }
            visual_clips.append(clip)

            progress = 30 + int((i + 1) / len(parsed_scenes) * 20)
            update_job_progress(progress, PipelineStage.VISUAL_GENERATION.value)

            db_job_id = job_data.get("db_job_id")
            if db_job_id:
                update_video_job_db(job_id=str(db_job_id), progress=progress)

        logger.info(f"[{job_id}] Generated {len(visual_clips)} motion clips")

        result = {
            "visual_clips": visual_clips,
            "visual_type": "motion_image",
        }

        enqueue_next_stage(job_data, PipelineStage.VISUAL_GENERATION, result)
        return result

    except Exception as e:
        logger.error(f"[{job_id}] Motion generation failed: {str(e)}")
        raise RetryableFailure(f"Motion generation error: {str(e)}")


# ============================================
# Stock Footage Worker (Pexels) - Unchanged
# ============================================
@worker_task(
    worker_name="stock_visual_generator",
    max_retries=1,
)
def process_stock_visuals(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback: Generate visuals using stock footage from Pexels.
    This is the final fallback if both CogVideoX and motion generation fail.
    """
    job_id = job_data.get("job_id")
    parsed_scenes = job_data.get("parsed_scenes", [])
    aspect_ratio = job_data.get("aspect_ratio", "9:16")

    logger.info(f"[{job_id}] Using stock footage fallback for {len(parsed_scenes)} scenes")

    job_data["fallback_used"] = True

    update_job_progress(30, PipelineStage.VISUAL_GENERATION.value)

    db_job_id = job_data.get("db_job_id")
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            fallback_used=True,
            progress=30,
        )

    storage = get_storage()
    temp_dir = Path(settings.TEMP_DIR) / job_id / "visuals"
    temp_dir.mkdir(parents=True, exist_ok=True)

    orientation = "portrait" if aspect_ratio == "9:16" else "landscape"
    visual_clips = []

    try:
        for i, scene in enumerate(parsed_scenes):
            scene_id = scene.get("scene_id", i + 1)
            narration = scene.get("narration", "")
            prompt = scene.get("visual_prompt", "")
            duration = scene.get("duration", 5)

            search_query = _extract_search_keywords(prompt, narration)
            logger.info(f"[{job_id}] Searching Pexels for scene {scene_id}: {search_query}")

            pexels_video = fetch_pexels_video(
                query=search_query,
                orientation=orientation,
                min_duration=duration,
            )

            if pexels_video:
                video_path = str(temp_dir / f"stock_{scene_id}.mp4")
                download_file(pexels_video["url"], video_path)

                s3_url = storage.upload_ai_render(video_path, job_id, scene_id, "mp4")

                clip = {
                    "scene_id": scene_id,
                    "clip_url": s3_url,
                    "clip_local_path": video_path,
                    "duration": min(duration, pexels_video["duration"]),
                    "type": "stock_footage",
                    "source": "pexels",
                    "pexels_id": pexels_video["pexels_id"],
                }
            else:
                logger.warning(f"[{job_id}] No stock footage found for scene {scene_id}")
                clip = {
                    "scene_id": scene_id,
                    "clip_url": None,
                    "duration": duration,
                    "type": "stock_footage",
                    "missing": True,
                }

            visual_clips.append(clip)

            progress = 30 + int((i + 1) / len(parsed_scenes) * 20)
            update_job_progress(progress, PipelineStage.VISUAL_GENERATION.value)

            if db_job_id:
                update_video_job_db(job_id=str(db_job_id), progress=progress)

        valid_clips = [c for c in visual_clips if c.get("clip_url")]
        if not valid_clips:
            raise PermanentFailure("No stock footage could be found for any scene")

        logger.info(f"[{job_id}] Prepared {len(valid_clips)} stock clips")

        result = {
            "visual_clips": visual_clips,
            "visual_type": "stock_footage",
            "fallback_used": True,
        }

        enqueue_next_stage(job_data, PipelineStage.VISUAL_GENERATION, result)
        return result

    except PermanentFailure:
        raise
    except Exception as e:
        logger.error(f"[{job_id}] Stock footage fallback failed: {str(e)}")
        raise PermanentFailure(f"All visual generation methods failed: {str(e)}")


def _extract_search_keywords(prompt: str, narration: str) -> str:
    """Extract search keywords from prompt and narration for stock footage search"""
    text = f"{prompt} {narration}".lower()

    stopwords = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "with", "for", "to", "of", "in", "on", "at", "by", "from",
        "that", "this", "it", "and", "or", "but", "not", "no",
        "cinematic", "dramatic", "shot", "scene", "lighting", "mood",
        "camera", "angle", "style", "resolution", "8k", "4k", "hd",
    }

    words = text.split()
    keywords = [w for w in words if w not in stopwords and len(w) > 2]

    return " ".join(keywords[:5]) if keywords else "abstract background"
