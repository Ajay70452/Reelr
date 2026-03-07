"""
Script-to-Video Service - V2 (Updated Workflow)

Pipeline (from docs/updated_workflow.md):
1. User Submission → raw_script, preset_id, voice_id, video_settings
2. Preset Prompt Resolution → fetch style/tone from Supabase
3. Script Enhancement (Gemini) → Canonical Video Script with scenes
4. Voice Generation (Deepgram TTS) → narration audio
5. Caption Generation (Deepgram STT) → word-level timestamps
6. Image Generation → 1 scene = 1 image (strict)
7. Video Composition (FFmpeg/Remotion) → final video
8. Final Encode → optimized MP4
"""

import logging
import uuid
import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.db.models import ScriptToVideoJob, ScriptToVideo, Preset
from app.services.gemini_service import (
    get_gemini_service,
    CanonicalVideoScript,
    PresetContext,
)
from app.services.deepgram_service import (
    get_deepgram_service,
    AudioResult,
    CaptionData,
    DEEPGRAM_VOICES,
    DEFAULT_VOICE,
)
from app.services.video_composer import (
    get_video_composer,
    VideoCompositionData,
    SceneComposition,
)
from app.services.storage import get_storage
from app.services.model_router import (
    get_image_model,
    IMAGE_MODELS,
    is_z_turbo_model,
    build_z_turbo_payload,
    get_z_turbo_image_size,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# Constants
# ============================================
IMAGES_PER_SCENE = 1  # LOCKED: 1 Scene = 1 Image (from workflow doc)

MOTION_TYPES = [
    "slow_zoom_in",
    "slow_zoom_out",
    "pan_left",
    "pan_right",
    "pan_up",
    "pan_down",
    "drift",
]


# ============================================
# Script-to-Video Service V2
# ============================================
class ScriptToVideoService:
    """
    Service for generating videos from scripts using the updated workflow.

    Pipeline:
    1. Script Enhancement (Gemini) → structured scenes
    2. Voice Generation (Deepgram TTS) → narration audio
    3. Caption Generation (Deepgram STT) → word timestamps
    4. Image Generation (fal.ai) → 1 image per scene
    5. Video Composition (FFmpeg) → final video
    """

    def __init__(self, db: Session):
        self.db = db
        self.gemini = get_gemini_service()
        self.deepgram = get_deepgram_service()
        self.composer = get_video_composer()

    async def process_job(self, job_id: uuid.UUID) -> bool:
        """
        Main entry point - process a script-to-video job.
        Returns True if successful, False otherwise.
        """
        job = self.db.query(ScriptToVideoJob).filter(
            ScriptToVideoJob.id == job_id
        ).first()

        if not job:
            logger.error(f"Job {job_id} not found")
            return False

        try:
            # ============================================
            # STEP 1: Preset Prompt Resolution
            # ============================================
            await self._update_status(job, "normalizing", 5, "Loading preset...")
            preset_context = await self._resolve_preset(job.preset_id)

            # ============================================
            # STEP 2: Script Enhancement (Gemini)
            # ============================================
            await self._update_status(job, "normalizing", 10, "Enhancing script...")
            canonical_script = await self._enhance_script(
                raw_script=job.script,
                preset_context=preset_context,
                target_duration=float(job.duration or 30),
                aspect_ratio=job.aspect_ratio,
            )

            # Store normalized data
            job.normalized_lines = [s.narration for s in canonical_script.scenes]
            job.scenes = [
                {
                    "scene_id": s.scene_id,
                    "narration": s.narration,
                    "visual_description": s.visual_description,
                    "duration": s.duration,
                }
                for s in canonical_script.scenes
            ]
            job.total_scenes = canonical_script.scene_count
            self.db.commit()

            logger.info(f"Script enhanced: {canonical_script.scene_count} scenes, "
                       f"{canonical_script.total_duration}s total")

            # ============================================
            # STEP 3: Voice Generation (Deepgram TTS)
            # ============================================
            await self._update_status(job, "generating_voice", 20, "Generating voice...")

            # Combine all narrations
            full_narration = " ".join(s.narration for s in canonical_script.scenes)

            # Get voice ID (map from job.voice_id or use default)
            voice_id = self._resolve_voice_id(job.voice_id)

            audio_result, caption_data = await self._generate_voice_and_captions(
                text=full_narration,
                voice_id=voice_id,
            )

            logger.info(f"Voice generated: {audio_result.duration}s, "
                       f"{len(caption_data.words)} words")

            # ============================================
            # STEP 3.5: Background Music Mixing
            # ============================================
            final_audio_path = audio_result.audio_path  # default: voiceover only

            bgm_id = job.bgm_id
            if bgm_id and bgm_id != "none":
                await self._update_status(job, "mixing_audio", 28, "Adding background music...")
                try:
                    mixed_path = await self._mix_background_music(
                        voiceover_path=audio_result.audio_path,
                        bgm_id=bgm_id,
                        word_timings=caption_data.words,
                    )
                    if mixed_path:
                        final_audio_path = mixed_path
                        logger.info(f"Background music mixed: {bgm_id}")
                    else:
                        logger.warning(f"Music '{bgm_id}' not found, using voiceover only")
                except Exception as e:
                    logger.warning(f"Music mixing failed, using voiceover only: {e}")

            # ============================================
            # STEP 4: Image Generation (1 scene = 1 image)
            # ============================================
            await self._update_status(job, "generating_images", 35, "Generating images...")

            scene_images = await self._generate_images(
                job=job,
                canonical_script=canonical_script,
                preset_context=preset_context,
            )

            # ============================================
            # STEP 5: Video Composition
            # ============================================
            await self._update_status(job, "composing", 75, "Composing video...")

            # Calculate scene timings based on actual audio duration
            scenes_with_timing = self._calculate_scene_timings(
                canonical_script=canonical_script,
                scene_images=scene_images,
                audio_duration=caption_data.duration,
            )

            # Create composition data
            composition = VideoCompositionData(
                scenes=scenes_with_timing,
                audio_path=final_audio_path,
                captions=caption_data,
                aspect_ratio=job.aspect_ratio,
                fps=30,
                total_duration=caption_data.duration,
                preset_style=preset_context.style_prompt if preset_context else None,
            )

            # Compose the video
            result = await self.composer.compose_video(composition)

            # ============================================
            # STEP 6: Upload & Finalize
            # ============================================
            await self._update_status(job, "uploading", 90, "Uploading video...")

            video_url = await self._upload_to_storage(result.video_path, "video")

            # Generate thumbnail
            thumbnail_url = await self._generate_thumbnail(
                result.video_path, scene_images
            )

            # Create video record
            video = ScriptToVideo(
                id=uuid.uuid4(),
                job_id=job.id,
                user_id=job.user_id,
                video_url=video_url,
                thumbnail_url=thumbnail_url,
                duration=int(result.duration),
                resolution=f"{result.resolution[0]}x{result.resolution[1]}",
                aspect_ratio=job.aspect_ratio,
                scene_count=len(scenes_with_timing),
                script_preview=job.script[:200] if job.script else None,
            )
            self.db.add(video)

            # Mark job complete
            await self._update_status(job, "completed", 100, "Complete!")
            logger.info(f"Script-to-video job {job_id} completed successfully")
            return True

        except Exception as e:
            logger.error(f"Script-to-video job {job_id} failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            job.status = "failed"
            job.error_message = str(e)
            self.db.commit()
            return False

    async def _update_status(
        self,
        job: ScriptToVideoJob,
        status: str,
        progress: int,
        current_step: str
    ):
        """Update job status."""
        job.status = status
        job.progress = progress
        job.current_step = current_step
        self.db.commit()

    async def _resolve_preset(
        self,
        preset_id: Optional[str]
    ) -> Optional[PresetContext]:
        """Resolve preset from database."""
        if not preset_id:
            return None

        preset = self.db.query(Preset).filter(Preset.id == preset_id).first()
        if not preset:
            return None

        return PresetContext(
            style_prompt=preset.prompt_prefix or "",
            tone_modifiers=preset.prompt_suffix,
            negative_prompt=preset.negative_prompt if hasattr(preset, 'negative_prompt') else None,
        )

    def _resolve_voice_id(self, voice_id: Optional[str]) -> str:
        """Map voice ID to Deepgram voice model."""
        if not voice_id:
            return DEFAULT_VOICE

        # Check if it's already a Deepgram voice ID
        if voice_id in DEEPGRAM_VOICES:
            return voice_id

        # Map common voice names to Deepgram voices
        voice_mappings = {
            # Female voices
            "female": "aura-2-thalia-en",
            "female_american": "aura-2-thalia-en",
            "female_british": "aura-2-athena-en",
            "sarah": "aura-2-luna-en",
            "emily": "aura-2-stella-en",
            # Male voices
            "male": "aura-2-orion-en",
            "male_american": "aura-2-orion-en",
            "male_british": "aura-2-helios-en",
            "male_irish": "aura-2-angus-en",
            "adam": "aura-2-arcas-en",
            "james": "aura-2-perseus-en",
        }

        return voice_mappings.get(voice_id.lower(), DEFAULT_VOICE)

    async def _mix_background_music(
        self,
        voiceover_path: Path,
        bgm_id: str,
        word_timings: list,
    ) -> Optional[Path]:
        """
        Download background music from S3 and mix it with voiceover.

        Self-contained — does not import from audio_worker (which depends on rq).

        Returns:
            Path to mixed audio file, or None if music not found.
        """
        import subprocess
        import tempfile

        # Music library mapping (same as audio_worker.MUSIC_LIBRARY)
        MUSIC_LIBRARY = {
            "another_love": "music/Another Love.mp3",
            "blade_runner_2049": "music/Blade Runner 2049.mp3",
            "carman_prelude": "music/Carman Prelude.mp3",
            "else_paris_extended": "music/Else - Paris Extended.mp3",
            "else_paris": "music/Else - Paris.mp3",
            "fur_elise": "music/Fur Elise.mp3",
            "snowfall": "music/Snowfall.mp3",
        }

        music_key = MUSIC_LIBRARY.get(bgm_id)
        if not music_key:
            logger.warning(f"Music ID '{bgm_id}' not found in library")
            return None

        temp_dir = Path(tempfile.gettempdir()) / "clipking" / "music_mix"
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Step 1: Download music from S3
        music_local_path = str(temp_dir / f"bgm_{bgm_id}.mp3")
        storage = get_storage()
        try:
            if not storage.file_exists(music_key):
                logger.warning(f"Music file not found in S3: {music_key}")
                return None
            storage.download_file(music_key, music_local_path)
            logger.info(f"Downloaded music from S3: {music_key}")
        except Exception as e:
            logger.warning(f"Failed to download music from S3: {e}")
            return None

        # Step 2: Get voiceover duration
        try:
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(voiceover_path),
            ]
            result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
            vo_duration = float(result.stdout.strip()) if result.returncode == 0 else 30.0
        except Exception:
            vo_duration = 30.0

        # Step 3: Build smart ducking filter from word timings
        duck_level = 0.12   # Volume during speech (very quiet)
        base_level = 0.25   # Volume during gaps (audible but not overpowering)

        if word_timings:
            # Merge word timings into speech regions
            speech_regions = []
            buffer = 0.3
            sorted_words = sorted(word_timings, key=lambda w: w.start)
            if sorted_words:
                current_start = sorted_words[0].start
                current_end = sorted_words[0].end
                for w in sorted_words[1:]:
                    if w.start - current_end < 0.5:  # gap threshold
                        current_end = max(current_end, w.end)
                    else:
                        speech_regions.append((current_start, current_end))
                        current_start = w.start
                        current_end = w.end
                speech_regions.append((current_start, current_end))

            # Build FFmpeg volume expression
            if speech_regions:
                parts = []
                for start, end in speech_regions:
                    s = max(0, start - buffer)
                    e = end + buffer
                    parts.append(f"between(t,{s:.2f},{e:.2f})")
                condition = "+".join(parts)
                duck_filter = f"volume='{base_level} - ({base_level}-{duck_level})*min(1,{condition})':eval=frame"
            else:
                duck_filter = f"volume={base_level}"
        else:
            duck_filter = f"volume={base_level}"

        logger.info(f"Mixing audio: vo_duration={vo_duration:.1f}s, bgm={bgm_id}")

        # Step 4: Mix voiceover with ducked music
        mixed_path = str(temp_dir / f"mixed_{uuid.uuid4()}.mp3")

        music_filter = (
            f"[1:a]aloop=loop=-1:size=2e+09,"
            f"atrim=0:{vo_duration + 1.0},"
            f"{duck_filter}"
            f"[music_ducked];"
            f"[0:a][music_ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", str(voiceover_path),
            "-i", music_local_path,
            "-filter_complex", music_filter,
            "-map", "[aout]",
            "-ar", "44100",
            "-ac", "2",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            mixed_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if result.returncode != 0:
                logger.warning(f"Music mixing FFmpeg failed: {result.stderr[:300]}")
                return None
        except subprocess.TimeoutExpired:
            logger.warning("Music mixing timed out")
            return None

        mixed_file = Path(mixed_path)
        if mixed_file.exists() and mixed_file.stat().st_size > 0:
            logger.info(f"Music mixed successfully: {mixed_path}")
            return mixed_file

        return None

    async def _enhance_script(
        self,
        raw_script: str,
        preset_context: Optional[PresetContext],
        target_duration: float,
        aspect_ratio: str,
    ) -> CanonicalVideoScript:
        """Enhance script using Gemini."""
        return await self.gemini.enhance_script(
            raw_script=raw_script,
            preset_context=preset_context,
            target_duration=target_duration,
            aspect_ratio=aspect_ratio,
        )

    async def _generate_voice_and_captions(
        self,
        text: str,
        voice_id: str,
    ) -> tuple[AudioResult, CaptionData]:
        """Generate voice audio and extract captions with timestamps."""
        # Check if Deepgram is configured
        if not settings.DEEPGRAM_API_KEY:
            logger.warning("DEEPGRAM_API_KEY not set, using fallback")
            return self._fallback_voice_generation(text)

        return await self.deepgram.generate_voice_and_captions(
            text=text,
            voice_id=voice_id,
        )

    def _fallback_voice_generation(
        self,
        text: str
    ) -> tuple[AudioResult, CaptionData]:
        """Fallback when Deepgram is not configured."""
        from app.services.deepgram_service import WordTimestamp
        import tempfile

        # Create empty audio file (video will be silent)
        temp_dir = Path(tempfile.gettempdir()) / "clipking" / "audio"
        temp_dir.mkdir(parents=True, exist_ok=True)
        audio_path = temp_dir / f"silent_{uuid.uuid4()}.mp3"

        # Create silent audio using FFmpeg
        import subprocess
        duration = len(text.split()) * 0.4  # ~0.4s per word
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(duration),
            "-c:a", "libmp3lame",
            str(audio_path),
        ]
        try:
            subprocess.run(cmd, capture_output=True, timeout=30)
        except Exception:
            # Create empty file
            audio_path.write_bytes(b"")

        # Create fake captions
        words = text.split()
        word_timestamps = []
        current_time = 0.0
        for word in words:
            word_duration = 0.4
            word_timestamps.append(WordTimestamp(
                word=word,
                start=current_time,
                end=current_time + word_duration,
            ))
            current_time += word_duration

        return (
            AudioResult(
                audio_path=audio_path,
                duration=current_time,
                char_count=len(text),
            ),
            CaptionData(
                words=word_timestamps,
                full_transcript=text,
                duration=current_time,
            ),
        )

    async def _generate_images(
        self,
        job: ScriptToVideoJob,
        canonical_script: CanonicalVideoScript,
        preset_context: Optional[PresetContext],
    ) -> Dict[int, str]:
        """
        Generate images for all scenes.
        STRICT RULE: 1 scene = 1 image
        """
        import fal_client

        scene_images = {}
        failed_scenes = []
        scene_count = len(canonical_script.scenes)

        # Validate 1:1 ratio
        assert scene_count == canonical_script.scene_count, \
            f"Scene count mismatch: {scene_count} != {canonical_script.scene_count}"

        logger.info(f"Generating {scene_count} images (1:1 scene ratio enforced)")

        # Get model and image size
        model_id = job.image_model or "flux-2-pro"
        fal_model = get_image_model(model_id)
        use_z_turbo = is_z_turbo_model(model_id)

        if use_z_turbo:
            image_size = get_z_turbo_image_size(job.aspect_ratio)
        else:
            aspect_to_size = {
                "9:16": "portrait_16_9",
                "16:9": "landscape_16_9",
                "1:1": "square_hd",
            }
            image_size = aspect_to_size.get(job.aspect_ratio, "portrait_16_9")

        # Retry configuration
        max_retries = settings.IMAGE_GEN_MAX_RETRIES
        base_retry_delay = settings.IMAGE_GEN_RETRY_DELAY

        for scene in canonical_script.scenes:
            # Build prompt from visual_description + preset
            prompt_parts = []

            if preset_context and preset_context.style_prompt:
                prompt_parts.append(preset_context.style_prompt)

            # Use visual_description ONLY (not narration!)
            prompt_parts.append(scene.visual_description)

            if preset_context and preset_context.tone_modifiers:
                prompt_parts.append(preset_context.tone_modifiers)

            prompt_parts.append("high quality, sharp focus, professional composition")

            final_prompt = ", ".join(prompt_parts)

            # Retry loop with exponential backoff
            success = False
            for attempt in range(max_retries):
                try:
                    logger.info(f"Generating image for scene {scene.scene_id} (attempt {attempt + 1}/{max_retries}): "
                               f"{final_prompt[:80]}...")

                    # Build arguments
                    if use_z_turbo:
                        arguments = build_z_turbo_payload(
                            prompt=final_prompt,
                            aspect_ratio=job.aspect_ratio,
                            num_images=1,
                        )
                    else:
                        arguments = {
                            "prompt": final_prompt,
                            "image_size": image_size,
                            "output_format": "jpeg",
                            "safety_tolerance": 2,
                            "enable_safety_checker": True,
                        }

                    # Generate image
                    result = fal_client.subscribe(fal_model, arguments=arguments)

                    if result and "images" in result and result["images"]:
                        scene_images[scene.scene_id] = result["images"][0]["url"]
                        logger.info(f"✓ Scene {scene.scene_id} image generated: {scene_images[scene.scene_id][:60]}...")
                        success = True
                        break  # Success, exit retry loop
                    else:
                        raise Exception("No image returned from fal.ai")

                except Exception as e:
                    if attempt < max_retries - 1:
                        # Calculate exponential backoff delay
                        retry_delay = base_retry_delay * (2 ** attempt)
                        logger.warning(f"Scene {scene.scene_id} attempt {attempt + 1} failed: {e}. "
                                     f"Retrying in {retry_delay}s...")
                        await asyncio.sleep(retry_delay)
                    else:
                        # Final attempt failed, log detailed error
                        error_details = {
                            'scene_id': scene.scene_id,
                            'prompt': final_prompt[:200],
                            'error_type': type(e).__name__,
                            'error_message': str(e),
                            'model': fal_model,
                            'attempts': max_retries,
                        }
                        logger.error(f"✗ Scene {scene.scene_id} failed after {max_retries} attempts: {error_details}")
                        failed_scenes.append(error_details)

            # Update progress after each scene (successful or not)
            if success:
                job.completed_scenes = len(scene_images)
                progress = 35 + int(len(scene_images) / scene_count * 40)  # 35-75%
                job.progress = progress
                self.db.commit()

        # Fail-fast validation
        success_rate = len(scene_images) / scene_count if scene_count > 0 else 0
        logger.info(f"Image generation complete: {len(scene_images)}/{scene_count} succeeded ({success_rate:.1%})")

        if len(scene_images) == 0:
            raise Exception("All image generations failed. Cannot create video.")

        if success_rate < settings.IMAGE_GEN_MIN_SUCCESS_RATE:
            # Build error summary
            error_summary = "\n".join([
                f"  - Scene {e['scene_id']}: {e['error_type']} - {e['error_message'][:100]}"
                for e in failed_scenes[:5]  # Show first 5 errors
            ])
            if len(failed_scenes) > 5:
                error_summary += f"\n  ... and {len(failed_scenes) - 5} more errors"

            raise Exception(
                f"Too many image generation failures ({len(scene_images)}/{scene_count} succeeded, "
                f"minimum required: {settings.IMAGE_GEN_MIN_SUCCESS_RATE:.0%}):\n{error_summary}"
            )

        return scene_images

    def _calculate_scene_timings(
        self,
        canonical_script: CanonicalVideoScript,
        scene_images: Dict[int, str],
        audio_duration: float,
    ) -> List[SceneComposition]:
        """Calculate scene timings based on audio duration."""
        scenes = []
        total_script_duration = canonical_script.total_duration

        # Scale durations to match actual audio
        scale_factor = audio_duration / total_script_duration if total_script_duration > 0 else 1.0

        current_time = 0.0
        last_valid_image = None

        for i, scene in enumerate(canonical_script.scenes):
            image_url = scene_images.get(scene.scene_id, "")

            # Handle missing images
            if not image_url:
                if last_valid_image and settings.ALLOW_IMAGE_EXTENSION:
                    logger.warning(f"Scene {scene.scene_id} missing image, extending previous scene image")
                    image_url = last_valid_image
                else:
                    logger.warning(f"Scene {scene.scene_id} missing image, skipping scene")
                    continue
            else:
                last_valid_image = image_url

            scaled_duration = scene.duration * scale_factor
            motion_type = MOTION_TYPES[i % len(MOTION_TYPES)]

            scenes.append(SceneComposition(
                scene_id=scene.scene_id,
                image_url=image_url,
                narration=scene.narration,
                duration=scaled_duration,
                start_time=current_time,
                motion_type=motion_type,
            ))

            current_time += scaled_duration

        logger.info(f"Created {len(scenes)} scene compositions from {len(canonical_script.scenes)} total scenes")
        return scenes

    async def _upload_to_storage(self, file_path: Path, file_type: str) -> str:
        """Upload file to storage and return URL."""
        storage = get_storage()

        file_ext = file_path.suffix
        unique_id = str(uuid.uuid4())

        if file_type == "video":
            s3_key = f"{storage.PREFIX_FINAL_VIDEOS}/script-to-video/{unique_id}{file_ext}"
            content_type = "video/mp4"
        elif file_type == "thumbnail":
            s3_key = f"{storage.PREFIX_THUMBNAILS}/script-to-video/{unique_id}{file_ext}"
            content_type = "image/jpeg"
        else:
            s3_key = f"{storage.PREFIX_TEMP}/{unique_id}{file_ext}"
            content_type = None

        storage.upload_file(str(file_path), s3_key, content_type=content_type)
        url = storage.get_presigned_url(s3_key, expires_in=7 * 24 * 3600)

        logger.info(f"Uploaded {file_type}: {s3_key}")
        return url

    async def _generate_thumbnail(
        self,
        video_path: Path,
        scene_images: Dict[int, str],
    ) -> str:
        """Generate thumbnail from video or first scene image."""
        import tempfile
        import subprocess

        # Try to extract from video
        temp_dir = Path(tempfile.gettempdir()) / "clipking" / "thumbnails"
        temp_dir.mkdir(parents=True, exist_ok=True)
        thumb_path = temp_dir / f"thumb_{uuid.uuid4()}.jpg"

        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", str(video_path),
                "-vf", "thumbnail,scale=640:-1",
                "-frames:v", "1",
                str(thumb_path),
            ]
            subprocess.run(cmd, capture_output=True, timeout=30)

            if thumb_path.exists() and thumb_path.stat().st_size > 0:
                return await self._upload_to_storage(thumb_path, "thumbnail")
        except Exception as e:
            logger.warning(f"Failed to extract thumbnail: {e}")

        # Fallback to first scene image
        if scene_images:
            first_scene_id = min(scene_images.keys())
            return scene_images[first_scene_id]

        return ""


# ============================================
# Background Task Entry Point
# ============================================
async def process_script_to_video_job(job_id: uuid.UUID, db_url: str):
    """
    Background task entry point for processing script-to-video jobs.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        service = ScriptToVideoService(db)
        await service.process_job(job_id)
    finally:
        db.close()
