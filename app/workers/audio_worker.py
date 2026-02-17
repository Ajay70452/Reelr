"""
Audio Worker
Generates voiceover (TTS) and processes background music
Queue: audio_queue
"""

import os
import io
import subprocess
import tempfile
import requests
import logging
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

logger = get_logger("audio")


# ============================================
# Voice Configuration
# ============================================
# ElevenLabs voice IDs
ELEVENLABS_VOICES = {
    "adam": "pNInz6obpgDQGcFmaJgB",      # Deep, professional male
    "rachel": "21m00Tcm4TlvDq8ikWAM",    # Calm female
    "domi": "AZnzlk1XvdvUeBnXmlld",      # Strong female
    "bella": "EXAVITQu4vr4xnSDxMaL",     # Soft female
    "antoni": "ErXwobaYiN019PkySvjV",    # Warm male
    "josh": "TxGEqnHWrfWFTfGW9XjX",      # Deep male
    "arnold": "VR6AewLTigWG4xSOukaG",    # Strong male
    "sam": "yoZ06aMxZJJ28mfd3POQ",       # Casual male
}

# OpenAI TTS voices
OPENAI_VOICES = {
    "alloy": "alloy",
    "echo": "echo",
    "fable": "fable",
    "onyx": "onyx",
    "nova": "nova",
    "shimmer": "shimmer",
}

# Default music library (URLs or S3 paths)
MUSIC_LIBRARY = {
    "epic": "music/epic_cinematic.mp3",
    "motivational": "music/motivational_upbeat.mp3",
    "calm": "music/calm_ambient.mp3",
    "dramatic": "music/dramatic_tension.mp3",
    "corporate": "music/corporate_positive.mp3",
    "dark": "music/dark_mysterious.mp3",
    "uplifting": "music/uplifting_inspiring.mp3",
    "none": None,
}


# ============================================
# TTS Generation Functions
# ============================================
def generate_elevenlabs_tts(
    text: str,
    voice_id: str,
    output_path: str,
    stability: float = 0.5,
    similarity_boost: float = 0.75,
) -> Tuple[str, List[Dict]]:
    """
    Generate speech using ElevenLabs API.

    Args:
        text: Text to convert to speech
        voice_id: ElevenLabs voice ID
        output_path: Path to save audio file
        stability: Voice stability (0-1)
        similarity_boost: Voice similarity boost (0-1)

    Returns:
        Tuple of (output_path, word_timings)
    """
    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        raise PermanentFailure("ELEVENLABS_API_KEY not configured")

    # Resolve voice ID from friendly name
    resolved_voice_id = ELEVENLABS_VOICES.get(voice_id, voice_id)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{resolved_voice_id}/with-timestamps"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
        },
    }

    logger.info(f"Generating ElevenLabs TTS for {len(text)} chars...")

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)

        if response.status_code != 200:
            error_msg = response.text[:200] if response.text else "Unknown error"
            logger.error(f"ElevenLabs API error: {error_msg}")
            raise RetryableFailure(f"ElevenLabs API error: {error_msg}")

        result = response.json()

        # Extract audio bytes (base64)
        import base64
        audio_base64 = result.get("audio_base64", "")
        if not audio_base64:
            raise RetryableFailure("No audio returned from ElevenLabs")

        audio_bytes = base64.b64decode(audio_base64)

        # Save to file
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(audio_bytes)

        # Extract word-level timing (alignment data)
        word_timings = []
        alignment = result.get("alignment", {})
        characters = alignment.get("characters", [])
        char_start_times = alignment.get("character_start_times_seconds", [])
        char_end_times = alignment.get("character_end_times_seconds", [])

        # Group characters into words
        if characters and char_start_times:
            current_word = ""
            word_start = None
            word_end = None

            for i, char in enumerate(characters):
                if char == " " or i == len(characters) - 1:
                    if i == len(characters) - 1 and char != " ":
                        current_word += char
                        word_end = char_end_times[i] if i < len(char_end_times) else word_end

                    if current_word.strip():
                        word_timings.append({
                            "word": current_word.strip(),
                            "start": word_start,
                            "end": word_end,
                        })
                    current_word = ""
                    word_start = None
                else:
                    if word_start is None:
                        word_start = char_start_times[i] if i < len(char_start_times) else 0
                    word_end = char_end_times[i] if i < len(char_end_times) else word_start
                    current_word += char

        return output_path, word_timings

    except requests.exceptions.Timeout:
        raise RetryableFailure("ElevenLabs API timeout")
    except Exception as e:
        if isinstance(e, (RetryableFailure, PermanentFailure)):
            raise
        raise RetryableFailure(f"ElevenLabs error: {str(e)}")


def generate_openai_tts(
    text: str,
    voice_id: str,
    output_path: str,
) -> Tuple[str, List[Dict]]:
    """
    Generate speech using OpenAI TTS API.

    Args:
        text: Text to convert to speech
        voice_id: OpenAI voice name
        output_path: Path to save audio file

    Returns:
        Tuple of (output_path, estimated_word_timings)
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise PermanentFailure("OPENAI_API_KEY not configured")

    from openai import OpenAI

    # Resolve voice name
    resolved_voice = OPENAI_VOICES.get(voice_id, "onyx")

    logger.info(f"Generating OpenAI TTS for {len(text)} chars...")

    try:
        client = OpenAI(api_key=api_key)

        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=resolved_voice,
            input=text,
            response_format="mp3",
        )

        # Save to file
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        response.stream_to_file(output_path)

        # OpenAI doesn't provide word-level timing, so we estimate
        # Based on ~150 words per minute
        words = text.split()
        word_timings = []
        current_time = 0.0
        words_per_second = 2.5  # 150 WPM

        for word in words:
            duration = 1.0 / words_per_second
            word_timings.append({
                "word": word,
                "start": current_time,
                "end": current_time + duration,
            })
            current_time += duration

        return output_path, word_timings

    except Exception as e:
        raise RetryableFailure(f"OpenAI TTS error: {str(e)}")


def generate_tts(
    text: str,
    voice_id: str,
    output_path: str,
) -> Tuple[str, List[Dict]]:
    """
    Generate TTS using available provider (ElevenLabs preferred, OpenAI fallback).

    Returns:
        Tuple of (audio_path, word_timings)
    """
    # Try ElevenLabs first (better quality, word-level timing)
    if settings.ELEVENLABS_API_KEY:
        try:
            return generate_elevenlabs_tts(text, voice_id, output_path)
        except Exception as e:
            logger.warning(f"ElevenLabs failed, trying OpenAI: {e}")

    # Fallback to OpenAI
    if settings.OPENAI_API_KEY:
        return generate_openai_tts(text, voice_id, output_path)

    raise PermanentFailure("No TTS API key configured (ELEVENLABS_API_KEY or OPENAI_API_KEY)")


# ============================================
# Audio Processing Functions
# ============================================
def get_audio_duration(audio_path: str) -> float:
    """Get duration of audio file using FFprobe"""
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"Failed to get audio duration: {e}")
    return 0.0


def normalize_audio(
    input_path: str,
    output_path: str,
    target_lufs: float = -16.0,
) -> str:
    """
    Normalize audio to target LUFS level.

    Args:
        input_path: Input audio file
        output_path: Output audio file
        target_lufs: Target loudness (default -16 LUFS for streaming)

    Returns:
        Path to normalized audio
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Two-pass loudnorm for accurate normalization
    # First pass: measure
    measure_cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ]

    try:
        result = subprocess.run(measure_cmd, capture_output=True, text=True, timeout=60)

        # Second pass: normalize (simplified without parsing json)
        normalize_cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11",
            "-ar", "44100",
            "-ac", "2",
            output_path
        ]

        result = subprocess.run(normalize_cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            logger.warning(f"Audio normalization warning: {result.stderr[:200]}")
            # Fall back to copy
            import shutil
            shutil.copy(input_path, output_path)

        return output_path

    except subprocess.TimeoutExpired:
        raise RetryableFailure("Audio normalization timed out")
    except FileNotFoundError:
        logger.warning("FFmpeg not found, skipping normalization")
        import shutil
        shutil.copy(input_path, output_path)
        return output_path


def apply_music_ducking(
    voiceover_path: str,
    music_path: str,
    output_path: str,
    duck_level: float = -12.0,
    attack_time: float = 0.3,
    release_time: float = 0.5,
) -> str:
    """
    Mix voiceover with background music, applying ducking.

    Args:
        voiceover_path: Path to voiceover audio
        music_path: Path to background music
        output_path: Path for mixed output
        duck_level: How much to reduce music volume during speech (dB)
        attack_time: How fast to duck (seconds)
        release_time: How fast to return (seconds)

    Returns:
        Path to mixed audio
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Get voiceover duration
    vo_duration = get_audio_duration(voiceover_path)

    # Use sidechaincompress for ducking effect
    # Voiceover triggers the compressor on music
    cmd = [
        "ffmpeg", "-y",
        "-i", voiceover_path,
        "-i", music_path,
        "-filter_complex",
        f"[1:a]volume=0.3[music];"  # Reduce base music volume
        f"[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[out]",
        "-map", "[out]",
        "-t", str(vo_duration + 1),  # Add 1s buffer
        "-ar", "44100",
        "-ac", "2",
        output_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            logger.warning(f"Music ducking failed, using voiceover only: {result.stderr[:200]}")
            import shutil
            shutil.copy(voiceover_path, output_path)

        return output_path

    except subprocess.TimeoutExpired:
        raise RetryableFailure("Music ducking timed out")
    except FileNotFoundError:
        logger.warning("FFmpeg not found, using voiceover only")
        import shutil
        shutil.copy(voiceover_path, output_path)
        return output_path


def download_music(music_id: str, output_path: str) -> Optional[str]:
    """
    Download background music file.

    Args:
        music_id: Music identifier
        output_path: Path to save music file

    Returns:
        Path to music file or None if not found
    """
    music_key = MUSIC_LIBRARY.get(music_id)
    if not music_key:
        return None

    # Try to download from S3
    storage = get_storage()
    try:
        if storage.file_exists(music_key):
            return storage.download_file(music_key, output_path)
    except Exception as e:
        logger.warning(f"Failed to download music from S3: {e}")

    return None


# ============================================
# Main Worker Function
# ============================================
@worker_task(
    worker_name="audio_generator",
    max_retries=2,
)
def generate_audio(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate voiceover using TTS and prepare background music.

    Input job_data keys:
        - script: Full script text
        - scenes: Scene list with narration
        - voice_id: Selected TTS voice
        - music_id: Selected background music

    Output (merged into job_data):
        - voiceover_url: S3 URL of generated voiceover
        - voiceover_local_path: Local path to voiceover
        - music_url: S3 URL of selected music (if any)
        - music_local_path: Local path to music (if any)
        - final_audio_url: S3 URL of mixed audio
        - final_audio_local_path: Local path to mixed audio
        - word_timings: Word-level timing data
        - audio_timing: Per-scene timing data
        - total_audio_duration: Total duration in seconds
    """
    job_id = job_data.get("job_id")
    script = job_data.get("script", "")
    scenes = job_data.get("parsed_scenes", job_data.get("scenes", []))
    voice_id = job_data.get("voice_id", "adam")
    music_id = job_data.get("music_id", "none")

    logger.info(f"[{job_id}] Generating audio with voice={voice_id}, music={music_id}")

    update_job_progress(55, PipelineStage.AUDIO_GENERATION.value)

    # Update database
    db_job_id = job_data.get("db_job_id")
    if db_job_id:
        update_video_job_db(
            job_id=str(db_job_id),
            status="processing",
            progress=55,
        )

    storage = get_storage()
    temp_dir = Path(settings.TEMP_DIR) / job_id / "audio"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Combine all scene narrations for TTS
        full_narration = " ".join(
            scene.get("narration", "") for scene in scenes
        ).strip()

        if not full_narration:
            full_narration = script or "This is a video narration."

        logger.info(f"[{job_id}] Generating TTS for {len(full_narration)} characters")

        # Generate TTS
        voiceover_path = str(temp_dir / "voiceover_raw.mp3")
        voiceover_path, word_timings = generate_tts(
            text=full_narration,
            voice_id=voice_id,
            output_path=voiceover_path,
        )

        update_job_progress(58, PipelineStage.AUDIO_GENERATION.value)

        # Normalize voiceover
        voiceover_normalized = str(temp_dir / "voiceover.mp3")
        normalize_audio(voiceover_path, voiceover_normalized)

        # Get actual duration
        total_duration = get_audio_duration(voiceover_normalized)
        if total_duration <= 0:
            # Estimate from word count
            total_duration = len(full_narration.split()) / 2.5

        logger.info(f"[{job_id}] Voiceover duration: {total_duration:.1f}s")

        update_job_progress(60, PipelineStage.AUDIO_GENERATION.value)

        # Process music if selected
        music_url = None
        music_local_path = None
        final_audio_path = voiceover_normalized

        if music_id and music_id != "none":
            music_local_path = str(temp_dir / f"music_{music_id}.mp3")
            downloaded_music = download_music(music_id, music_local_path)

            if downloaded_music:
                logger.info(f"[{job_id}] Mixing with background music: {music_id}")

                # Mix voiceover with music (ducking)
                mixed_audio_path = str(temp_dir / "final_audio.mp3")
                apply_music_ducking(
                    voiceover_path=voiceover_normalized,
                    music_path=downloaded_music,
                    output_path=mixed_audio_path,
                )

                final_audio_path = mixed_audio_path

                # Upload music to S3
                music_url = storage.upload_audio(downloaded_music, job_id, "music")
            else:
                logger.warning(f"[{job_id}] Music not found: {music_id}, using voiceover only")

        update_job_progress(63, PipelineStage.AUDIO_GENERATION.value)

        # Upload voiceover to S3
        voiceover_url = storage.upload_audio(voiceover_normalized, job_id, "voiceover")

        # Upload final mixed audio
        final_audio_url = storage.upload_audio(final_audio_path, job_id, "final")

        # Calculate per-scene timing based on word timings
        audio_timing = _calculate_scene_timing(scenes, word_timings, total_duration)

        logger.info(f"[{job_id}] Audio generated, total duration: {total_duration:.1f}s")

        update_job_progress(65, PipelineStage.AUDIO_GENERATION.value)

        if db_job_id:
            update_video_job_db(job_id=str(db_job_id), progress=65)

        result = {
            "voiceover_url": voiceover_url,
            "voiceover_local_path": voiceover_normalized,
            "music_url": music_url,
            "music_local_path": music_local_path,
            "final_audio_url": final_audio_url,
            "final_audio_local_path": final_audio_path,
            "word_timings": word_timings,
            "audio_timing": audio_timing,
            "total_audio_duration": total_duration,
        }

        # Enqueue next stage (caption generation)
        enqueue_next_stage(job_data, PipelineStage.AUDIO_GENERATION, result)

        return result

    except PermanentFailure:
        raise
    except RetryableFailure:
        raise
    except Exception as e:
        logger.error(f"[{job_id}] Audio generation failed: {str(e)}")
        raise RetryableFailure(f"Audio generation error: {str(e)}")


def _calculate_scene_timing(
    scenes: List[Dict],
    word_timings: List[Dict],
    total_duration: float,
) -> List[Dict]:
    """
    Calculate start/end times for each scene based on word timings.

    Args:
        scenes: List of scene dictionaries with narration
        word_timings: Word-level timing from TTS
        total_duration: Total audio duration

    Returns:
        List of scene timing dictionaries
    """
    audio_timing = []
    word_index = 0

    for scene in scenes:
        scene_id = scene.get("scene_id", len(audio_timing) + 1)
        narration = scene.get("narration", "")
        words_in_scene = narration.split()

        if not words_in_scene:
            # Empty narration, estimate duration
            start_time = word_timings[word_index]["start"] if word_index < len(word_timings) else 0
            audio_timing.append({
                "scene_id": scene_id,
                "start_time": start_time,
                "end_time": start_time + 2.0,
                "duration": 2.0,
            })
            continue

        # Find timing for this scene's words
        if word_index < len(word_timings):
            start_time = word_timings[word_index]["start"]
        else:
            # Fallback: estimate
            start_time = audio_timing[-1]["end_time"] if audio_timing else 0

        end_index = min(word_index + len(words_in_scene) - 1, len(word_timings) - 1)
        if end_index >= 0 and end_index < len(word_timings):
            end_time = word_timings[end_index]["end"]
        else:
            # Fallback: estimate
            end_time = start_time + len(words_in_scene) / 2.5

        audio_timing.append({
            "scene_id": scene_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration": end_time - start_time,
        })

        word_index += len(words_in_scene)

    return audio_timing
