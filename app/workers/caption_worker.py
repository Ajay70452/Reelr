"""
Caption Worker
Generates timed captions/subtitles for the video
Queue: caption_queue
"""

import os
import json
import subprocess
import tempfile
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
from app.queue.queues import QueueNames
from app.queue.job_manager import PipelineStage, enqueue_next_stage
from app.core.config import settings
from app.services.storage import get_storage

logger = get_logger("caption")


# ============================================
# Caption Styles
# ============================================
CAPTION_STYLES = {
    "default": {
        "font": "Arial",
        "font_size": 48,
        "font_color": "#FFFFFF",
        "bg_color": "#000000",
        "bg_opacity": 0.7,
        "position": "bottom",  # bottom, center, top
        "margin": 50,
    },
    "bold": {
        "font": "Arial-Bold",
        "font_size": 56,
        "font_color": "#FFFFFF",
        "bg_color": "#000000",
        "bg_opacity": 0.8,
        "position": "center",
        "margin": 0,
    },
    "minimal": {
        "font": "Helvetica",
        "font_size": 42,
        "font_color": "#FFFFFF",
        "bg_color": None,
        "bg_opacity": 0,
        "position": "bottom",
        "margin": 80,
    },
    "highlight": {
        "font": "Arial-Bold",
        "font_size": 52,
        "font_color": "#000000",
        "bg_color": "#FFFF00",
        "bg_opacity": 1.0,
        "position": "center",
        "margin": 0,
    },
}


# ============================================
# Whisper Transcription
# ============================================
def transcribe_with_whisper(
    audio_path: str,
    language: str = "en",
) -> List[Dict]:
    """
    Transcribe audio using OpenAI Whisper API with word-level timestamps.

    Args:
        audio_path: Path to audio file
        language: Language code

    Returns:
        List of word timing dictionaries
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured, using fallback caption timing")
        return []

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        logger.info(f"Transcribing audio with Whisper: {audio_path}")

        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["word"],
            )

        # Extract word-level timing
        word_timings = []
        if hasattr(response, "words") and response.words:
            for word_data in response.words:
                word_timings.append({
                    "word": word_data.word,
                    "start": word_data.start,
                    "end": word_data.end,
                })
        elif hasattr(response, "segments") and response.segments:
            # Fallback to segment-level timing
            for segment in response.segments:
                # Estimate word timing within segment
                words = segment.text.split()
                segment_duration = segment.end - segment.start
                word_duration = segment_duration / max(len(words), 1)
                current_time = segment.start

                for word in words:
                    word_timings.append({
                        "word": word.strip(),
                        "start": current_time,
                        "end": current_time + word_duration,
                    })
                    current_time += word_duration

        logger.info(f"Whisper returned {len(word_timings)} word timings")
        return word_timings

    except Exception as e:
        logger.warning(f"Whisper transcription failed: {e}")
        return []


def generate_captions_from_word_timings(
    word_timings: List[Dict],
    max_words_per_caption: int = 6,
    max_chars_per_caption: int = 50,
    min_caption_duration: float = 0.5,
    max_caption_duration: float = 3.0,
) -> List[Dict]:
    """
    Group words into caption chunks with proper timing.

    Args:
        word_timings: Word-level timing data
        max_words_per_caption: Max words per caption line
        max_chars_per_caption: Max characters per caption line
        min_caption_duration: Minimum caption display time
        max_caption_duration: Maximum caption display time

    Returns:
        List of caption dictionaries
    """
    if not word_timings:
        return []

    captions = []
    current_words = []
    current_chars = 0
    caption_start = word_timings[0]["start"] if word_timings else 0

    for i, word_data in enumerate(word_timings):
        word = word_data["word"]
        word_len = len(word) + 1  # +1 for space

        # Check if we should start a new caption
        should_break = (
            len(current_words) >= max_words_per_caption or
            current_chars + word_len > max_chars_per_caption or
            (current_words and word_data["start"] - caption_start > max_caption_duration)
        )

        if should_break and current_words:
            # Save current caption
            caption_text = " ".join(current_words)
            caption_end = word_timings[i - 1]["end"] if i > 0 else word_data["start"]

            # Ensure minimum duration
            if caption_end - caption_start < min_caption_duration:
                caption_end = caption_start + min_caption_duration

            captions.append({
                "index": len(captions) + 1,
                "text": caption_text,
                "start": caption_start,
                "end": caption_end,
                "words": current_words.copy(),
            })

            # Reset for next caption
            current_words = []
            current_chars = 0
            caption_start = word_data["start"]

        current_words.append(word)
        current_chars += word_len

    # Add final caption
    if current_words:
        caption_text = " ".join(current_words)
        caption_end = word_timings[-1]["end"]

        if caption_end - caption_start < min_caption_duration:
            caption_end = caption_start + min_caption_duration

        captions.append({
            "index": len(captions) + 1,
            "text": caption_text,
            "start": caption_start,
            "end": caption_end,
            "words": current_words.copy(),
        })

    return captions


def generate_captions_from_scenes(
    scenes: List[Dict],
    audio_timing: List[Dict],
    max_words_per_caption: int = 8,
) -> List[Dict]:
    """
    Generate captions from scene narrations when word-level timing is not available.

    Args:
        scenes: Scene list with narration
        audio_timing: Per-scene timing data
        max_words_per_caption: Max words per caption line

    Returns:
        List of caption dictionaries
    """
    captions = []

    for scene, timing in zip(scenes, audio_timing):
        narration = scene.get("narration", "")
        if not narration:
            continue

        words = narration.split()
        scene_start = timing.get("start_time", 0)
        scene_duration = timing.get("duration", 5.0)

        # Split into chunks
        chunks = []
        for i in range(0, len(words), max_words_per_caption):
            chunk = words[i:i + max_words_per_caption]
            chunks.append(" ".join(chunk))

        # Calculate timing for each chunk
        chunk_duration = scene_duration / max(len(chunks), 1)
        current_time = scene_start

        for chunk in chunks:
            captions.append({
                "index": len(captions) + 1,
                "text": chunk,
                "start": current_time,
                "end": current_time + chunk_duration,
                "words": chunk.split(),
            })
            current_time += chunk_duration

    return captions


# ============================================
# SRT/VTT Generation
# ============================================
def generate_srt(captions: List[Dict]) -> str:
    """Generate SRT subtitle format"""
    lines = []
    for caption in captions:
        lines.append(str(caption["index"]))
        lines.append(f"{_format_srt_time(caption['start'])} --> {_format_srt_time(caption['end'])}")
        lines.append(caption["text"])
        lines.append("")
    return "\n".join(lines)


def generate_vtt(captions: List[Dict]) -> str:
    """Generate WebVTT subtitle format"""
    lines = ["WEBVTT", ""]
    for caption in captions:
        lines.append(str(caption["index"]))
        lines.append(f"{_format_vtt_time(caption['start'])} --> {_format_vtt_time(caption['end'])}")
        lines.append(caption["text"])
        lines.append("")
    return "\n".join(lines)


def generate_json_timemap(captions: List[Dict]) -> str:
    """Generate JSON time map for dynamic captions"""
    return json.dumps(captions, indent=2)


def _format_srt_time(seconds: float) -> str:
    """Format seconds to SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _format_vtt_time(seconds: float) -> str:
    """Format seconds to VTT timestamp (HH:MM:SS.mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


# ============================================
# Emphasis Word Detection
# ============================================
def detect_emphasis_words(captions: List[Dict]) -> List[Dict]:
    """
    Detect words that should be emphasized in captions.

    Common emphasis patterns:
    - ALL CAPS words
    - Words after "never", "always", "must", etc.
    - Numbers and statistics
    - Key action words

    Args:
        captions: List of caption dictionaries

    Returns:
        Updated captions with emphasis_words field
    """
    emphasis_triggers = {
        "never", "always", "must", "don't", "can't", "won't",
        "secret", "key", "important", "critical", "essential",
        "first", "second", "third", "finally", "remember",
        "imagine", "believe", "success", "failure", "power",
        "million", "billion", "percent", "years", "days",
    }

    for caption in captions:
        words = caption.get("words", caption["text"].split())
        emphasis_indices = []

        for i, word in enumerate(words):
            word_lower = word.lower().strip(".,!?\"'")

            # Check for ALL CAPS
            if word.isupper() and len(word) > 2:
                emphasis_indices.append(i)
                continue

            # Check for emphasis triggers
            if word_lower in emphasis_triggers:
                emphasis_indices.append(i)
                continue

            # Check for numbers
            if any(c.isdigit() for c in word):
                emphasis_indices.append(i)
                continue

        caption["emphasis_indices"] = emphasis_indices

    return captions


# ============================================
# Main Worker Function
# ============================================
@worker_task(
    worker_name="caption_generator",
    max_retries=1,
)
def generate_captions(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate timed captions for the video.

    Input job_data keys:
        - scenes: Scene list with narration
        - audio_timing: Timing data from audio worker
        - word_timings: Word-level timing from audio worker
        - voiceover_local_path: Path to voiceover audio
        - advanced: Contains auto_captions, emphasis_words flags

    Output (merged into job_data):
        - captions: List of caption entries with timing
        - srt_content: SRT file content
        - vtt_content: VTT file content
        - json_timemap: JSON time map
        - captions_enabled: Whether captions are enabled
        - caption_style: Selected caption style
    """
    job_id = job_data.get("job_id")
    scenes = job_data.get("parsed_scenes", job_data.get("scenes", []))
    audio_timing = job_data.get("audio_timing", [])
    word_timings = job_data.get("word_timings", [])
    voiceover_path = job_data.get("voiceover_local_path")
    advanced = job_data.get("advanced", {})

    auto_captions = advanced.get("auto_captions", True)
    emphasis_words = advanced.get("emphasis_words", True)
    caption_style = advanced.get("caption_style", "default")

    logger.info(f"[{job_id}] Generating captions, auto_captions={auto_captions}, emphasis={emphasis_words}")

    update_job_progress(70, PipelineStage.CAPTION_GENERATION.value)

    # Update database
    db_job_id = job_data.get("db_job_id")
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            status="processing",
            progress=70,
        )

    try:
        if not auto_captions:
            logger.info(f"[{job_id}] Captions disabled, skipping")
            result = {
                "captions": [],
                "srt_content": "",
                "vtt_content": "",
                "json_timemap": "[]",
                "captions_enabled": False,
                "caption_style": caption_style,
            }
            enqueue_next_stage(job_data, PipelineStage.CAPTION_GENERATION, result)
            return result

        # Try to get word-level timing
        final_word_timings = word_timings

        # If no word timings from TTS, try Whisper transcription
        if not final_word_timings and voiceover_path and os.path.exists(voiceover_path):
            logger.info(f"[{job_id}] Running Whisper transcription for word-level timing")
            final_word_timings = transcribe_with_whisper(voiceover_path)

        update_job_progress(72, PipelineStage.CAPTION_GENERATION.value)

        # Generate captions
        if final_word_timings:
            logger.info(f"[{job_id}] Generating captions from {len(final_word_timings)} word timings")
            captions = generate_captions_from_word_timings(
                word_timings=final_word_timings,
                max_words_per_caption=6,
                max_chars_per_caption=50,
            )
        else:
            logger.info(f"[{job_id}] Generating captions from scene timing (fallback)")
            captions = generate_captions_from_scenes(
                scenes=scenes,
                audio_timing=audio_timing,
                max_words_per_caption=8,
            )

        # Detect emphasis words
        if emphasis_words:
            captions = detect_emphasis_words(captions)

        logger.info(f"[{job_id}] Generated {len(captions)} caption entries")

        update_job_progress(74, PipelineStage.CAPTION_GENERATION.value)

        # Generate subtitle formats
        srt_content = generate_srt(captions)
        vtt_content = generate_vtt(captions)
        json_timemap = generate_json_timemap(captions)

        # Upload SRT to S3
        storage = get_storage()
        temp_dir = Path(settings.TEMP_DIR) / job_id / "captions"
        temp_dir.mkdir(parents=True, exist_ok=True)

        srt_path = str(temp_dir / "captions.srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        vtt_path = str(temp_dir / "captions.vtt")
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write(vtt_content)

        json_path = str(temp_dir / "captions.json")
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(json_timemap)

        # Get caption style config
        style_config = CAPTION_STYLES.get(caption_style, CAPTION_STYLES["default"])

        update_job_progress(75, PipelineStage.CAPTION_GENERATION.value)

        if db_job_id:
            update_video_job_db(job_id=str(db_job_id), progress=75)

        result = {
            "captions": captions,
            "srt_content": srt_content,
            "srt_local_path": srt_path,
            "vtt_content": vtt_content,
            "vtt_local_path": vtt_path,
            "json_timemap": json_timemap,
            "json_local_path": json_path,
            "captions_enabled": True,
            "caption_style": caption_style,
            "caption_style_config": style_config,
        }

        # Enqueue next stage (rendering)
        enqueue_next_stage(job_data, PipelineStage.CAPTION_GENERATION, result)

        return result

    except Exception as e:
        logger.error(f"[{job_id}] Caption generation failed: {str(e)}")
        raise RetryableFailure(f"Caption generation error: {str(e)}")
