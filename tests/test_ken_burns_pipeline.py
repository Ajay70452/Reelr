"""
Unit tests for the Ken Burns & FFmpeg pipeline upgrades.

Since the workers import `rq` (Redis Queue) which is not installed in the
local dev environment, we mock it at sys.modules level before importing
the actual modules under test.

Tests:
  - apply_ken_burns_effect: verifies pre-scale + correct zoompan formulas per effect type
  - build_duck_filter: verifies expression-based volume ducking
  - _extract_speech_regions: verifies word timing merging logic
  - concat_videos_simple: verifies single-quote escaping in concat file paths
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# ============================================
# Mock all heavy infrastructure imports before
# any app.workers.* module is loaded.
# This is needed because rq, Redis, and postgres
# are not available in the local dev environment.
# ============================================
_mock_rq_job = MagicMock()
sys.modules.setdefault("rq", MagicMock(get_current_job=MagicMock(return_value=None)))
sys.modules.setdefault("rq.job", MagicMock(Job=MagicMock()))
sys.modules.setdefault("app.queue", MagicMock())
sys.modules.setdefault("app.queue.queues", MagicMock(QueueNames=MagicMock(), enqueue_job=MagicMock()))
sys.modules.setdefault("app.queue.job_manager", MagicMock(PipelineStage=MagicMock(), enqueue_next_stage=MagicMock()))
sys.modules.setdefault("app.core", MagicMock())
sys.modules.setdefault("app.core.config", MagicMock(settings=MagicMock(
    FAL_KEY="test_key",
    PEXELS_API_KEY="test_key",
    ELEVENLABS_API_KEY="test_key",
    OPENAI_API_KEY="test_key",
    TEMP_DIR="/tmp",
    S3_BUCKET_NAME="test-bucket",
)))
sys.modules.setdefault("app.services", MagicMock())
sys.modules.setdefault("app.services.storage", MagicMock(get_storage=MagicMock()))
sys.modules.setdefault("app.services.model_router", MagicMock(
    get_model_config=MagicMock(),
    get_negative_prompt=MagicMock(return_value=""),
    build_image_prompt=MagicMock(side_effect=lambda p, _: p),
    get_video_model_for_frontend=MagicMock(),
    get_image_to_video_model=MagicMock(),
    ModelConfig=MagicMock(),
    VIDEO_MODELS={},
    IMAGE_TO_VIDEO_MODELS={},
))
sys.modules.setdefault("app.db", MagicMock())
sys.modules.setdefault("app.db.database", MagicMock(SessionLocal=MagicMock()))
sys.modules.setdefault("app.db.models", MagicMock(VideoJob=MagicMock()))
sys.modules.setdefault("fal_client", MagicMock())


# ============================================
# Ken Burns Effect Tests
# ============================================
class TestApplyKenBurnsEffect:
    """Tests for the upgraded apply_ken_burns_effect() function."""

    def _get_ffmpeg_cmd(self, effect_type: str, duration: float = 5.0, fps: int = 30, width: int = 1080, height: int = 1920):
        """Call apply_ken_burns_effect with mocked subprocess, return the FFmpeg command string."""
        from app.workers.visual_worker import apply_ken_burns_effect

        mock_result = MagicMock(returncode=0, stderr="")
        with patch("subprocess.run", return_value=mock_result) as mock_run, \
             patch("pathlib.Path.mkdir"):
            apply_ken_burns_effect(
                image_path="/tmp/test_image.png",
                output_path="/tmp/test_output.mp4",
                duration=duration,
                effect_type=effect_type,
                fps=fps,
                width=width,
                height=height,
            )
            return " ".join(mock_run.call_args[0][0])

    def test_zoom_out_has_prescale(self):
        """zoom_out must pre-scale image to 115% before zoompan (prevents black edges)."""
        cmd = self._get_ffmpeg_cmd("zoom_out")
        assert "scale=1242:2208" in cmd

    def test_zoom_out_formula(self):
        """zoom_out: z starts at 1.15 and decreases over time."""
        cmd = self._get_ffmpeg_cmd("zoom_out")
        assert "1.15-0.15*on/" in cmd

    def test_zoom_in_has_prescale(self):
        """zoom_in must pre-scale image to 115% before zoompan."""
        cmd = self._get_ffmpeg_cmd("zoom_in")
        assert "scale=1242:2208" in cmd

    def test_zoom_in_formula(self):
        """zoom_in: z starts at 1.0 and increases over time."""
        cmd = self._get_ffmpeg_cmd("zoom_in")
        assert "1.0+0.15*on/" in cmd

    def test_pan_right_has_prescale(self):
        """pan_right must pre-scale image to 115% before zoompan."""
        cmd = self._get_ffmpeg_cmd("pan_right")
        assert "scale=1242:2208" in cmd

    def test_pan_right_formula(self):
        """pan_right: constant zoom at 1.15 with pan formula."""
        cmd = self._get_ffmpeg_cmd("pan_right")
        assert "z=1.15" in cmd
        assert "0.15*iw*on/" in cmd

    def test_pan_left_formula(self):
        """pan_left: constant zoom at 1.15 with reverse pan formula."""
        cmd = self._get_ffmpeg_cmd("pan_left")
        assert "z=1.15" in cmd
        assert "0.15*iw*(1-on/" in cmd

    def test_output_resolution_matches_request(self):
        """zoompan s= param must match the requested output dimensions."""
        cmd = self._get_ffmpeg_cmd("zoom_out")
        assert "1080x1920" in cmd

    def test_16_9_prescale(self):
        """16:9 (1920x1080) should pre-scale to 2208x1242."""
        cmd = self._get_ffmpeg_cmd("zoom_in", width=1920, height=1080)
        assert "scale=2208:1242" in cmd
        assert "1920x1080" in cmd

    def test_unknown_effect_falls_back_gracefully(self):
        """An unrecognized effect_type falls back and uses zoom_out formula."""
        cmd = self._get_ffmpeg_cmd("does_not_exist")
        assert "1.15-0.15*on/" in cmd

    def test_fps_flag_present(self):
        """FFmpeg command must include the -r fps flag explicitly."""
        cmd = self._get_ffmpeg_cmd("zoom_out", fps=24)
        assert "-r 24" in cmd

    def test_yuv420p_format(self):
        """Video output must use yuv420p for maximum compatibility."""
        cmd = self._get_ffmpeg_cmd("zoom_out")
        assert "yuv420p" in cmd

    def test_loop_input_flag(self):
        """FFmpeg must use -loop 1 to treat the image as a looped input."""
        cmd = self._get_ffmpeg_cmd("zoom_out")
        assert "-loop 1" in cmd


# ============================================
# KEN_BURNS_EFFECTS Cycle Tests
# ============================================
class TestKenBurnsEffectsCycle:
    def test_effects_list_length(self):
        from app.workers.visual_worker import KEN_BURNS_EFFECTS
        assert len(KEN_BURNS_EFFECTS) == 3

    def test_contains_all_three_types(self):
        from app.workers.visual_worker import KEN_BURNS_EFFECTS
        assert "zoom_out" in KEN_BURNS_EFFECTS
        assert "zoom_in" in KEN_BURNS_EFFECTS
        assert "pan_right" in KEN_BURNS_EFFECTS

    def test_cycle_covers_all_effects(self):
        from app.workers.visual_worker import KEN_BURNS_EFFECTS
        seen = set()
        for i in range(len(KEN_BURNS_EFFECTS) * 3):
            seen.add(KEN_BURNS_EFFECTS[i % len(KEN_BURNS_EFFECTS)])
        assert seen == set(KEN_BURNS_EFFECTS)


# ============================================
# build_duck_filter Tests
# ============================================
class TestBuildDuckFilter:

    def f(self, regions, **kwargs):
        from app.workers.audio_worker import build_duck_filter
        return build_duck_filter(regions, **kwargs)

    def test_empty_regions_returns_static_volume(self):
        result = self.f([])
        assert result == "volume=0.25"

    def test_single_region_has_between(self):
        result = self.f([(1.0, 3.0)])
        assert "between(t," in result

    def test_duck_level_in_output(self):
        result = self.f([(1.0, 5.0)])
        assert "0.12" in result

    def test_base_level_in_output(self):
        result = self.f([(1.0, 5.0)])
        assert "0.25" in result

    def test_eval_frame_present(self):
        result = self.f([(1.0, 5.0)])
        assert ":eval=frame" in result

    def test_buffer_shifts_start(self):
        result = self.f([(2.0, 4.0)], buffer=0.5)
        assert "between(t,1.50,4.50)" in result

    def test_buffer_clamps_to_zero(self):
        result = self.f([(0.1, 2.0)], buffer=0.5)
        assert "between(t,0.00," in result

    def test_multiple_regions_joined_with_plus(self):
        result = self.f([(1.0, 2.0), (5.0, 7.0)])
        assert result.count("between(t,") == 2
        assert "+" in result

    def test_custom_levels(self):
        result = self.f([(1.0, 3.0)], duck_level=0.05, base_level=0.40)
        assert "0.05" in result
        assert "0.4" in result  # Python f-string renders 0.40 as '0.4'

    def test_if_expression_structure(self):
        result = self.f([(5.0, 10.0)])
        assert "if(" in result
        assert ", 0.12, 0.25)" in result

    def test_output_starts_with_volume(self):
        result = self.f([(1.0, 3.0)])
        assert result.startswith("volume=")


# ============================================
# _extract_speech_regions Tests
# ============================================
class TestExtractSpeechRegions:

    def f(self, word_timings, **kwargs):
        from app.workers.audio_worker import _extract_speech_regions
        return _extract_speech_regions(word_timings, **kwargs)

    def test_empty_returns_empty(self):
        assert self.f([]) == []

    def test_single_word_one_region(self):
        regions = self.f([{"start": 1.0, "end": 1.5}])
        assert len(regions) == 1
        assert regions[0] == (1.0, 1.5)

    def test_close_words_merge(self):
        """Words within 0.5s gap should merge into one region."""
        words = [
            {"start": 0.0, "end": 0.5},
            {"start": 0.7, "end": 1.2},
            {"start": 1.4, "end": 2.0},
        ]
        regions = self.f(words)
        assert len(regions) == 1
        assert regions[0][0] == pytest.approx(0.0)
        assert regions[0][1] == pytest.approx(2.0)

    def test_large_gap_splits_regions(self):
        """A gap > threshold should produce separate regions."""
        words = [
            {"start": 0.0, "end": 1.0},
            {"start": 3.0, "end": 4.0},  # 2s gap
        ]
        regions = self.f(words, gap_threshold=0.5)
        assert len(regions) == 2
        assert regions[0] == (0.0, 1.0)
        assert regions[1] == (3.0, 4.0)

    def test_custom_gap_threshold(self):
        """A tighter gap threshold should split more aggressively."""
        words = [
            {"start": 0.0, "end": 1.0},
            {"start": 1.3, "end": 2.0},  # 0.3s gap
        ]
        regions_loose = self.f(words, gap_threshold=0.5)  # merged
        regions_tight = self.f(words, gap_threshold=0.2)  # split
        assert len(regions_loose) == 1
        assert len(regions_tight) == 2


# ============================================
# Concat Path Escaping Tests
# ============================================
class TestConcatVideoSimplePathEscaping:
    """Tests that concat_videos_simple properly escapes single quotes in paths."""

    def _get_concat_file_content(self, paths):
        """Capture the content written to the concat file without running ffmpeg."""
        import io
        from app.workers.render_worker import concat_videos_simple

        written_lines = []
        original_open = open

        class FakeFile:
            def write(self, s): written_lines.append(s)
            def __enter__(self): return self
            def __exit__(self, *a): pass

        def fake_open(path, mode="r", **kwargs):
            if "concat.txt" in str(path) and "w" in mode:
                return FakeFile()
            return original_open(path, mode, **kwargs)

        mock_result = MagicMock(returncode=0, stderr="")
        with patch("subprocess.run", return_value=mock_result), \
             patch("pathlib.Path.mkdir"), \
             patch("os.remove"), \
             patch("builtins.open", side_effect=fake_open):
            try:
                concat_videos_simple(paths, "/tmp/test_output.mp4")
            except Exception:
                pass  # OK, we just want to capture the write

        return "".join(written_lines)

    def test_normal_path_unchanged(self):
        content = self._get_concat_file_content(["/tmp/clip_a.mp4"])
        assert "/tmp/clip_a.mp4" in content

    def test_path_with_single_quote_is_escaped(self):
        content = self._get_concat_file_content(["/tmp/it's_a_clip.mp4"])
        # The properly escaped form must appear in the file
        assert "it'\\''s_a_clip.mp4" in content

    def test_file_prefix_each_line(self):
        content = self._get_concat_file_content(["/tmp/scene_1.mp4"])
        assert "file '" in content

    def test_multiple_paths_multiple_lines(self):
        content = self._get_concat_file_content(["/tmp/a.mp4", "/tmp/b.mp4", "/tmp/c.mp4"])
        lines = [l for l in content.split("\n") if l.strip()]
        assert len(lines) == 3
