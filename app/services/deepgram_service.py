"""
Deepgram Service - Text-to-Speech (TTS) & Speech-to-Text (STT)

Uses Deepgram API for:
- Voice generation from narration text (TTS)
- Caption generation with word-level timestamps (STT)
"""

import logging
import httpx
import asyncio
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# Data Models
# ============================================
@dataclass
class WordTimestamp:
    """A single word with its timing information"""
    word: str
    start: float  # Start time in seconds
    end: float    # End time in seconds
    confidence: float = 1.0


@dataclass
class CaptionData:
    """Caption data with word-level timestamps"""
    words: List[WordTimestamp]
    full_transcript: str
    duration: float


@dataclass
class AudioResult:
    """Result of TTS generation"""
    audio_path: Path
    duration: float
    char_count: int


# ============================================
# Deepgram Voice Models
# ============================================
DEEPGRAM_VOICES = {
    # Aura 2 voices (latest generation)
    "aura-2-thalia-en": {"name": "Thalia", "gender": "female", "accent": "American"},
    "aura-2-luna-en": {"name": "Luna", "gender": "female", "accent": "American"},
    "aura-2-stella-en": {"name": "Stella", "gender": "female", "accent": "American"},
    "aura-2-athena-en": {"name": "Athena", "gender": "female", "accent": "British"},
    "aura-2-hera-en": {"name": "Hera", "gender": "female", "accent": "American"},
    "aura-2-orion-en": {"name": "Orion", "gender": "male", "accent": "American"},
    "aura-2-arcas-en": {"name": "Arcas", "gender": "male", "accent": "American"},
    "aura-2-perseus-en": {"name": "Perseus", "gender": "male", "accent": "American"},
    "aura-2-angus-en": {"name": "Angus", "gender": "male", "accent": "Irish"},
    "aura-2-orpheus-en": {"name": "Orpheus", "gender": "male", "accent": "American"},
    "aura-2-helios-en": {"name": "Helios", "gender": "male", "accent": "British"},
    "aura-2-zeus-en": {"name": "Zeus", "gender": "male", "accent": "American"},
    # Aura 1 voices (fallback)
    "aura-asteria-en": {"name": "Asteria", "gender": "female", "accent": "American"},
    "aura-luna-en": {"name": "Luna (v1)", "gender": "female", "accent": "American"},
    "aura-stella-en": {"name": "Stella (v1)", "gender": "female", "accent": "American"},
    "aura-athena-en": {"name": "Athena (v1)", "gender": "female", "accent": "British"},
    "aura-hera-en": {"name": "Hera (v1)", "gender": "female", "accent": "American"},
    "aura-orion-en": {"name": "Orion (v1)", "gender": "male", "accent": "American"},
    "aura-arcas-en": {"name": "Arcas (v1)", "gender": "male", "accent": "American"},
    "aura-perseus-en": {"name": "Perseus (v1)", "gender": "male", "accent": "American"},
    "aura-angus-en": {"name": "Angus (v1)", "gender": "male", "accent": "Irish"},
    "aura-orpheus-en": {"name": "Orpheus (v1)", "gender": "male", "accent": "American"},
    "aura-helios-en": {"name": "Helios (v1)", "gender": "male", "accent": "British"},
    "aura-zeus-en": {"name": "Zeus (v1)", "gender": "male", "accent": "American"},
}

DEFAULT_VOICE = "aura-2-orion-en"


# ============================================
# Deepgram Service
# ============================================
class DeepgramService:
    """
    Service for voice generation and caption extraction using Deepgram.

    TTS: Convert narration text to speech audio
    STT: Extract word-level timestamps from audio for captions
    """

    TTS_ENDPOINT = "https://api.deepgram.com/v1/speak"
    STT_ENDPOINT = "https://api.deepgram.com/v1/listen"

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY

    def _get_headers(self) -> dict:
        """Get authorization headers for Deepgram API"""
        return {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json",
        }

    async def text_to_speech(
        self,
        text: str,
        voice_id: str = DEFAULT_VOICE,
        output_path: Optional[Path] = None,
    ) -> AudioResult:
        """
        Generate speech audio from text using Deepgram TTS.

        Args:
            text: The narration text to convert to speech
            voice_id: Deepgram voice model ID (e.g., 'aura-2-orion-en')
            output_path: Path to save the audio file

        Returns:
            AudioResult with audio path and metadata
        """
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not configured")

        # Ensure voice_id is valid, fallback to default
        if voice_id not in DEEPGRAM_VOICES:
            logger.warning(f"Unknown voice '{voice_id}', using default: {DEFAULT_VOICE}")
            voice_id = DEFAULT_VOICE

        # Create output path if not provided
        if output_path is None:
            import tempfile
            import uuid
            temp_dir = Path(tempfile.gettempdir()) / "clipking" / "audio"
            temp_dir.mkdir(parents=True, exist_ok=True)
            output_path = temp_dir / f"tts_{uuid.uuid4()}.mp3"

        url = f"{self.TTS_ENDPOINT}?model={voice_id}"

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                url,
                headers=self._get_headers(),
                json={"text": text},
            )
            response.raise_for_status()

            # Save audio to file
            output_path.write_bytes(response.content)

            # Extract metadata from headers
            char_count = int(response.headers.get("dg-char-count", len(text)))

            # Estimate duration (will be refined by STT)
            # Rough estimate: ~150 words per minute, ~5 chars per word
            estimated_duration = (char_count / 5) / 150 * 60

            logger.info(f"TTS generated: {output_path} ({char_count} chars)")

            return AudioResult(
                audio_path=output_path,
                duration=estimated_duration,
                char_count=char_count,
            )

    async def speech_to_text(
        self,
        audio_path: Path,
        language: str = "en",
    ) -> CaptionData:
        """
        Transcribe audio and extract word-level timestamps using Deepgram STT.

        Args:
            audio_path: Path to the audio file
            language: Language code (default: 'en')

        Returns:
            CaptionData with word-level timestamps
        """
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not configured")

        # Read audio file
        audio_data = audio_path.read_bytes()

        # Build URL with query parameters for word timestamps
        params = {
            "model": "nova-2",
            "language": language,
            "punctuate": "true",
            "smart_format": "true",
            "utterances": "false",
            "diarize": "false",
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{self.STT_ENDPOINT}?{query_string}"

        # Determine content type
        suffix = audio_path.suffix.lower()
        content_types = {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".ogg": "audio/ogg",
        }
        content_type = content_types.get(suffix, "audio/mpeg")

        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                url,
                headers=headers,
                content=audio_data,
            )
            response.raise_for_status()

            result = response.json()

        # Parse response to extract word timestamps
        return self._parse_stt_response(result)

    def _parse_stt_response(self, result: dict) -> CaptionData:
        """Parse Deepgram STT response into CaptionData."""
        words = []
        full_transcript = ""
        duration = 0.0

        try:
            # Navigate Deepgram response structure
            channels = result.get("results", {}).get("channels", [])
            if channels:
                alternatives = channels[0].get("alternatives", [])
                if alternatives:
                    alt = alternatives[0]
                    full_transcript = alt.get("transcript", "")

                    # Extract word-level data
                    for word_data in alt.get("words", []):
                        words.append(WordTimestamp(
                            word=word_data.get("punctuated_word", word_data.get("word", "")),
                            start=float(word_data.get("start", 0)),
                            end=float(word_data.get("end", 0)),
                            confidence=float(word_data.get("confidence", 1.0)),
                        ))

            # Calculate total duration from last word
            if words:
                duration = words[-1].end

            # Also check metadata for duration
            metadata = result.get("metadata", {})
            if "duration" in metadata:
                duration = float(metadata["duration"])

        except Exception as e:
            logger.error(f"Error parsing STT response: {e}")

        logger.info(f"STT extracted {len(words)} words, duration: {duration:.2f}s")

        return CaptionData(
            words=words,
            full_transcript=full_transcript,
            duration=duration,
        )

    async def generate_voice_and_captions(
        self,
        text: str,
        voice_id: str = DEFAULT_VOICE,
        output_path: Optional[Path] = None,
    ) -> tuple[AudioResult, CaptionData]:
        """
        Combined workflow: Generate voice audio, then extract captions.

        Args:
            text: Narration text
            voice_id: Voice model ID
            output_path: Optional path for audio file

        Returns:
            Tuple of (AudioResult, CaptionData)
        """
        # Step 1: Generate voice audio
        audio_result = await self.text_to_speech(text, voice_id, output_path)

        # Step 2: Extract captions with word timestamps
        caption_data = await self.speech_to_text(audio_result.audio_path)

        # Update audio duration with accurate value from STT
        audio_result.duration = caption_data.duration

        return audio_result, caption_data


# ============================================
# Helper Functions
# ============================================
def get_available_voices() -> dict:
    """Get all available Deepgram voices with metadata."""
    return DEEPGRAM_VOICES


def get_voice_by_id(voice_id: str) -> Optional[dict]:
    """Get voice metadata by ID."""
    return DEEPGRAM_VOICES.get(voice_id)


# ============================================
# Singleton Instance
# ============================================
_deepgram_service: Optional[DeepgramService] = None


def get_deepgram_service() -> DeepgramService:
    """Get the singleton Deepgram service instance."""
    global _deepgram_service
    if _deepgram_service is None:
        _deepgram_service = DeepgramService()
    return _deepgram_service
