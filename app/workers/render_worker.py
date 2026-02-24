"""
Render Worker
Combines all assets into final video using FFmpeg
Queue: render_queue
"""

import os
import subprocess
import shutil
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

from app.workers.base import (
    worker_task,
    get_logger,
    update_job_progress,
    update_video_job_db,
    RetryableFailure,
    PermanentFailure,
)
from app.queue.queues import QueueNames
from app.queue.job_manager import PipelineStage, enqueue_next_stage
from app.core.config import settings
from app.services.storage import get_storage

logger = get_logger("render")


# ============================================
# Resolution Configuration
# ============================================
RESOLUTIONS = {
    "9:16": (1080, 1920),   # Vertical (TikTok/Reels/Shorts)
    "1:1": (1080, 1080),    # Square (Instagram)
    "16:9": (1920, 1080),   # Horizontal (YouTube)
    "4:5": (1080, 1350),    # Portrait (Instagram)
}

# Transition types available
TRANSITION_TYPES = {
    "fade": "fade",
    "dissolve": "dissolve",
    "wipeleft": "wipeleft",
    "wiperight": "wiperight",
    "wipeup": "wipeup",
    "wipedown": "wipedown",
    "slideleft": "slideleft",
    "slideright": "slideright",
    "slideup": "slideup",
    "slidedown": "slidedown",
    "circlecrop": "circlecrop",
    "rectcrop": "rectcrop",
    "distance": "distance",
    "fadeblack": "fadeblack",
    "fadewhite": "fadewhite",
    "radial": "radial",
    "smoothleft": "smoothleft",
    "smoothright": "smoothright",
}


# ============================================
# FFmpeg Helper Functions
# ============================================
def check_ffmpeg() -> bool:
    """Check if FFmpeg is available"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except Exception:
        return False


def get_video_info(video_path: str) -> Dict[str, Any]:
    """Get video metadata using FFprobe"""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception as e:
        logger.warning(f"Failed to get video info: {e}")
    return {}


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds"""
    info = get_video_info(video_path)
    try:
        return float(info.get("format", {}).get("duration", 0))
    except (ValueError, TypeError):
        return 0.0


# ============================================
# Video Processing Functions
# ============================================
def scale_video(
    input_path: str,
    output_path: str,
    width: int,
    height: int,
) -> str:
    """
    Scale video to target resolution with padding.

    Uses scale and pad filters to maintain aspect ratio and fill frame.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Scale to fit, then pad to exact dimensions
    filter_str = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
        f"setsar=1"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", filter_str,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        "-t", str(get_video_duration(input_path) or 10),
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        logger.warning(f"Scale failed: {result.stderr[:200]}")
        # Fallback: just copy
        shutil.copy(input_path, output_path)

    return output_path


def concat_videos_simple(
    video_paths: List[str],
    output_path: str,
) -> str:
    """
    Concatenate videos using concat demuxer (no re-encoding).
    All videos must have same codec/resolution.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Create concat file
    concat_file = output_path.replace(".mp4", "_concat.txt")
    with open(concat_file, "w") as f:
        for path in video_paths:
            f.write(f"file '{path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c", "copy",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RetryableFailure(f"Concat failed: {result.stderr[:200]}")

    # Cleanup concat file
    os.remove(concat_file)

    return output_path


def concat_videos_with_transitions(
    video_paths: List[str],
    output_path: str,
    transition_type: str = "fade",
    transition_duration: float = 0.5,
    width: int = 1080,
    height: int = 1920,
) -> str:
    """
    Concatenate videos with xfade transitions between clips.
    Requires re-encoding but provides smooth transitions.
    """
    if len(video_paths) < 2:
        if video_paths:
            shutil.copy(video_paths[0], output_path)
        return output_path

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Get durations for each clip
    durations = []
    for path in video_paths:
        dur = get_video_duration(path)
        if dur <= 0:
            dur = 5.0  # Default
        durations.append(dur)

    # Build complex filter for xfade transitions
    # Each xfade needs: offset = sum of previous durations - (transition_count * transition_duration)
    inputs = []
    filter_parts = []

    for i, path in enumerate(video_paths):
        inputs.extend(["-i", path])

    # Scale all inputs to same resolution
    for i in range(len(video_paths)):
        filter_parts.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30[v{i}]"
        )

    # Chain xfade transitions
    current_output = "v0"
    offset = durations[0] - transition_duration

    for i in range(1, len(video_paths)):
        next_input = f"v{i}"
        new_output = f"vout{i}" if i < len(video_paths) - 1 else "vfinal"

        filter_parts.append(
            f"[{current_output}][{next_input}]xfade=transition={transition_type}:"
            f"duration={transition_duration}:offset={max(0, offset)}[{new_output}]"
        )

        current_output = new_output
        offset += durations[i] - transition_duration

    filter_complex = ";".join(filter_parts)

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{current_output}]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        output_path,
    ]

    logger.info(f"Running xfade concat with {len(video_paths)} clips")

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.error(f"xfade concat failed: {result.stderr[:500]}")
        # Fallback to simple concat
        return concat_videos_simple(video_paths, output_path)

    return output_path


def add_audio_to_video(
    video_path: str,
    audio_path: str,
    output_path: str,
    video_has_audio: bool = False,
) -> str:
    """
    Add audio track to video.
    Replaces existing audio or adds to silent video.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    video_duration = get_video_duration(video_path)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        logger.warning(f"Add audio failed: {result.stderr[:200]}")
        # Fallback: copy video without audio
        shutil.copy(video_path, output_path)

    return output_path


def burn_in_captions(
    video_path: str,
    captions: List[Dict],
    output_path: str,
    style_config: Dict[str, Any],
) -> str:
    """
    Burn captions directly into video using drawtext filter.

    Args:
        video_path: Input video
        captions: List of caption dicts with text, start, end
        output_path: Output video path
        style_config: Caption styling (font, size, color, position)
    """
    if not captions:
        shutil.copy(video_path, output_path)
        return output_path

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Extract style settings (TikTok/Instagram modern)
    font = style_config.get("font", "Arial-Bold")
    font_size = style_config.get("font_size", 70)
    font_color = style_config.get("font_color", "white")
    outline_color = style_config.get("outline_color", "black")
    outline_width = style_config.get("outline_width", 8)
    shadow_color = style_config.get("shadow_color", "black")
    shadow_offset = style_config.get("shadow_offset", 3)
    bg_color = style_config.get("bg_color")
    bg_opacity = style_config.get("bg_opacity", 0)
    position = style_config.get("position", "center")
    margin = style_config.get("margin", 0)
    letter_spacing = style_config.get("letter_spacing", 0)

    # Build position expression
    if position == "bottom":
        y_expr = f"h-th-{margin}"
    elif position == "top":
        y_expr = str(margin)
    else:  # center
        y_expr = "(h-th)/2"

    # Build drawtext filter chain for each caption
    filter_parts = []

    for caption in captions:
        text = caption.get("text", "").replace("'", "\\'").replace(":", "\\:")
        start = caption.get("start", 0)
        end = caption.get("end", start + 2)

        # Build modern TikTok/Instagram style with outline and shadow
        style_parts = [
            f"drawtext=text='{text}'",
            "fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            f"fontsize={font_size}",
            f"fontcolor={font_color}",
            f"borderw={outline_width}",
            f"bordercolor={outline_color}",
            "x=(w-tw)/2",
            f"y={y_expr}",
        ]

        # Add shadow effect
        if shadow_offset > 0:
            style_parts.extend([
                f"shadowcolor={shadow_color}",
                f"shadowx={shadow_offset}",
                f"shadowy={shadow_offset}",
            ])

        # Add background box only if specified
        if bg_color and bg_opacity > 0:
            style_parts.extend([
                "box=1",
                f"boxcolor={bg_color}@{bg_opacity}",
                "boxborderw=10",
            ])

        # Add timing
        style_parts.append(f"enable='between(t,{start},{end})'")

        filter_part = ":".join(style_parts)
        filter_parts.append(filter_part)

    # Combine all drawtext filters
    filter_complex = ",".join(filter_parts)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", filter_complex,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        output_path,
    ]

    logger.info(f"Burning in {len(captions)} captions")

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.warning(f"Caption burn-in failed: {result.stderr[:300]}")
        # Fallback: copy without captions
        shutil.copy(video_path, output_path)

    return output_path


def burn_in_srt_captions(
    video_path: str,
    srt_path: str,
    output_path: str,
    style: str = "default",
) -> str:
    """
    Burn captions from SRT file using subtitles filter.
    More reliable than individual drawtext for many captions.
    """
    if not os.path.exists(srt_path):
        shutil.copy(video_path, output_path)
        return output_path

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Style presets for ASS subtitle format
    styles = {
        "default": "FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2",
        "bold": "FontName=Arial,FontSize=28,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3",
        "minimal": "FontName=Helvetica,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,Outline=1",
    }

    force_style = styles.get(style, styles["default"])

    # Escape path for filter
    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"subtitles={srt_escaped}:force_style='{force_style}'",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.warning(f"SRT burn-in failed: {result.stderr[:300]}")
        # Try alternative ASS filter approach
        return burn_in_captions_ass(video_path, srt_path, output_path)

    return output_path


def burn_in_captions_ass(
    video_path: str,
    srt_path: str,
    output_path: str,
) -> str:
    """
    Alternative caption burn-in using ASS filter.
    Fallback when subtitles filter fails.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Use ass filter which is more compatible
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"ass={srt_path}",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.warning(f"ASS burn-in also failed, copying without captions")
        shutil.copy(video_path, output_path)

    return output_path


def apply_fast_cuts(
    video_path: str,
    output_path: str,
    speed_factor: float = 1.2,
) -> str:
    """
    Apply fast cuts effect by slightly speeding up video.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Calculate audio speed factor (must match video)
    audio_speed = 1 / speed_factor

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-filter_complex",
        f"[0:v]setpts={1/speed_factor}*PTS[v];[0:a]atempo={speed_factor}[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        logger.warning(f"Fast cuts failed: {result.stderr[:200]}")
        shutil.copy(video_path, output_path)

    return output_path


def final_encode(
    video_path: str,
    output_path: str,
    width: int = 1080,
    height: int = 1920,
    bitrate: str = "8M",
    preset: str = "medium",
    crf: int = 23,
) -> str:
    """
    Final encoding pass for optimal quality and compatibility.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black",
        "-c:v", "libx264",
        "-preset", preset,
        "-crf", str(crf),
        "-maxrate", bitrate,
        "-bufsize", "16M",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-movflags", "+faststart",  # Web optimization
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RetryableFailure(f"Final encode failed: {result.stderr[:300]}")

    return output_path


# ============================================
# Main Worker Function
# ============================================
@worker_task(
    worker_name="video_renderer",
    max_retries=1,
)
def render_video(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Combine all assets into the final video using FFmpeg.

    Input job_data keys:
        - visual_clips: List of video/image clips with clip_local_path or clip_url
        - final_audio_local_path: Path to mixed audio (voiceover + music)
        - captions: Caption entries with timing
        - srt_local_path: Path to SRT file
        - caption_style_config: Caption styling config
        - captions_enabled: Whether to burn in captions
        - aspect_ratio: Target aspect ratio
        - advanced: Rendering options (fast_cuts, etc.)

    Output (merged into job_data):
        - rendered_video_path: Local path to rendered video
        - render_duration: Total video duration
        - render_resolution: Output resolution
    """
    job_id = job_data.get("job_id")
    visual_clips = job_data.get("visual_clips", [])
    audio_path = job_data.get("final_audio_local_path") or job_data.get("voiceover_local_path")
    captions = job_data.get("captions", [])
    srt_path = job_data.get("srt_local_path")
    caption_style_config = job_data.get("caption_style_config", {})
    captions_enabled = job_data.get("captions_enabled", True)
    aspect_ratio = job_data.get("aspect_ratio", "9:16")
    advanced = job_data.get("advanced", {})

    logger.info(f"[{job_id}] Starting video render, {len(visual_clips)} clips, aspect={aspect_ratio}")

    # Check FFmpeg
    if not check_ffmpeg():
        raise PermanentFailure("FFmpeg not found - please install FFmpeg")

    update_job_progress(80, PipelineStage.RENDERING.value)

    # Update database
    db_job_id = job_data.get("db_job_id")
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            status="processing",
            progress=80,
        )

    # Get target resolution
    width, height = RESOLUTIONS.get(aspect_ratio, (1080, 1920))

    # Setup temp directory
    temp_dir = Path(settings.TEMP_DIR) / job_id / "render"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Collect and prepare video clips
        logger.info(f"[{job_id}] Preparing {len(visual_clips)} video clips")

        clip_paths = []
        for i, clip in enumerate(visual_clips):
            # Use local path if available, otherwise download from S3
            clip_path = clip.get("clip_local_path")

            if not clip_path or not os.path.exists(clip_path):
                clip_url = clip.get("clip_url")
                if clip_url and clip_url.startswith("s3://"):
                    # Download from S3
                    storage = get_storage()
                    s3_key = clip_url.replace(f"s3://{settings.S3_BUCKET_NAME}/", "")
                    clip_path = str(temp_dir / f"clip_{i}.mp4")
                    storage.download_file(s3_key, clip_path)
                elif clip.get("missing"):
                    logger.warning(f"[{job_id}] Skipping missing clip {i}")
                    continue
                else:
                    logger.warning(f"[{job_id}] No valid path for clip {i}")
                    continue

            if os.path.exists(clip_path):
                clip_paths.append(clip_path)
            else:
                logger.warning(f"[{job_id}] Clip file not found: {clip_path}")

        if not clip_paths:
            raise PermanentFailure("No valid video clips to render")

        update_job_progress(82, PipelineStage.RENDERING.value)

        # Step 2: Scale all clips to target resolution
        logger.info(f"[{job_id}] Scaling clips to {width}x{height}")

        scaled_paths = []
        for i, path in enumerate(clip_paths):
            scaled_path = str(temp_dir / f"scaled_{i}.mp4")
            scale_video(path, scaled_path, width, height)
            scaled_paths.append(scaled_path)

        update_job_progress(84, PipelineStage.RENDERING.value)

        # Step 3: Concatenate with transitions
        logger.info(f"[{job_id}] Concatenating {len(scaled_paths)} clips with transitions")

        transition_type = advanced.get("transition_type", "fade")
        transition_duration = advanced.get("transition_duration", 0.3)

        concat_path = str(temp_dir / "concatenated.mp4")

        if len(scaled_paths) > 1 and transition_duration > 0:
            concat_videos_with_transitions(
                video_paths=scaled_paths,
                output_path=concat_path,
                transition_type=transition_type,
                transition_duration=transition_duration,
                width=width,
                height=height,
            )
        else:
            concat_videos_simple(scaled_paths, concat_path)

        update_job_progress(86, PipelineStage.RENDERING.value)

        # Step 4: Add audio
        if audio_path and os.path.exists(audio_path):
            logger.info(f"[{job_id}] Adding audio track")
            with_audio_path = str(temp_dir / "with_audio.mp4")
            add_audio_to_video(concat_path, audio_path, with_audio_path)
            current_video = with_audio_path
        else:
            logger.warning(f"[{job_id}] No audio file found, continuing without audio")
            current_video = concat_path

        update_job_progress(88, PipelineStage.RENDERING.value)

        # Step 5: Burn in captions (if enabled)
        if captions_enabled and captions:
            logger.info(f"[{job_id}] Burning in {len(captions)} captions")
            with_captions_path = str(temp_dir / "with_captions.mp4")

            # Try SRT-based burn-in first (more reliable)
            if srt_path and os.path.exists(srt_path):
                caption_style = job_data.get("caption_style", "default")
                burn_in_srt_captions(current_video, srt_path, with_captions_path, caption_style)
            else:
                # Fallback to individual drawtext
                burn_in_captions(current_video, captions, with_captions_path, caption_style_config)

            current_video = with_captions_path

        update_job_progress(90, PipelineStage.RENDERING.value)

        # Step 6: Apply effects (fast cuts if enabled)
        if advanced.get("fast_cuts", False):
            logger.info(f"[{job_id}] Applying fast cuts effect")
            with_effects_path = str(temp_dir / "with_effects.mp4")
            apply_fast_cuts(current_video, with_effects_path, speed_factor=1.15)
            current_video = with_effects_path

        # Step 7: Final encoding pass
        logger.info(f"[{job_id}] Final encoding pass")
        final_output_path = str(temp_dir / "final_video.mp4")

        # Quality settings based on user plan
        quality_id = job_data.get("quality_id", "standard")
        quality_settings = {
            "basic": {"bitrate": "4M", "preset": "fast", "crf": 28},
            "standard": {"bitrate": "8M", "preset": "medium", "crf": 23},
            "premium": {"bitrate": "12M", "preset": "slow", "crf": 18},
        }
        settings_for_quality = quality_settings.get(quality_id, quality_settings["standard"])

        final_encode(
            video_path=current_video,
            output_path=final_output_path,
            width=width,
            height=height,
            **settings_for_quality,
        )

        # Get final video duration
        total_duration = get_video_duration(final_output_path)

        update_job_progress(92, PipelineStage.RENDERING.value)

        if db_job_id:
            update_video_job_db(job_id=str(db_job_id), progress=92)

        logger.info(f"[{job_id}] Video rendered successfully, duration={total_duration:.1f}s")

        result = {
            "rendered_video_path": final_output_path,
            "render_duration": total_duration,
            "render_resolution": f"{width}x{height}",
            "render_codec": "H.264",
            "render_bitrate": settings_for_quality["bitrate"],
        }

        # Enqueue next stage (finalize)
        enqueue_next_stage(job_data, PipelineStage.RENDERING, result)

        return result

    except PermanentFailure:
        raise
    except RetryableFailure:
        raise
    except Exception as e:
        logger.error(f"[{job_id}] Video rendering failed: {str(e)}")
        raise RetryableFailure(f"Render error: {str(e)}")
