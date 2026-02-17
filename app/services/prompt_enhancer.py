"""
Prompt Enhancer Service - v2

Converts a simple user prompt into a model-ready final prompt by:
- Injecting preset style information (prefix/suffix)
- Adding model-specific quality enhancements
- Optional LLM expansion with video-model-aware system prompts
- Differentiated joining (sentence flow vs tag list)

Based on docs/prompt_enhancer.md and docs/ai_video_improvements.md.
"""

import logging
import os
from functools import lru_cache
from typing import Optional, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session

import anthropic

from app.db.models import Preset

logger = logging.getLogger(__name__)

# Threshold for auto LLM expansion (word count)
SHORT_PROMPT_THRESHOLD = 15

# Model-specific quality suffixes
QUALITY_SUFFIXES = {
    "image": "high quality, sharp focus, professional composition",
    "sora2": "high quality, smooth motion, cinematic look, professional production",
    "veo3": "high quality, fluid motion, cinematic cinematography, professional",
    "kling25": "high quality, consistent motion, smooth transitions, professional",
    "ltx2": "high quality, temporal consistency, smooth motion, professional rendering",
}

# Model-specific LLM expansion system prompts
LLM_SYSTEM_PROMPTS = {
    "image": """You are a prompt expansion assistant for AI image generation.

Your task is to expand the given idea with visual and descriptive details.

Rules:
- Do NOT change the meaning or core subject
- Do NOT add new actions, characters, or elements not implied
- Keep it concise (1-2 sentences max)
- Focus on visual details: lighting, composition, mood, textures
- Output ONLY the expanded prompt, nothing else""",

    "sora2": """You are a prompt expansion assistant for Sora 2 AI video generation.

Your task is to expand the given idea into a narrative/screenplay-style description.

Rules:
- Do NOT change the meaning or core subject
- Do NOT add new characters or storylines not implied
- Keep it concise (2-3 sentences max)
- Focus on: story flow, camera movements, mood shifts, temporal progression
- Describe what happens over time, not just a static scene
- Output ONLY the expanded prompt, nothing else""",

    "veo3": """You are a prompt expansion assistant for Veo 3 AI video generation.

Your task is to expand the given idea using cinematic language.

Rules:
- Do NOT change the meaning or core subject
- Do NOT add new characters or storylines not implied
- Keep it concise (2-3 sentences max)
- Focus on: camera angle, depth of field, lighting setup, lens choice, color grading
- Use cinematography terminology naturally
- Output ONLY the expanded prompt, nothing else""",

    "kling25": """You are a prompt expansion assistant for Kling 2.5 AI video generation.

Your task is to expand the given idea with structured, descriptive tags.

Rules:
- Do NOT change the meaning or core subject
- Do NOT add new characters or elements not implied
- Keep it concise (1-2 sentences max)
- Focus on: subject description, action, environment, lighting conditions
- Use clear descriptive tags separated by commas
- Output ONLY the expanded prompt, nothing else""",

    "ltx2": """You are a prompt expansion assistant for LTX-2 AI video generation.

Your task is to expand the given idea with technical specifications.

Rules:
- Do NOT change the meaning or core subject
- Do NOT add new characters or elements not implied
- Keep it concise (1-2 sentences max)
- Focus on: resolution quality, camera motion type, color grading, temporal consistency
- Use technical video production terminology
- Output ONLY the expanded prompt, nothing else""",
}

# Narrative models use ". " joining for sentence flow
NARRATIVE_MODELS = {"sora2", "veo3"}
# Descriptive models use ", " joining for tag lists
DESCRIPTIVE_MODELS = {"kling25", "ltx2", "image"}


@lru_cache(maxsize=1)
def _get_anthropic_client() -> Optional[anthropic.Anthropic]:
    """Cached singleton Anthropic client."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, LLM expansion unavailable")
        return None
    return anthropic.Anthropic(api_key=api_key)


@dataclass
class EnhancedPrompt:
    """Result of prompt enhancement"""
    final_prompt: str
    negative_prompt: Optional[str]
    was_expanded: bool = False


class PromptEnhancer:
    """
    Prompt Enhancer for AI generation.

    v2 improvements:
    - Video-model-aware system prompts for LLM expansion
    - Model-specific quality suffixes
    - Fixed expansion logic bug (Enhance toggle always works)
    - Differentiated prompt joining (sentence flow vs tag list)
    - Cached Anthropic client
    - Upgraded to claude-haiku-4-5
    """

    def __init__(self, db: Session):
        self.db = db

    def enhance(
        self,
        user_prompt: str,
        preset_id: Optional[str] = None,
        model: str = "image",
        enhance_prompt: bool = False,
        reference_image: Optional[str] = None,
        user_negative_prompt: Optional[str] = None,
    ) -> EnhancedPrompt:
        """
        Enhance a user prompt for AI generation.

        Args:
            user_prompt: The user's raw prompt
            preset_id: Optional preset ID to apply
            model: Model type (image, sora2, veo3, kling25, ltx2)
            enhance_prompt: Whether to force LLM expansion
            reference_image: Optional reference image URL (passed through)
            user_negative_prompt: User's negative prompt (merged with preset's)

        Returns:
            EnhancedPrompt with final_prompt and negative_prompt
        """
        # Get preset if specified
        preset = None
        if preset_id:
            preset = self.db.query(Preset).filter(Preset.id == preset_id).first()
            if preset:
                logger.info(f"Applying preset: {preset.display_name}")

        # Determine if we should expand the prompt
        word_count = len(user_prompt.strip().split())
        should_expand = enhance_prompt or (word_count < SHORT_PROMPT_THRESHOLD)

        # Expand prompt if needed (or use as-is)
        working_prompt = user_prompt.strip()
        was_expanded = False

        # FIX: Remove double condition - if should_expand is True, always expand
        if should_expand:
            expanded = self._expand_prompt_with_llm(working_prompt, preset, model)
            if expanded:
                working_prompt = expanded
                was_expanded = True

        # Assemble final prompt
        final_prompt = self._assemble_prompt(
            working_prompt,
            preset,
            model,
        )

        # Merge negative prompts: preset + user
        negative_prompt = self._merge_negative_prompts(
            preset.negative_prompt if preset else None,
            user_negative_prompt,
        )

        # Log for debugging
        self._log_enhancement(
            user_prompt=user_prompt,
            preset_id=preset_id,
            final_prompt=final_prompt,
            negative_prompt=negative_prompt,
            was_expanded=was_expanded,
        )

        return EnhancedPrompt(
            final_prompt=final_prompt,
            negative_prompt=negative_prompt,
            was_expanded=was_expanded,
        )

    def _merge_negative_prompts(
        self,
        preset_negative: Optional[str],
        user_negative: Optional[str],
    ) -> Optional[str]:
        """Merge preset and user negative prompts."""
        parts = []
        if preset_negative:
            parts.append(preset_negative.strip())
        if user_negative:
            parts.append(user_negative.strip())

        if not parts:
            return None

        return ", ".join(parts)

    def _assemble_prompt(
        self,
        user_prompt: str,
        preset: Optional[Preset],
        model: str,
    ) -> str:
        """
        Assemble the final prompt.

        Format: [preset.prompt_prefix] [user_prompt] [preset.prompt_suffix] [quality_suffix]
        Joining: ". " for narrative models (sora2, veo3), ", " for descriptive (kling25, ltx2, image)
        """
        parts = []

        # 1. Preset prefix (if any)
        if preset and preset.prompt_prefix:
            parts.append(preset.prompt_prefix.strip().rstrip(','))

        # 2. User prompt (or expanded prompt)
        parts.append(user_prompt.strip())

        # 3. Preset suffix (if any)
        if preset and preset.prompt_suffix:
            suffix = preset.prompt_suffix.strip().lstrip(',').strip()
            if suffix:
                parts.append(suffix)

        # 4. Model-specific quality suffix
        quality_suffix = QUALITY_SUFFIXES.get(model, QUALITY_SUFFIXES["image"])
        parts.append(quality_suffix)

        # Join with model-appropriate separator
        if model in NARRATIVE_MODELS:
            final_prompt = ". ".join(parts)
        else:
            final_prompt = ", ".join(parts)

        return final_prompt

    def _expand_prompt_with_llm(
        self,
        user_prompt: str,
        preset: Optional[Preset],
        model: str = "image",
    ) -> Optional[str]:
        """
        Expand a short prompt using LLM with model-specific system prompts.

        Returns expanded prompt or None if expansion fails/disabled.
        """
        try:
            client = _get_anthropic_client()
            if not client:
                return None

            # Select model-specific system prompt
            system_prompt = LLM_SYSTEM_PROMPTS.get(model, LLM_SYSTEM_PROMPTS["image"])

            # Build the expansion request
            preset_context = f" in {preset.display_name} style" if preset else ""

            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"Expand this idea{preset_context}: {user_prompt}"
                    }
                ]
            )

            expanded = message.content[0].text.strip()
            logger.info(f"LLM expanded prompt ({model}): '{user_prompt}' -> '{expanded}'")
            return expanded

        except Exception as e:
            logger.warning(f"LLM expansion failed: {e}")
            return None

    def _log_enhancement(
        self,
        user_prompt: str,
        preset_id: Optional[str],
        final_prompt: str,
        negative_prompt: Optional[str],
        was_expanded: bool,
    ) -> None:
        """Log prompt enhancement for debugging and quality tuning."""
        logger.info(
            "Prompt Enhanced | "
            f"user_prompt='{user_prompt[:50]}...' | "
            f"preset_id={preset_id} | "
            f"expanded={was_expanded} | "
            f"final_length={len(final_prompt)}"
        )
        logger.debug(
            f"Full enhancement: "
            f"final_prompt='{final_prompt}' | "
            f"negative_prompt='{negative_prompt}'"
        )


def enhance_prompt(
    db: Session,
    user_prompt: str,
    preset_id: Optional[str] = None,
    model: str = "image",
    enhance_prompt_flag: bool = False,
    reference_image: Optional[str] = None,
    user_negative_prompt: Optional[str] = None,
) -> Tuple[str, Optional[str]]:
    """
    Convenience function to enhance a prompt.

    Returns:
        Tuple of (final_prompt, negative_prompt)
    """
    enhancer = PromptEnhancer(db)
    result = enhancer.enhance(
        user_prompt=user_prompt,
        preset_id=preset_id,
        model=model,
        enhance_prompt=enhance_prompt_flag,
        reference_image=reference_image,
        user_negative_prompt=user_negative_prompt,
    )
    return result.final_prompt, result.negative_prompt


def preview_prompt(
    db: Session,
    user_prompt: str,
    preset_id: Optional[str] = None,
    model: str = "image",
    enhance_prompt_flag: bool = True,
    user_negative_prompt: Optional[str] = None,
) -> EnhancedPrompt:
    """
    Preview prompt enhancement without starting generation.
    Returns the full EnhancedPrompt with was_expanded flag.
    """
    enhancer = PromptEnhancer(db)
    return enhancer.enhance(
        user_prompt=user_prompt,
        preset_id=preset_id,
        model=model,
        enhance_prompt=enhance_prompt_flag,
        user_negative_prompt=user_negative_prompt,
    )
