"""
Gemini Service - Script Enhancement & Normalization

Uses Google Gemini API to convert raw user scripts into
structured, machine-safe video scripts.
"""

import logging
import json
import re
from typing import List, Optional
from dataclasses import dataclass, asdict
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# Data Models
# ============================================
class SceneSchema(BaseModel):
    """Schema for a single scene in the canonical video script"""
    scene_id: int
    narration: str
    visual_description: str
    duration: float


class CanonicalVideoScript(BaseModel):
    """The normalized, machine-safe video script"""
    scenes: List[SceneSchema]
    total_duration: float
    scene_count: int


@dataclass
class PresetContext:
    """Context from the selected preset"""
    style_prompt: str
    tone_modifiers: Optional[str] = None
    negative_prompt: Optional[str] = None


DURATION_TO_SCENES = {30: 4, 45: 5, 60: 6}


def _scenes_for_duration(target_duration: Optional[float]) -> int:
    """Get exact scene count based on duration. Strict mapping, no guessing."""
    if target_duration:
        dur = int(target_duration)
        return DURATION_TO_SCENES.get(dur, 4)
    return 4  # Default to 4 if no duration specified


# ============================================
# Gemini Service
# ============================================
class GeminiService:
    """
    Service for script enhancement and normalization using Google Gemini.

    Converts messy human input into structured, machine-safe data.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self._client = None

    @property
    def client(self):
        """Lazy-load Gemini client (new google.genai SDK)"""
        current_key = settings.GEMINI_API_KEY
        if self._client is None or current_key != self.api_key:
            try:
                from google import genai
                self.api_key = current_key
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError("google-genai package not installed. Run: uv pip install google-genai")
        return self._client

    async def enhance_script(
        self,
        raw_script: str,
        preset_context: Optional[PresetContext] = None,
        target_duration: Optional[float] = None,
        aspect_ratio: str = "9:16",
    ) -> CanonicalVideoScript:
        """
        Enhance and normalize a raw script into a canonical video script.
        """
        target_scenes = _scenes_for_duration(target_duration)
        max_scenes = target_scenes + 1  # Allow 1 buffer

        logger.info(f"Script: {len(raw_script.split())} words, duration: {target_duration}s → {target_scenes} scenes")

        # Read API key fresh from settings (singleton may have stale key)
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("GEMINI_API_KEY not set, using fallback parser")
            return self._fallback_parse(raw_script, target_scenes, preset_context)

        try:
            prompt = self._build_enhancement_prompt(
                raw_script=raw_script,
                preset_context=preset_context,
                target_scenes=target_scenes,
                target_duration=target_duration,
                aspect_ratio=aspect_ratio,
            )

            # Call Gemini 2.5 Flash with JSON output
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.7,
                }
            )

            result = json.loads(response.text)
            script = self._parse_gemini_response(result)

            # Validate: Gemini should return at least 3 scenes
            if script.scene_count < 3:
                logger.warning(f"Gemini returned only {script.scene_count} scenes, using fallback parser")
                return self._fallback_parse(raw_script, target_scenes, preset_context)

            # CRITICAL: Enforce hard limit on scene count
            if len(script.scenes) > max_scenes:
                logger.warning(f"Gemini generated {len(script.scenes)} scenes, truncating to {max_scenes}")
                script.scenes = script.scenes[:max_scenes]
                script.scene_count = len(script.scenes)
                script.total_duration = sum(s.duration for s in script.scenes)

            logger.info(f"Script enhanced via Gemini: {script.scene_count} scenes (target: {target_scenes})")
            return script

        except Exception as e:
            logger.error(f"Gemini enhancement failed: {e}")
            return self._fallback_parse(raw_script, target_scenes, preset_context)

    def _build_enhancement_prompt(
        self,
        raw_script: str,
        preset_context: Optional[PresetContext],
        target_scenes: int,
        target_duration: Optional[float],
        aspect_ratio: str,
    ) -> str:
        """Build the prompt for Gemini script enhancement."""

        style_hint = ""
        if preset_context:
            style_hint = f"""
- Visual Style: {preset_context.style_prompt}
- Tone: {preset_context.tone_modifiers or 'Not specified'}"""

        duration_hint = ""
        if target_duration:
            duration_hint = f"\n- Target total duration: {target_duration} seconds"

        scene_count_rule = f"MUST generate EXACTLY {target_scenes} scenes"

        return f"""You are an expert at two things: (1) writing voiceover narration and (2) writing image generation prompts for Flux AI.

Your job: convert the user's raw script into a structured video script with clean narration and high-quality Flux image prompts.

The user may provide a formatted script with "Scene", "Visual", "Voiceover" labels, OR just raw text. Either way, output clean structured data.

═══ NARRATION RULES (CRITICAL) ═══
- You MUST use ALL of the user's narration/voiceover text. Do NOT cut, summarize, or skip any part of their script.
- Distribute the COMPLETE script text across all {target_scenes} scenes — every sentence must appear in exactly one scene's narration.
- Clean up labels ("Scene 1:", "Visual:", "Voiceover:") but keep all the actual spoken words.
- The narration should be natural, conversational speech — the exact words a voice actor speaks aloud.
- If the script has "Visual:" descriptions, those go into visual_description NOT narration.
- NEVER include labels, directions, or formatting in narration.

═══ VISUAL_DESCRIPTION RULES (Flux AI image prompt) ═══
These prompts go DIRECTLY to Flux image generation. Follow this structure:

FORMAT: "[Subject doing action], [setting/environment], [lighting], [camera angle], [mood/atmosphere], [art style]"

GOOD EXAMPLE: "A young man sitting alone on a park bench at dusk, city skyline in background, golden hour side lighting with long shadows, medium wide shot from slight low angle, melancholic and contemplative mood, cinematic photography style with warm color grading and shallow depth of field"

BAD EXAMPLE: "A scene showing sadness" (too vague — Flux will generate garbage)

RULES:
1. Start with the MAIN SUBJECT and what they're doing — be specific about age, appearance, posture, expression
2. Describe the ENVIRONMENT in detail — location, objects, background elements
3. Specify LIGHTING — golden hour, neon glow, overcast diffused, dramatic rim light, soft window light
4. Include CAMERA — wide shot, close-up, medium shot, low angle, over-shoulder, birds-eye
5. Set the MOOD — through color palette (warm amber, cool blue, desaturated), atmosphere (foggy, rain, dust particles)
6. Add STYLE keywords — cinematic, photorealistic, film grain, bokeh, shallow depth of field, 35mm lens
7. Each prompt must be 40-80 words
8. NEVER include text, words, captions, logos, watermarks, or UI elements in the visual
9. NEVER describe audio, sound, or narration in the visual
10. Each scene must be visually DISTINCT — vary the setting, angle, and color palette across scenes
11. Keep VISUAL CONTINUITY — same character appearance/clothing across all scenes

═══ SCENE RULES ═══
- {scene_count_rule} — mandatory, do not generate more or fewer
- Each scene: 5-12 seconds long{style_hint}{duration_hint}
- Aspect Ratio: {aspect_ratio}

═══ RAW SCRIPT ═══
{raw_script}

═══ OUTPUT FORMAT (strict JSON) ═══
{{
  "scenes": [
    {{
      "scene_id": 1,
      "narration": "Clean spoken text only — use ALL of the user's words",
      "visual_description": "Flux-optimized image prompt following the format above",
      "duration": 7.0
    }}
  ],
  "total_duration": 30.0,
  "scene_count": {target_scenes}
}}

Generate the structured video script:"""

    def _parse_gemini_response(self, result: dict) -> CanonicalVideoScript:
        """Parse Gemini's JSON response into CanonicalVideoScript."""
        scenes = []
        for scene_data in result.get("scenes", []):
            narration = scene_data.get("narration", "")
            # Clean any stray labels from narration
            narration = self._clean_narration(narration)

            scenes.append(SceneSchema(
                scene_id=scene_data.get("scene_id", len(scenes) + 1),
                narration=narration,
                visual_description=scene_data.get("visual_description", ""),
                duration=float(scene_data.get("duration", 3.0)),
            ))

        total_duration = result.get("total_duration", sum(s.duration for s in scenes))

        return CanonicalVideoScript(
            scenes=scenes,
            total_duration=total_duration,
            scene_count=len(scenes),
        )

    def _clean_narration(self, text: str) -> str:
        """Remove scene labels, directions, and formatting from narration text."""
        # Remove "Visual:" label and everything after it on the same line
        text = re.sub(r'visual\s*:[^\n]*', '', text, flags=re.IGNORECASE)
        # Remove "On-screen text:" label and content
        text = re.sub(r'on-screen\s*(text)?\s*:[^\n]*', '', text, flags=re.IGNORECASE)
        # Remove scene labels like "Scene 1:", "Scene1," etc. (GLOBAL, not just start)
        text = re.sub(r'scene\s*\d+[\s:,\-–—]*', '', text, flags=re.IGNORECASE)
        # Remove "Voiceover:" labels (GLOBAL)
        text = re.sub(r'voiceover\s*:', '', text, flags=re.IGNORECASE)
        # Remove "Narrator:" labels (GLOBAL)
        text = re.sub(r'narrator\s*:', '', text, flags=re.IGNORECASE)
        # Remove timestamps like (0-7 sec), (0:00 - 0:07)
        text = re.sub(r'\(\d+[\s–\-:]+\d+\s*(sec|s)?\)', '', text)
        # Remove surrounding quotes
        text = text.strip().strip('"').strip("'").strip()
        # Clean up extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _fallback_parse(
        self,
        raw_script: str,
        target_scenes: int = 4,
        preset_context: Optional[PresetContext] = None,
    ) -> CanonicalVideoScript:
        """
        Smart fallback parser when Gemini is unavailable.
        Detects structured scripts (Scene/Visual/Voiceover) and plain text.
        """
        max_scenes = target_scenes + 1  # Allow 1 extra buffer

        # Try structured parse first (detects Scene/Visual/Voiceover format)
        structured = self._try_structured_parse(raw_script)
        if structured and len(structured) >= 2:
            scenes = structured[:max_scenes]
            logger.info(f"Structured parser found {len(structured)} scenes")
        else:
            # Plain text or structured parse failed: split into logical chunks
            if structured:
                logger.warning(f"Structured parser found only {len(structured)} scene(s), using plain text split")
            scenes = self._split_plain_text(raw_script, target_scenes)

        # Calculate duration per scene (~7s average)
        duration_per_scene = 7.0

        # Clamp duration between 5-12 seconds
        duration_per_scene = max(5.0, min(12.0, duration_per_scene))

        result_scenes = []
        for i, (narration, visual_hint) in enumerate(scenes):
            # Clean narration
            narration = self._clean_narration(narration)

            # Generate rich visual description
            visual_desc = self._build_visual_description(
                visual_hint=visual_hint,
                narration=narration,
                preset_context=preset_context,
                scene_index=i,
            )

            result_scenes.append(SceneSchema(
                scene_id=i + 1,
                narration=narration,
                visual_description=visual_desc,
                duration=duration_per_scene,
            ))

        total_duration = sum(s.duration for s in result_scenes)

        logger.info(f"Fallback parser: {len(result_scenes)} scenes, {total_duration}s total")

        return CanonicalVideoScript(
            scenes=result_scenes,
            total_duration=total_duration,
            scene_count=len(result_scenes),
        )

    def _try_structured_parse(self, raw_script: str) -> Optional[List[tuple]]:
        """
        Detect and parse structured scripts like:
          Scene 1 (0-7 sec)
          Visual:
          A young man sitting...
          Voiceover:
          "Some days feel heavy..."

        Returns list of (narration, visual_hint) tuples, or None if not structured.
        """
        lines = raw_script.strip().split('\n')

        # Check if this looks like a structured script
        has_scene_markers = any(re.match(r'^\s*(scene|act)\s*\d', line, re.IGNORECASE) for line in lines)
        has_voiceover = any(re.match(r'^\s*(voiceover|narrator|vo)\s*:', line, re.IGNORECASE) for line in lines)
        has_visual = any(re.match(r'^\s*(visual|image|shot)\s*:', line, re.IGNORECASE) for line in lines)

        if not (has_scene_markers or (has_voiceover and has_visual)):
            return None

        scenes = []
        current_narration = ""
        current_visual = ""
        current_section = None  # Track which section we're in: 'visual', 'voiceover', or None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Scene marker - save previous scene and start new one
            if re.match(r'^\s*(scene|act)\s*\d', line, re.IGNORECASE):
                if current_narration or current_visual:
                    scenes.append((current_narration.strip(), current_visual.strip()))
                current_narration = ""
                current_visual = ""
                current_section = None
                continue

            # On-screen text / other directives - skip
            if re.match(r'^\s*(on-screen|text|sfx|music|sound|note)\s*', line, re.IGNORECASE):
                current_section = None
                continue

            # Voiceover/Narrator label (may have content on same line or next line)
            vo_match = re.match(r'^\s*(voiceover|narrator|vo)\s*:\s*(.*)', line, re.IGNORECASE)
            if vo_match:
                current_section = 'voiceover'
                text = vo_match.group(2).strip().strip('"').strip("'")
                if text:  # Content on same line as label
                    current_narration += " " + text if current_narration else text
                continue

            # Visual/Image label (may have content on same line or next line)
            vis_match = re.match(r'^\s*(visual|image|shot)\s*:\s*(.*)', line, re.IGNORECASE)
            if vis_match:
                current_section = 'visual'
                text = vis_match.group(2).strip()
                if text:  # Content on same line as label
                    current_visual += " " + text if current_visual else text
                continue

            # Content line - append to the current section
            text = line.strip().strip('"').strip("'")
            if current_section == 'voiceover':
                current_narration += " " + text if current_narration else text
            elif current_section == 'visual':
                current_visual += " " + text if current_visual else text
            else:
                # No explicit section label seen - default to narration
                current_narration += " " + text if current_narration else text

        # Don't forget the last scene
        if current_narration or current_visual:
            scenes.append((current_narration.strip(), current_visual.strip()))

        return scenes if scenes else None

    def _split_plain_text(self, raw_script: str, target_scenes: int) -> List[tuple]:
        """Split plain text into logical scene chunks targeting a specific scene count."""

        # Split by double newlines first (paragraph breaks)
        paragraphs = re.split(r'\n\s*\n', raw_script.strip())
        paragraphs = [p.strip() for p in paragraphs if p.strip()]

        if len(paragraphs) >= target_scenes:
            # Enough paragraphs - use them directly
            chunks = paragraphs[:target_scenes]
        elif len(paragraphs) >= 2:
            chunks = paragraphs
        else:
            # Split by sentences
            sentences = re.split(r'(?<=[.!?])\s+', raw_script.strip())
            sentences = [s.strip() for s in sentences if s.strip()]

            if not sentences:
                sentences = [raw_script.strip()]

            if len(sentences) >= target_scenes:
                # Distribute sentences evenly across target scene count
                per_scene = max(1, len(sentences) // target_scenes)
                chunks = []
                for i in range(0, len(sentences), per_scene):
                    chunk = " ".join(sentences[i:i + per_scene])
                    chunks.append(chunk)
                chunks = chunks[:target_scenes]
            else:
                chunks = sentences

        # If still fewer chunks than target and script has enough words, split by word count
        words = raw_script.strip().split()
        if len(chunks) < target_scenes and len(words) >= 20:
            words_per_scene = max(1, len(words) // target_scenes)
            chunks = []
            for i in range(0, len(words), words_per_scene):
                chunk = " ".join(words[i:i + words_per_scene])
                chunks.append(chunk)
            chunks = chunks[:target_scenes]
            logger.info(f"Force-split into {len(chunks)} scenes (word-count based)")

        # Return as (narration, visual_hint) tuples
        # For plain text, narration IS the text, visual_hint is derived from it
        return [(chunk, chunk) for chunk in chunks]

    def _build_visual_description(
        self,
        visual_hint: str,
        narration: str,
        preset_context: Optional[PresetContext],
        scene_index: int,
    ) -> str:
        """
        Build a Flux-optimized image prompt from raw visual hint text.

        Flux prompt structure: [Subject], [Setting], [Lighting], [Camera], [Mood], [Style]
        """
        # Cinematography options - vary per scene for visual diversity
        camera_shots = [
            "wide establishing shot, 35mm lens",
            "medium close-up, 50mm lens, shallow depth of field",
            "over-the-shoulder perspective, cinematic framing",
            "low angle shot looking up, dramatic perspective",
            "intimate close-up, 85mm portrait lens, bokeh background",
            "aerial birds-eye view, expansive composition",
        ]

        lighting_setups = [
            "soft golden hour side lighting with long warm shadows",
            "cool blue ambient light, moody overcast atmosphere",
            "dramatic rim lighting with deep shadows, chiaroscuro",
            "soft diffused natural window light, gentle highlights",
            "warm sunset backlight, rich orange and purple sky",
            "cinematic neon glow, urban night atmosphere with reflections",
        ]

        mood_palettes = [
            "warm amber and earth tones, nostalgic feeling",
            "cool desaturated blues and grays, contemplative mood",
            "high contrast with deep blacks, dramatic tension",
            "soft pastels and natural greens, peaceful serenity",
            "rich golden and crimson tones, emotional warmth",
            "vibrant neon cyan and magenta, energetic atmosphere",
        ]

        camera = camera_shots[scene_index % len(camera_shots)]
        lighting = lighting_setups[scene_index % len(lighting_setups)]
        mood = mood_palettes[scene_index % len(mood_palettes)]

        # Clean the visual hint - strip labels, narration artifacts, quoted speech
        visual = visual_hint
        visual = re.sub(r'scene\s*\d+[\s:,\-–—]*', '', visual, flags=re.IGNORECASE)
        visual = re.sub(r'(voiceover|narrator|visual|image|shot)\s*:', '', visual, flags=re.IGNORECASE)
        visual = re.sub(r'\(\d+[\s–\-:]+\d+\s*(sec|s)?\)', '', visual)  # timestamps
        visual = re.sub(r'^(and |but |so |then |next |first |finally |lastly )', '', visual, flags=re.IGNORECASE)
        visual = re.sub(r'"[^"]*"', '', visual)  # Remove quoted speech
        visual = re.sub(r'\s+', ' ', visual).strip()

        # If visual hint is too short or empty, derive from narration
        if len(visual.split()) < 5 and narration:
            visual = narration
            # Clean narration-derived visual of speech-like patterns
            visual = re.sub(r'"[^"]*"', '', visual)
            visual = re.sub(r'\s+', ' ', visual).strip()

        # Build Flux-optimized prompt: Subject > Setting > Lighting > Camera > Mood > Style
        prompt_parts = []

        # Preset style first (sets the overall aesthetic)
        if preset_context and preset_context.style_prompt:
            prompt_parts.append(preset_context.style_prompt)

        # Core visual content (subject + setting)
        prompt_parts.append(visual)

        # Cinematography
        prompt_parts.append(camera)
        prompt_parts.append(lighting)

        # Mood and color
        prompt_parts.append(mood)

        # Flux quality keywords
        prompt_parts.append("photorealistic, cinematic film still, professional photography, sharp focus, high detail")

        # Preset tone modifiers
        if preset_context and preset_context.tone_modifiers:
            prompt_parts.append(preset_context.tone_modifiers)

        return ", ".join(prompt_parts)


# ============================================
# Singleton Instance
# ============================================
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get the singleton Gemini service instance."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
