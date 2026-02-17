"""
LLM Worker
Generates scripts and scenes using GPT-4 or Claude
Queue: llm_queue
"""

import json
from typing import Dict, Any, List, Optional
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

logger = get_logger("llm")


# ============================================
# Genre Configurations
# ============================================
GENRE_CONFIGS = {
    "motivation": {
        "tone": "inspiring and uplifting",
        "style": "powerful motivational speech",
        "themes": ["success", "perseverance", "mindset", "achievement", "growth"],
        "example_hooks": [
            "The difference between winners and losers...",
            "They told him he couldn't do it...",
            "What separates the top 1% from everyone else...",
        ],
    },
    "business": {
        "tone": "professional and insightful",
        "style": "business wisdom and entrepreneurship",
        "themes": ["leadership", "strategy", "innovation", "wealth", "productivity"],
        "example_hooks": [
            "The billionaire's secret morning routine...",
            "Why 90% of startups fail...",
            "The one skill every CEO masters...",
        ],
    },
    "psychology": {
        "tone": "thought-provoking and educational",
        "style": "psychological insights and human behavior",
        "themes": ["mindset", "habits", "emotions", "relationships", "self-improvement"],
        "example_hooks": [
            "Your brain is lying to you...",
            "The psychology trick that changes everything...",
            "Why smart people make stupid decisions...",
        ],
    },
    "stoicism": {
        "tone": "calm, wise, and philosophical",
        "style": "stoic philosophy and ancient wisdom",
        "themes": ["discipline", "acceptance", "virtue", "resilience", "inner peace"],
        "example_hooks": [
            "Marcus Aurelius wrote this 2000 years ago...",
            "The Stoics knew something we forgot...",
            "Control what you can, accept what you cannot...",
        ],
    },
    "finance": {
        "tone": "informative and practical",
        "style": "financial education and wealth building",
        "themes": ["investing", "savings", "passive income", "financial freedom", "money mindset"],
        "example_hooks": [
            "The rich don't work for money...",
            "This investment strategy beats 99% of traders...",
            "Why your savings account is making you poorer...",
        ],
    },
    "health": {
        "tone": "encouraging and science-backed",
        "style": "health and wellness advice",
        "themes": ["fitness", "nutrition", "sleep", "longevity", "mental health"],
        "example_hooks": [
            "Doctors don't want you to know this...",
            "The morning habit that adds years to your life...",
            "Why everything you know about diet is wrong...",
        ],
    },
    "relationships": {
        "tone": "empathetic and insightful",
        "style": "relationship advice and emotional intelligence",
        "themes": ["communication", "love", "trust", "boundaries", "connection"],
        "example_hooks": [
            "The one thing that kills every relationship...",
            "High-value people never do this...",
            "The secret to being unforgettable...",
        ],
    },
    "productivity": {
        "tone": "actionable and energetic",
        "style": "productivity hacks and time management",
        "themes": ["focus", "efficiency", "habits", "goals", "systems"],
        "example_hooks": [
            "Delete these apps immediately...",
            "The 5AM routine that changed my life...",
            "Why working harder is making you fail...",
        ],
    },
    "technology": {
        "tone": "exciting and forward-thinking",
        "style": "tech trends and innovation",
        "themes": ["AI", "future", "innovation", "digital", "automation"],
        "example_hooks": [
            "AI will replace these jobs by 2025...",
            "The technology billionaires are betting on...",
            "This invention will change everything...",
        ],
    },
    "history": {
        "tone": "dramatic and educational",
        "style": "historical stories and lessons",
        "themes": ["war", "leaders", "civilizations", "turning points", "legacy"],
        "example_hooks": [
            "The decision that changed history forever...",
            "No one expected what happened next...",
            "The forgotten story of...",
        ],
    },
    "custom": {
        "tone": "engaging and informative",
        "style": "general educational content",
        "themes": ["knowledge", "insights", "facts", "stories"],
        "example_hooks": [
            "Here's something most people don't know...",
            "This will change how you think about...",
            "The truth about...",
        ],
    },
}


# ============================================
# LLM Client Functions
# ============================================
def get_llm_client():
    """Get the appropriate LLM client based on available API keys"""
    if settings.OPENAI_API_KEY:
        return "openai"
    elif settings.ANTHROPIC_API_KEY:
        return "anthropic"
    else:
        raise PermanentFailure("No LLM API key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)")


def call_openai(prompt: str, system_prompt: str) -> str:
    """Call OpenAI GPT-4 API"""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4o
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=2000,
        )

        return response.choices[0].message.content

    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise RetryableFailure(f"OpenAI API error: {str(e)}")


def call_anthropic(prompt: str, system_prompt: str) -> str:
    """Call Anthropic Claude API"""
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-3-haiku-20240307",  # Using Haiku for speed, can upgrade to Sonnet
            max_tokens=2000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )

        return response.content[0].text

    except Exception as e:
        logger.error(f"Anthropic API error: {str(e)}")
        raise RetryableFailure(f"Anthropic API error: {str(e)}")


def call_llm(prompt: str, system_prompt: str) -> str:
    """Call the configured LLM provider"""
    provider = get_llm_client()

    if provider == "openai":
        return call_openai(prompt, system_prompt)
    else:
        return call_anthropic(prompt, system_prompt)


# ============================================
# Script Generation Functions
# ============================================
def build_script_prompt(
    genre_id: str,
    topic: Optional[str],
    duration: int,
    preset_id: Optional[str] = None,
) -> tuple[str, str]:
    """Build the system and user prompts for script generation"""

    genre_config = GENRE_CONFIGS.get(genre_id, GENRE_CONFIGS["custom"])

    # Calculate target scene count and words
    num_scenes = calculate_scene_count(duration)
    words_per_scene = 15  # ~4 seconds of speech at 150 WPM
    total_words = num_scenes * words_per_scene

    system_prompt = f"""You are an expert short-form video scriptwriter specializing in viral, engaging content for social media (TikTok, Instagram Reels, YouTube Shorts).

Your writing style is:
- {genre_config['tone']}
- Focused on {genre_config['style']}
- Uses hooks that grab attention in the first 2 seconds
- Punchy, concise sentences
- Builds tension and delivers value
- Ends with impact or call to reflection

Key themes: {', '.join(genre_config['themes'])}

CRITICAL RULES:
1. Each scene narration should be ~{words_per_scene} words (4-6 seconds when spoken)
2. Total script should be ~{total_words} words for {duration}s video
3. Start with an POWERFUL hook that stops scrolling
4. Use short, punchy sentences
5. Include emotional peaks and valleys
6. End with memorable impact

You MUST respond with valid JSON only. No other text."""

    example_hook = genre_config['example_hooks'][0] if genre_config['example_hooks'] else "Did you know..."

    topic_instruction = f'Create a script about: "{topic}"' if topic else f"Create a compelling script in the {genre_id} genre. Choose a specific, engaging topic."

    user_prompt = f"""{topic_instruction}

Video Duration: {duration} seconds
Number of Scenes: {num_scenes}
Style: {genre_config['style']}

Generate a complete video script with {num_scenes} scenes.

Respond with this exact JSON structure:
{{
    "title": "Short catchy title for the video",
    "hook": "The opening hook (first 2 seconds)",
    "full_script": "The complete narration script as one flowing text",
    "scenes": [
        {{
            "scene_id": 1,
            "narration": "Scene 1 narration text (~{words_per_scene} words)",
            "visual_prompt": "Detailed visual description for AI image/video generation. Be specific about: subject, action, camera angle, lighting, mood, style",
            "duration": {duration // num_scenes}
        }},
        // ... more scenes
    ]
}}

Example hook styles for inspiration: {example_hook}

Remember: Make it VIRAL-WORTHY. Hook viewers instantly, deliver value, end with impact."""

    return system_prompt, user_prompt


def calculate_scene_count(duration: int) -> int:
    """Calculate optimal number of scenes based on duration"""
    if duration <= 15:
        return 3
    elif duration <= 30:
        return 5
    elif duration <= 45:
        return 7
    else:  # 60 seconds
        return 9


def parse_llm_response(response: str, duration: int, genre_id: str) -> Dict[str, Any]:
    """Parse and validate LLM response"""
    try:
        # Try to extract JSON from response
        response = response.strip()

        # Handle markdown code blocks
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]

        response = response.strip()

        data = json.loads(response)

        # Validate required fields
        if "scenes" not in data:
            raise ValueError("Missing 'scenes' in response")

        scenes = data["scenes"]
        if not isinstance(scenes, list) or len(scenes) < 2:
            raise ValueError("Invalid scenes array")

        # Validate each scene
        for i, scene in enumerate(scenes):
            if "narration" not in scene:
                scene["narration"] = f"Scene {i+1} content"
            if "visual_prompt" not in scene:
                scene["visual_prompt"] = f"Cinematic scene {i+1}"
            if "scene_id" not in scene:
                scene["scene_id"] = i + 1
            if "duration" not in scene:
                scene["duration"] = duration // len(scenes)

        # Build full script if not provided
        if "full_script" not in data:
            data["full_script"] = " ".join(s["narration"] for s in scenes)

        return data

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM JSON response: {str(e)}")
        # Create fallback structure
        return create_fallback_script(duration, genre_id)


def create_fallback_script(duration: int, genre_id: str) -> Dict[str, Any]:
    """Create a basic fallback script if LLM fails"""
    num_scenes = calculate_scene_count(duration)
    genre_config = GENRE_CONFIGS.get(genre_id, GENRE_CONFIGS["custom"])

    scenes = []
    for i in range(num_scenes):
        scenes.append({
            "scene_id": i + 1,
            "narration": f"Scene {i + 1}: {genre_config['themes'][i % len(genre_config['themes'])]} insight.",
            "visual_prompt": f"Cinematic {genre_config['style']} scene with dramatic lighting",
            "duration": duration // num_scenes,
        })

    return {
        "title": f"{genre_id.title()} Wisdom",
        "hook": genre_config['example_hooks'][0] if genre_config['example_hooks'] else "Listen to this...",
        "full_script": " ".join(s["narration"] for s in scenes),
        "scenes": scenes,
    }


# ============================================
# Main Worker Function
# ============================================
@worker_task(
    worker_name="llm_script_generator",
    max_retries=2,
)
def generate_script(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a video script based on genre and topic.

    Input job_data keys:
        - job_id: Unique job identifier
        - user_id: User ID
        - genre_id: Content genre (motivation, business, etc.)
        - topic: Optional custom topic
        - duration: Target duration in seconds
        - preset_id: Visual preset ID

    Output (merged into job_data):
        - script: Generated script text
        - scenes: List of scene dictionaries
        - title: Video title
        - hook: Opening hook
    """
    job_id = job_data.get("job_id")
    genre_id = job_data.get("genre_id", "motivation")
    topic = job_data.get("topic")
    duration = job_data.get("duration", 30)
    preset_id = job_data.get("preset_id")

    logger.info(f"[{job_id}] Generating script for genre={genre_id}, topic={topic}, duration={duration}s")

    # Update progress - Starting script generation
    update_job_progress(5, PipelineStage.SCRIPT_GENERATION.value)

    try:
        # Build prompts
        system_prompt, user_prompt = build_script_prompt(
            genre_id=genre_id,
            topic=topic,
            duration=duration,
            preset_id=preset_id,
        )

        logger.info(f"[{job_id}] Calling LLM API...")

        # Call LLM
        llm_response = call_llm(user_prompt, system_prompt)

        logger.info(f"[{job_id}] LLM response received, parsing...")

        # Parse response
        script_data = parse_llm_response(llm_response, duration, genre_id)

        scenes = script_data["scenes"]
        full_script = script_data.get("full_script", "")
        title = script_data.get("title", f"{genre_id.title()} Video")
        hook = script_data.get("hook", scenes[0]["narration"][:50] if scenes else "")

        logger.info(f"[{job_id}] Generated {len(scenes)} scenes successfully")

        # Update progress - Script complete
        update_job_progress(10, PipelineStage.SCRIPT_GENERATION.value)

        # Save script and scenes to database
        # Extract the actual UUID from job_data if available
        db_job_id = job_data.get("db_job_id") or job_data.get("video_job_id")
        if db_job_id:
            update_video_job_db(
                job_id=str(db_job_id),
                status="processing",
                progress=10,
                script=full_script,
                scenes=scenes,
            )
            logger.info(f"[{job_id}] Saved script and scenes to database")

        # Prepare result
        result = {
            "script": full_script,
            "scenes": scenes,
            "title": title,
            "hook": hook,
        }

        # Enqueue next stage (scene parsing/enhancement)
        enqueue_next_stage(job_data, PipelineStage.SCRIPT_GENERATION, result)

        return result

    except PermanentFailure:
        # Re-raise permanent failures (no API key configured)
        raise
    except RetryableFailure:
        # Re-raise retryable failures
        raise
    except Exception as e:
        logger.error(f"[{job_id}] LLM generation failed: {str(e)}")
        raise RetryableFailure(f"LLM generation error: {str(e)}")
