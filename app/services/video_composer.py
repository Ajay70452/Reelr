"""
Video Composer Service - Video Composition with FFmpeg

Handles:
- Scene sequencing with images
- ASS caption overlay with karaoke-style word highlighting
- Audio synchronization
- Ken Burns effects (pan/zoom) with super-resolution pre-scaling
- Final video encoding
"""

import logging
import subprocess
import json
import tempfile
import shutil
import uuid
import platform
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, asdict
import httpx

from app.core.config import settings
from app.services.deepgram_service import WordTimestamp, CaptionData

logger = logging.getLogger(__name__)


# ============================================
# Data Models
# ============================================
@dataclass
class SceneComposition:
    """A single scene ready for composition"""
    scene_id: int
    image_url: str
    image_path: Optional[Path] = None
    narration: str = ""
    duration: float = 3.0
    start_time: float = 0.0
    motion_type: str = "slow_zoom_in"


@dataclass
class VideoCompositionData:
    """Complete data for video composition"""
    scenes: List[SceneComposition]
    audio_path: Optional[Path] = None
    captions: Optional[CaptionData] = None
    aspect_ratio: str = "9:16"
    fps: int = 30
    total_duration: float = 0.0
    preset_style: Optional[str] = None


@dataclass
class CompositionResult:
    """Result of video composition"""
    video_path: Path
    duration: float
    resolution: tuple


# ============================================
# Motion Effects
# ============================================
MOTION_EFFECTS = {
    "slow_zoom_in": {
        "start_scale": 1.0,
        "end_scale": 1.35,
        "x_drift": 0,
        "y_drift": 0,
    },
    "slow_zoom_out": {
        "start_scale": 1.35,
        "end_scale": 1.0,
        "x_drift": 0,
        "y_drift": 0,
    },
    "pan_left": {
        "start_scale": 1.25,
        "end_scale": 1.3,
        "x_drift": 200,
        "y_drift": 0,
    },
    "pan_right": {
        "start_scale": 1.25,
        "end_scale": 1.3,
        "x_drift": -200,
        "y_drift": 0,
    },
    "pan_up": {
        "start_scale": 1.25,
        "end_scale": 1.3,
        "x_drift": 0,
        "y_drift": 150,
    },
    "pan_down": {
        "start_scale": 1.25,
        "end_scale": 1.3,
        "x_drift": 0,
        "y_drift": -150,
    },
    "drift": {
        "start_scale": 1.05,
        "end_scale": 1.3,
        "x_drift": 120,
        "y_drift": 80,
    },
}

# Scene transitions (cycled through automatically)
SCENE_TRANSITIONS = [
    "slideup",
    "slideleft",
    "fade",
    "slideright",
    "fadewhite",
    "zoomin",
    "smoothdown",
    "circlecrop",
]

TRANSITION_DURATION = 0.4  # seconds

# Super-resolution multiplier for Ken Burns pre-scaling
# Higher = sharper zooms but slower processing
SUPERRES_MULTIPLIER = 4


# ============================================
# Video Composer Service
# ============================================
class VideoComposer:
    """
    Service for composing final videos from scenes, audio, and captions.

    Uses FFmpeg for rendering with:
    - Ken Burns effects on images (with super-resolution pre-scaling)
    - ASS caption overlays with karaoke-style word highlighting
    - Audio synchronization
    """

    # Resolution presets
    RESOLUTIONS = {
        "9:16": (1080, 1920),  # Portrait (TikTok, Reels)
        "16:9": (1920, 1080),  # Landscape (YouTube)
        "1:1": (1080, 1080),   # Square (Instagram)
    }

    def __init__(self):
        self.ffmpeg_path = self._get_ffmpeg_path()

    def _get_ffmpeg_path(self) -> str:
        """Get FFmpeg executable path."""
        import shutil
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg:
            return ffmpeg

        # Check common Windows paths
        common_paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
        ]
        for path in common_paths:
            if Path(path).exists():
                return path

        return "ffmpeg"

    async def compose_video(
        self,
        composition: VideoCompositionData,
        output_path: Optional[Path] = None,
    ) -> CompositionResult:
        """
        Compose a complete video from scenes, audio, and captions.

        Pipeline:
        1. Download images
        2. Create scene clips (super-res pre-scale → zoompan → output res)
        3. Concatenate clips (stream copy, no re-encode)
        4. Add ASS captions with karaoke highlighting
        5. Add audio
        6. Final encode
        """
        temp_dir = Path(tempfile.mkdtemp(prefix="video_compose_"))

        try:
            width, height = self.RESOLUTIONS.get(
                composition.aspect_ratio, (1080, 1920)
            )

            # Step 1: Download all images
            await self._download_scene_images(composition.scenes, temp_dir)

            # Step 2: Create motion clips for each scene (with super-res)
            clip_paths = []
            clip_durations = []
            for i, scene in enumerate(composition.scenes):
                clip_path = await self._create_scene_clip(
                    scene=scene,
                    temp_dir=temp_dir,
                    width=width,
                    height=height,
                    fps=composition.fps,
                )
                clip_paths.append(clip_path)
                clip_durations.append(scene.duration)

            # Step 3: Join clips with xfade transitions
            concat_video = await self._concatenate_with_transitions(
                clip_paths=clip_paths,
                clip_durations=clip_durations,
                temp_dir=temp_dir,
            )

            # Step 4: Add captions if available (ASS with karaoke highlighting)
            has_captions = composition.captions and composition.captions.words
            logger.info(f"Caption check: has_captions={has_captions}, "
                       f"words={len(composition.captions.words) if composition.captions and composition.captions.words else 0}")
            if has_captions:
                video_with_captions = await self._add_captions(
                    video_path=concat_video,
                    captions=composition.captions,
                    temp_dir=temp_dir,
                    width=width,
                    height=height,
                    fps=composition.fps,
                )
            else:
                logger.warning("No caption data - skipping captions entirely")
                video_with_captions = concat_video

            # Step 5: Add audio if available
            if composition.audio_path and composition.audio_path.exists():
                final_video = await self._add_audio(
                    video_path=video_with_captions,
                    audio_path=composition.audio_path,
                    temp_dir=temp_dir,
                )
            else:
                final_video = video_with_captions

            # Step 6: Final encoding with optimization
            if output_path is None:
                output_path = temp_dir / f"final_{uuid.uuid4()}.mp4"

            await self._final_encode(
                input_path=final_video,
                output_path=output_path,
            )

            # Copy to permanent location if needed
            if not str(output_path).startswith(str(temp_dir)):
                final_output = output_path
            else:
                import tempfile as tf
                perm_dir = Path(tf.gettempdir()) / "clipking" / "output"
                perm_dir.mkdir(parents=True, exist_ok=True)
                final_output = perm_dir / f"video_{uuid.uuid4()}.mp4"
                shutil.copy2(output_path, final_output)
                output_path = final_output

            return CompositionResult(
                video_path=output_path,
                duration=composition.total_duration,
                resolution=(width, height),
            )

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # ============================================
    # Image Download
    # ============================================
    async def _download_scene_images(
        self,
        scenes: List[SceneComposition],
        temp_dir: Path,
    ):
        """Download images for all scenes."""
        async with httpx.AsyncClient(timeout=60) as client:
            for i, scene in enumerate(scenes):
                if not scene.image_url:
                    continue

                image_path = temp_dir / f"scene_{i}.jpg"

                try:
                    response = await client.get(scene.image_url)
                    response.raise_for_status()
                    image_path.write_bytes(response.content)
                    scene.image_path = image_path
                except Exception as e:
                    logger.error(f"Failed to download image for scene {i}: {e}")

    # ============================================
    # Scene Clip Creation (with super-res pre-scaling)
    # ============================================
    async def _create_scene_clip(
        self,
        scene: SceneComposition,
        temp_dir: Path,
        width: int,
        height: int,
        fps: int,
    ) -> Path:
        """
        Create a video clip from a scene image with Ken Burns motion.

        Uses super-resolution pre-scaling: the image is first scaled to 4x
        the output resolution before zoompan, giving much sharper results
        during zoom since FFmpeg has more pixels to work with.
        """
        if not scene.image_path or not scene.image_path.exists():
            raise ValueError(f"No image for scene {scene.scene_id}")

        output_path = temp_dir / f"clip_{scene.scene_id}.mp4"
        total_frames = int(scene.duration * fps)

        # Get motion effect parameters
        effect = MOTION_EFFECTS.get(scene.motion_type, MOTION_EFFECTS["slow_zoom_in"])

        # Super-resolution dimensions (4x output for sharp zooms)
        sr_width = width * SUPERRES_MULTIPLIER
        sr_height = height * SUPERRES_MULTIPLIER

        # Build zoompan filter at super-res, then scale down to output
        zoompan_filter = self._build_zoompan_filter(
            effect=effect,
            total_frames=total_frames,
            width=sr_width,
            height=sr_height,
            fps=fps,
        )

        # Pre-scale image to super-res → zoompan at super-res → scale to output
        vf = f"scale={sr_width}:{sr_height}:force_original_aspect_ratio=increase,crop={sr_width}:{sr_height},{zoompan_filter},scale={width}:{height}"

        cmd = [
            self.ffmpeg_path, "-y",
            "-loop", "1",
            "-i", str(scene.image_path),
            "-vf", vf,
            "-t", str(scene.duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode != 0:
            logger.warning(f"Super-res clip failed, falling back to standard: {result.stderr[-300:]}")
            # Fallback: standard resolution (no pre-scaling)
            return await self._create_scene_clip_standard(
                scene, temp_dir, width, height, fps, effect, total_frames
            )

        return output_path

    async def _create_scene_clip_standard(
        self,
        scene: SceneComposition,
        temp_dir: Path,
        width: int,
        height: int,
        fps: int,
        effect: dict,
        total_frames: int,
    ) -> Path:
        """Fallback: create clip without super-res pre-scaling."""
        output_path = temp_dir / f"clip_{scene.scene_id}_std.mp4"

        zoompan_filter = self._build_zoompan_filter(
            effect=effect,
            total_frames=total_frames,
            width=width,
            height=height,
            fps=fps,
        )

        cmd = [
            self.ffmpeg_path, "-y",
            "-loop", "1",
            "-i", str(scene.image_path),
            "-vf", zoompan_filter,
            "-t", str(scene.duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode != 0:
            logger.error(f"FFmpeg clip creation failed: {result.stderr[-500:]}")
            raise Exception(f"Failed to create clip for scene {scene.scene_id}")

        return output_path

    def _build_zoompan_filter(
        self,
        effect: dict,
        total_frames: int,
        width: int,
        height: int,
        fps: int,
    ) -> str:
        """Build FFmpeg zoompan filter string with smooth easing."""
        start_scale = effect["start_scale"]
        end_scale = effect["end_scale"]
        x_drift = effect["x_drift"]
        y_drift = effect["y_drift"]

        # Progress through animation (0 to 1)
        # Using smoothstep for ease-in-out: t = t*t*(3-2*t)
        progress = f"(on/{total_frames})"
        eased_progress = f"({progress}*{progress}*(3-2*{progress}))"

        # z: zoom factor, x/y: pan position, d: duration in frames
        zoom_diff = end_scale - start_scale
        if zoom_diff != 0:
            zoom_expr = f"{start_scale}+({end_scale}-{start_scale})*{eased_progress}"
        else:
            zoom_expr = str(start_scale)

        # Center + drift with easing
        if x_drift:
            x_expr = f"iw/2-(iw/zoom/2)+{x_drift}*{eased_progress}"
        else:
            x_expr = "iw/2-(iw/zoom/2)"

        if y_drift:
            y_expr = f"ih/2-(ih/zoom/2)+{y_drift}*{eased_progress}"
        else:
            y_expr = "ih/2-(ih/zoom/2)"

        return f"zoompan=z='{zoom_expr}':x='{x_expr}':y='{y_expr}':d={total_frames}:s={width}x{height}:fps={fps}"

    # ============================================
    # Concatenation with xfade transitions
    # ============================================
    async def _concatenate_with_transitions(
        self,
        clip_paths: List[Path],
        clip_durations: List[float],
        temp_dir: Path,
    ) -> Path:
        """
        Join scene clips with xfade transitions between them.

        Cycles through SCENE_TRANSITIONS list. Each transition overlaps
        clips by TRANSITION_DURATION seconds.

        Falls back to simple concatenation if xfade fails.
        """
        if len(clip_paths) < 2:
            # Single clip - no transitions needed, just return it
            return clip_paths[0]

        output_path = temp_dir / "concat_video.mp4"
        n = len(clip_paths)
        trans_dur = TRANSITION_DURATION

        # Build inputs
        inputs = []
        for path in clip_paths:
            inputs.extend(["-i", str(path)])

        # Build xfade filter chain
        # [0][1]xfade=...:[v01]; [v01][2]xfade=...:[v02]; ...
        filter_parts = []
        for i in range(n - 1):
            transition = SCENE_TRANSITIONS[i % len(SCENE_TRANSITIONS)]

            # Calculate offset: where in the output timeline this transition starts
            # offset = sum of all clip durations up to clip[i] - (number of previous transitions) * trans_dur - trans_dur
            offset = sum(clip_durations[:i + 1]) - (i + 1) * trans_dur
            offset = max(offset, 0.1)  # Safety: never negative

            # Input/output labels
            if i == 0:
                in1 = f"[{i}]"
            else:
                in1 = f"[v{i - 1}]"

            in2 = f"[{i + 1}]"

            if i == n - 2:
                out_label = "[vout]"
            else:
                out_label = f"[v{i}]"

            filter_parts.append(
                f"{in1}{in2}xfade=transition={transition}:duration={trans_dur}:offset={offset:.3f}{out_label}"
            )

        filter_complex = ";".join(filter_parts)

        cmd = [
            self.ffmpeg_path, "-y",
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_path),
        ]

        transitions_used = [SCENE_TRANSITIONS[i % len(SCENE_TRANSITIONS)] for i in range(n - 1)]
        logger.info(f"Joining {n} clips with transitions: {transitions_used}")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 1000:
            logger.info(f"Clips joined with {n - 1} xfade transitions")
            return output_path

        # Fallback: simple concatenation without transitions
        logger.warning(f"xfade transitions failed, falling back to simple concat: {result.stderr[-400:]}")
        return await self._concatenate_clips_simple(clip_paths, temp_dir)

    async def _concatenate_clips_simple(
        self,
        clip_paths: List[Path],
        temp_dir: Path,
    ) -> Path:
        """Fallback: simple concatenation without transitions."""
        output_path = temp_dir / "concat_video_simple.mp4"

        concat_file = temp_dir / "concat.txt"
        with open(concat_file, "w") as f:
            for path in clip_paths:
                escaped = str(path).replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        # Try stream copy first
        cmd = [
            self.ffmpeg_path, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            "-movflags", "+faststart",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0 and output_path.exists():
            logger.info(f"Concatenated {len(clip_paths)} clips (stream copy fallback)")
            return output_path

        # Re-encode fallback
        output_path2 = temp_dir / "concat_video_re.mp4"
        cmd2 = [
            self.ffmpeg_path, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            str(output_path2),
        ]

        result2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=300)
        if result2.returncode != 0:
            logger.error(f"All concat methods failed: {result2.stderr[-500:]}")
            raise Exception("Failed to concatenate clips")

        logger.info(f"Concatenated {len(clip_paths)} clips (re-encode fallback)")
        return output_path2

    # ============================================
    # ASS Caption System (Karaoke-style highlighting)
    # ============================================
    async def _add_captions(
        self,
        video_path: Path,
        captions: CaptionData,
        temp_dir: Path,
        width: int,
        height: int,
        fps: int,
    ) -> Path:
        """
        Add captions with fallback chain:
        1. ASS filter (ass=) - best quality, karaoke highlighting
        2. Subtitles filter (subtitles=) - good quality, karaoke highlighting
        3. Drawtext filter - basic but universally compatible
        """
        # Generate ASS subtitle file
        ass_file = self._generate_ass_file(
            captions=captions,
            temp_dir=temp_dir,
            width=width,
            height=height,
        )

        if not ass_file:
            logger.warning("No caption data available, skipping captions")
            return video_path

        logger.info(f"Adding captions ({len(captions.words)} words)")

        # --- Attempt 1: ASS filter (using relative path to avoid Windows colon issues) ---
        output_path = temp_dir / "video_with_captions.mp4"

        # Use just the filename since video and ASS are in the same temp_dir
        # Windows absolute paths with drive letters (C:\...) break FFmpeg's ass= filter
        ass_filename = ass_file.name

        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-vf", f"ass={ass_filename}",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300,
            cwd=str(temp_dir),  # Run from temp dir so relative ASS path works
        )
        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 1000:
            logger.info("Captions added via ASS filter (karaoke style)")
            return output_path

        logger.warning(f"ASS filter failed (rc={result.returncode}), trying subtitles filter...")

        # --- Attempt 2: subtitles filter ---
        result2 = await self._add_captions_subtitles_fallback(
            video_path, ass_file, temp_dir, width, height
        )
        if result2 != video_path:
            return result2

        # --- Attempt 3: drawtext filter (universal fallback) ---
        logger.warning("Subtitles filter also failed, trying drawtext fallback...")
        return await self._add_captions_drawtext_fallback(
            video_path, captions, temp_dir, width, height
        )

    def _generate_ass_file(
        self,
        captions: CaptionData,
        temp_dir: Path,
        width: int,
        height: int,
    ) -> Optional[Path]:
        """
        Generate an ASS subtitle file with karaoke-style word highlighting.

        Each caption chunk shows all words, with the current word highlighted
        in a bright accent color while others remain white.
        """
        words = captions.words
        if not words:
            return None

        ass_file = temp_dir / "captions.ass"

        # Style parameters
        font_size = int(height * 0.045)
        margin_v = int(height * 0.10)  # Bottom margin
        font_name = "Arial"
        if platform.system() != "Windows":
            font_name = "DejaVu Sans"

        # ASS color format: &HAABBGGRR (hex, BGR order)
        # White: &H00FFFFFF, Yellow highlight: &H0000FFFF, Black outline: &H00000000
        primary_color = "&H00FFFFFF"      # White (default words)
        highlight_color = "&H0000FFFF"    # Yellow (current word)
        outline_color = "&H00000000"      # Black outline
        shadow_color = "&H80000000"       # Semi-transparent black shadow

        # ASS header
        ass_content = f"""[Script Info]
Title: ClipKing Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},{highlight_color},{outline_color},{shadow_color},-1,0,0,0,100,100,0,0,1,3,1.5,2,20,20,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        # Group words into chunks (3-5 words per line for readability)
        chunks = self._group_words_into_chunks(words, max_chars=35)

        # Generate karaoke events for each chunk
        for chunk in chunks:
            start_time = self._seconds_to_ass_time(chunk[0].start)
            end_time = self._seconds_to_ass_time(chunk[-1].end)

            # Build karaoke text: highlight each word as it's spoken
            text_parts = []
            for i, word in enumerate(chunk):
                # Duration of this word in centiseconds for \k tag
                word_duration_cs = int((word.end - word.start) * 100)
                # Clamp minimum duration
                word_duration_cs = max(word_duration_cs, 10)

                # \kf = smooth fill karaoke (fills word over duration)
                # Before the word is spoken: primary color (white)
                # As it's spoken: secondary color (yellow highlight)
                text_parts.append(f"{{\\kf{word_duration_cs}}}{word.word}")

            karaoke_text = " ".join(text_parts)

            # Add dialogue event
            ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{karaoke_text}\n"

        ass_file.write_text(ass_content, encoding="utf-8-sig")
        logger.info(f"Generated ASS file: {len(chunks)} caption events, karaoke style")
        return ass_file

    def _group_words_into_chunks(
        self,
        words: List[WordTimestamp],
        max_chars: int = 35,
    ) -> List[List[WordTimestamp]]:
        """
        Group words into display chunks respecting character limits.

        Smarter than fixed 4-word chunks: respects natural word boundaries
        and keeps lines at a readable length.
        """
        chunks = []
        current_chunk = []
        current_chars = 0

        for word in words:
            word_len = len(word.word)

            # Start new chunk if adding this word exceeds limit
            # (but always include at least 1 word per chunk)
            if current_chunk and (current_chars + word_len + 1 > max_chars or len(current_chunk) >= 5):
                chunks.append(current_chunk)
                current_chunk = []
                current_chars = 0

            current_chunk.append(word)
            current_chars += word_len + 1  # +1 for space

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def _seconds_to_ass_time(self, seconds: float) -> str:
        """Convert seconds to ASS time format (H:MM:SS.cc)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centisecs = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"

    async def _add_captions_subtitles_fallback(
        self,
        video_path: Path,
        ass_file: Path,
        temp_dir: Path,
        width: int,
        height: int,
    ) -> Path:
        """Fallback: use subtitles= filter instead of ass= filter."""
        output_path = temp_dir / "video_with_captions_sub.mp4"
        ass_filename = ass_file.name

        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-vf", f"subtitles={ass_filename}",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300,
            cwd=str(temp_dir),
        )
        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 1000:
            logger.info("Captions added via subtitles filter")
            return output_path

        stderr_lines = result.stderr.strip().split('\n')
        error_lines = [l for l in stderr_lines if any(k in l.lower() for k in ['error', 'no such', 'invalid', 'cannot', 'failed'])]
        logger.error(f"Subtitles fallback failed: {' | '.join(error_lines) or result.stderr[-500:]}")
        return video_path

    async def _add_captions_drawtext_fallback(
        self,
        video_path: Path,
        captions: CaptionData,
        temp_dir: Path,
        width: int,
        height: int,
    ) -> Path:
        """Last resort: use drawtext filter for captions (universally compatible)."""
        output_path = temp_dir / "video_with_captions_dt.mp4"

        words = captions.words
        if not words:
            return video_path

        font_size = int(height * 0.045)
        y_pos = int(height * 0.82)
        fontfile = self._get_font_path()

        # Group into chunks
        chunks = self._group_words_into_chunks(words, max_chars=35)

        # Build drawtext filters
        filters = []
        for chunk in chunks:
            start_time = chunk[0].start
            end_time = chunk[-1].end
            text = " ".join(w.word for w in chunk)

            # Escape for FFmpeg drawtext
            text = text.replace("\\", "\\\\")
            text = text.replace("'", "\\'")
            text = text.replace(":", "\\:")
            text = text.replace("%", "%%")

            dt = (
                f"drawtext=text='{text}'"
                f":fontfile='{fontfile}'"
                f":fontsize={font_size}"
                f":fontcolor=white"
                f":borderw=3"
                f":bordercolor=black"
                f":shadowx=2:shadowy=2:shadowcolor=black@0.6"
                f":x=(w-text_w)/2"
                f":y={y_pos}"
                f":enable='between(t,{start_time:.3f},{end_time:.3f})'"
            )
            filters.append(dt)

        drawtext_filter = ",".join(filters)

        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-vf", drawtext_filter,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 1000:
            logger.info("Captions added via drawtext fallback")
            return output_path

        logger.error(f"ALL caption methods failed. Last error: {result.stderr[-300:]}")
        logger.warning("Returning video without captions")
        return video_path

    def _get_font_path(self) -> str:
        """Get a usable font path for FFmpeg drawtext, escaped for filter syntax."""
        if platform.system() == "Windows":
            candidates = [
                r"C:\Windows\Fonts\arial.ttf",
                r"C:\Windows\Fonts\segoeui.ttf",
                r"C:\Windows\Fonts\calibri.ttf",
            ]
            for font in candidates:
                if Path(font).exists():
                    return font.replace("\\", "/").replace(":", "\\:")
            return "C\\:/Windows/Fonts/arial.ttf"
        else:
            candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
            ]
            for font in candidates:
                if Path(font).exists():
                    return font
            return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    # ============================================
    # Audio
    # ============================================
    async def _add_audio(
        self,
        video_path: Path,
        audio_path: Path,
        temp_dir: Path,
    ) -> Path:
        """Add audio track to video."""
        output_path = temp_dir / "video_with_audio.mp4"

        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            logger.warning(f"Audio merge failed: {result.stderr[:200]}")
            return video_path

        return output_path

    # ============================================
    # Final Encoding
    # ============================================
    async def _final_encode(
        self,
        input_path: Path,
        output_path: Path,
    ):
        """Final encode with optimization for web playback."""
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(input_path),
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            logger.error(f"Final encode failed: {result.stderr[:500]}")
            raise Exception("Failed to encode final video")

    # ============================================
    # Remotion Data (for future Remotion integration)
    # ============================================
    def prepare_remotion_data(
        self,
        composition: VideoCompositionData,
    ) -> dict:
        """Prepare composition data in Remotion-compatible format."""
        width, height = self.RESOLUTIONS.get(composition.aspect_ratio, (1080, 1920))

        scenes_data = []
        for scene in composition.scenes:
            scenes_data.append({
                "sceneId": scene.scene_id,
                "imageUrl": scene.image_url,
                "narration": scene.narration,
                "duration": scene.duration,
                "startTime": scene.start_time,
                "motionType": scene.motion_type,
            })

        captions_data = []
        if composition.captions:
            for word in composition.captions.words:
                captions_data.append({
                    "word": word.word,
                    "start": word.start,
                    "end": word.end,
                })

        return {
            "scenes": scenes_data,
            "captions": captions_data,
            "audio": str(composition.audio_path) if composition.audio_path else None,
            "preset": composition.preset_style,
            "aspectRatio": composition.aspect_ratio,
            "fps": composition.fps,
            "width": width,
            "height": height,
            "totalDuration": composition.total_duration,
        }


# ============================================
# Singleton Instance
# ============================================
_composer: Optional[VideoComposer] = None


def get_video_composer() -> VideoComposer:
    """Get the singleton VideoComposer instance."""
    global _composer
    if _composer is None:
        _composer = VideoComposer()
    return _composer
