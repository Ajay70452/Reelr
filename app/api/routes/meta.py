"""
Metadata endpoints - Returns genres, styles, presets, etc.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.db.models import Genre, VisualStyle, Preset, QualityOption, Voice, Music
from app.schemas import (
    GenresResponse, VisualStylesResponse, PresetsResponse,
    QualityOptionsResponse, VoicesResponse, MusicResponse,
    GenreSchema, VisualStyleSchema, PresetSchema,
    QualityOptionSchema, VoiceSchema, MusicSchema,
    AIPresetsResponse, AIPresetSchema
)

router = APIRouter(prefix="/meta", tags=["Metadata"])


@router.get("/genres", response_model=GenresResponse)
def get_genres(db: Session = Depends(get_db)):
    """Get all available content genres"""
    genres = db.query(Genre).all()
    return {"genres": genres}


@router.get("/visual-styles", response_model=VisualStylesResponse)
def get_visual_styles(db: Session = Depends(get_db)):
    """Get all available visual styles"""
    styles = db.query(VisualStyle).all()
    return {"styles": styles}


@router.get("/presets/{style_id}", response_model=PresetsResponse)
def get_presets(style_id: str, db: Session = Depends(get_db)):
    """Get presets for a specific visual style"""
    presets = db.query(Preset).filter(Preset.visual_style_id == style_id).all()
    return {"presets": presets}


@router.get("/quality-options", response_model=QualityOptionsResponse)
def get_quality_options(db: Session = Depends(get_db)):
    """Get all quality tiers and credit costs"""
    quality_options = db.query(QualityOption).all()
    return {"quality": quality_options}


@router.get("/voices", response_model=VoicesResponse)
def get_voices(db: Session = Depends(get_db)):
    """Get all available TTS voices (from database)"""
    voices = db.query(Voice).all()
    return {"voices": voices}


@router.get("/deepgram-voices")
def get_deepgram_voices():
    """
    Get all available Deepgram TTS voices.
    These are used for the Script-to-Video workflow.
    """
    from app.services.deepgram_service import DEEPGRAM_VOICES, DEFAULT_VOICE

    voices = []
    for voice_id, metadata in DEEPGRAM_VOICES.items():
        voices.append({
            "id": voice_id,
            "display_name": metadata["name"],
            "gender": metadata["gender"],
            "accent": metadata["accent"],
            "provider": "deepgram",
            "is_default": voice_id == DEFAULT_VOICE,
            # Group into generations
            "generation": "aura-2" if voice_id.startswith("aura-2") else "aura-1",
        })

    # Sort: Aura 2 first, then by name
    voices.sort(key=lambda v: (0 if v["generation"] == "aura-2" else 1, v["display_name"]))

    return {"voices": voices}


@router.get("/music", response_model=MusicResponse)
def get_music(db: Session = Depends(get_db)):
    """Get all available background music options"""
    music = db.query(Music).all()
    return {"music": music}


@router.get("/ai-presets", response_model=AIPresetsResponse)
def get_ai_presets(db: Session = Depends(get_db)):
    """
    Get all AI generation presets (for Image & Video generators).

    These presets are model-agnostic and include prompt engineering
    fields (prompt_prefix, prompt_suffix, negative_prompt) that
    augment the user's prompt for better output quality.
    """
    # Fetch presets from the 'ai_generation' visual style
    presets = db.query(Preset).filter(
        Preset.visual_style_id == "ai_generation"
    ).all()

    # If no ai_generation presets exist yet, return all presets that have prompt_prefix
    if not presets:
        presets = db.query(Preset).filter(
            Preset.prompt_prefix.isnot(None)
        ).all()

    return {"presets": presets}
