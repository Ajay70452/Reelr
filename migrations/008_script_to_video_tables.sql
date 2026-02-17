-- Migration: 008_script_to_video_tables
-- Description: Create tables for Script-to-Video feature (Moving Images V1)

-- Script-to-Video Jobs table
CREATE TABLE IF NOT EXISTS script_to_video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- User input
    script TEXT NOT NULL,
    media_type VARCHAR(50) DEFAULT 'moving_images',  -- moving_images, ai_video (future), stock_video (future)

    -- Settings
    preset_id VARCHAR(100) REFERENCES presets(id),
    image_model VARCHAR(50) DEFAULT 'flux-2-pro',
    aspect_ratio VARCHAR(10) DEFAULT '9:16',  -- 9:16, 16:9, 1:1
    consistent_character BOOLEAN DEFAULT FALSE,

    -- Audio (UI only in V1)
    bgm_id VARCHAR(100) REFERENCES music(id),
    voice_id VARCHAR(100) REFERENCES voices(id),

    -- Processed data
    normalized_lines JSONB,  -- Array of script lines
    scenes JSONB,  -- Array of scene objects with visual_intent
    character_anchor JSONB,  -- Character description for consistency

    -- Status tracking
    status VARCHAR(50) DEFAULT 'queued',  -- queued, normalizing, segmenting, generating_images, applying_motion, stitching, completed, failed
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    total_scenes INTEGER,
    completed_scenes INTEGER DEFAULT 0,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Script-to-Video outputs table
CREATE TABLE IF NOT EXISTS script_to_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES script_to_video_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Video data
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER,
    resolution VARCHAR(20),
    aspect_ratio VARCHAR(10),

    -- Metadata
    scene_count INTEGER,
    script_preview TEXT,  -- First 200 chars of script

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_script_to_video_jobs_user_id ON script_to_video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_script_to_video_jobs_status ON script_to_video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_script_to_videos_user_id ON script_to_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_script_to_videos_job_id ON script_to_videos(job_id);
