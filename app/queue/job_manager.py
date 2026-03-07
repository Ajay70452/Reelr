"""
Job Manager
Handles video generation job lifecycle and pipeline orchestration
"""

import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum
from rq.job import Job

from app.queue.queues import QueueNames, enqueue_job, get_job


class JobStatus(str, Enum):
    """Video generation job statuses"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineStage(str, Enum):
    """Pipeline stages for progress tracking"""
    QUEUED = "queued"
    SCRIPT_GENERATION = "script_generation"
    SCENE_PARSING = "scene_parsing"
    VISUAL_GENERATION = "visual_generation"
    AUDIO_GENERATION = "audio_generation"
    CAPTION_GENERATION = "caption_generation"
    RENDERING = "rendering"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"


# Progress percentages for each stage
STAGE_PROGRESS: Dict[PipelineStage, int] = {
    PipelineStage.QUEUED: 0,
    PipelineStage.SCRIPT_GENERATION: 10,
    PipelineStage.SCENE_PARSING: 20,
    PipelineStage.VISUAL_GENERATION: 50,
    PipelineStage.AUDIO_GENERATION: 65,
    PipelineStage.CAPTION_GENERATION: 75,
    PipelineStage.RENDERING: 90,
    PipelineStage.FINALIZING: 95,
    PipelineStage.COMPLETED: 100,
    PipelineStage.FAILED: -1,
}


def generate_job_id() -> str:
    """Generate a unique job ID"""
    return f"job_{uuid.uuid4().hex[:12]}"


def create_video_job(
    user_id: str,
    genre_id: str,
    visual_style_id: str,
    preset_id: str,
    quality_id: str,
    voice_id: str,
    music_id: str,
    topic: Optional[str] = None,
    duration: int = 30,
    aspect_ratio: str = "9:16",
    advanced_options: Optional[Dict[str, Any]] = None,
    is_premium: bool = False,
    db_job_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a new video generation job and enqueue it.

    Args:
        db_job_id: Optional database VideoJob UUID for linking queue job to DB record

    Returns:
        Dictionary with job_id and initial status
    """
    from app.workers.llm_worker import generate_script

    job_id = generate_job_id()

    # Job payload containing all video generation parameters
    job_data = {
        "job_id": job_id,
        "db_job_id": db_job_id,  # Link to database VideoJob record
        "user_id": user_id,
        "genre_id": genre_id,
        "visual_style_id": visual_style_id,
        "preset_id": preset_id,
        "quality_id": quality_id,
        "voice_id": voice_id,
        "music_id": music_id,
        "topic": topic,
        "duration": duration,
        "aspect_ratio": aspect_ratio,
        "advanced": advanced_options or {
            "emphasis_words": True,
            "fast_cuts": False,
            "auto_effects": True,
            "auto_captions": True,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stage": PipelineStage.QUEUED.value,
        "progress": 0,
        "fallback_used": False,
    }

    # Choose queue based on premium status
    queue = QueueNames.HIGH_PRIORITY if is_premium else QueueNames.LLM

    # Enqueue the first stage (LLM script generation)
    job = enqueue_job(
        queue_name=queue,
        func=generate_script,
        job_data=job_data,
        job_id=job_id,
        meta={
            "user_id": user_id,
            "db_job_id": db_job_id,
            "stage": PipelineStage.QUEUED.value,
            "visual_style": visual_style_id,
        },
    )

    return {
        "job_id": job_id,
        "db_job_id": db_job_id,
        "status": JobStatus.QUEUED.value,
        "stage": PipelineStage.QUEUED.value,
        "progress": 0,
    }


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the current status of a video generation job.

    Returns:
        Job status dictionary or None if not found
    """
    job = get_job(job_id)

    if not job:
        return None

    # Determine status based on RQ job state
    if job.is_finished:
        result = job.result or {}
        return {
            "job_id": job_id,
            "status": JobStatus.COMPLETED.value,
            "stage": PipelineStage.COMPLETED.value,
            "progress": 100,
            "video_url": result.get("video_url"),
            "thumbnail_url": result.get("thumbnail_url"),
        }
    elif job.is_failed:
        return {
            "job_id": job_id,
            "status": JobStatus.FAILED.value,
            "stage": PipelineStage.FAILED.value,
            "progress": 0,
            "error": job.exc_info,
            "fallback_used": job.meta.get("fallback_used", False),
        }
    elif job.is_started:
        stage = job.meta.get("stage", PipelineStage.PROCESSING.value)
        return {
            "job_id": job_id,
            "status": JobStatus.PROCESSING.value,
            "stage": stage,
            "progress": STAGE_PROGRESS.get(PipelineStage(stage), 0),
        }
    else:
        # Queued or deferred
        return {
            "job_id": job_id,
            "status": JobStatus.QUEUED.value,
            "stage": PipelineStage.QUEUED.value,
            "progress": 0,
        }


def cancel_job(job_id: str) -> bool:
    """
    Cancel a job if it hasn't started yet.

    Returns:
        True if cancelled, False otherwise
    """
    job = get_job(job_id)

    if not job:
        return False

    if job.is_queued:
        job.cancel()
        return True

    return False


def update_job_stage(job: Job, stage: PipelineStage) -> None:
    """Update the current stage of a job"""
    job.meta["stage"] = stage.value
    job.meta["progress"] = STAGE_PROGRESS.get(stage, 0)
    job.meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    job.save_meta()


def mark_job_fallback(job: Job, fallback_type: str) -> None:
    """Mark that a fallback was used for this job"""
    job.meta["fallback_used"] = True
    job.meta["fallback_type"] = fallback_type
    job.save_meta()


def enqueue_next_stage(
    job_data: Dict[str, Any],
    current_stage: PipelineStage,
    result_data: Optional[Dict[str, Any]] = None,
) -> Optional[Job]:
    """
    Enqueue the next stage in the pipeline based on current stage.

    Args:
        job_data: The job payload data
        current_stage: The stage that just completed
        result_data: Results from the current stage to merge into job_data

    Returns:
        The next Job instance or None if pipeline is complete
    """
    from app.workers import (
        llm_worker,
        scene_worker,
        visual_worker,
        audio_worker,
        caption_worker,
        render_worker,
        finalize_worker,
    )

    # Merge results into job data
    if result_data:
        job_data.update(result_data)

    # Define pipeline flow
    PIPELINE_FLOW = {
        PipelineStage.SCRIPT_GENERATION: (QueueNames.SCENE, scene_worker.parse_scenes),
        PipelineStage.SCENE_PARSING: (QueueNames.VISUAL, visual_worker.generate_visuals),
        PipelineStage.VISUAL_GENERATION: (QueueNames.AUDIO, audio_worker.generate_audio),
        PipelineStage.AUDIO_GENERATION: (QueueNames.CAPTION, caption_worker.generate_captions),
        PipelineStage.CAPTION_GENERATION: (QueueNames.RENDER, render_worker.render_video),
        PipelineStage.RENDERING: (QueueNames.FINALIZE, finalize_worker.finalize_video),
    }

    next_stage = PIPELINE_FLOW.get(current_stage)

    if not next_stage:
        # Pipeline complete or unknown stage
        return None

    queue_name, worker_func = next_stage

    return enqueue_job(
        queue_name=queue_name,
        func=worker_func,
        job_data=job_data,
        job_id=job_data["job_id"],
        meta={
            "user_id": job_data["user_id"],
            "stage": current_stage.value,
            "visual_style": job_data.get("visual_style_id"),
        },
    )
