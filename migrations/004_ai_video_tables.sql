-- Migration 004: AI Video Generation Tables
-- Creates tables for AI Video Generator (Sora 2, Veo 3, Kling 2.5, LTX-2)

-- AI Video Jobs table
CREATE TABLE IF NOT EXISTS ai_video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Generation parameters
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    model VARCHAR(50) NOT NULL,  -- sora2, veo3, kling25, ltx2

    -- Model-specific options stored as JSON
    options JSONB DEFAULT '{}',

    -- Common settings
    duration INTEGER DEFAULT 8,
    aspect_ratio VARCHAR(50) DEFAULT '16:9',
    resolution VARCHAR(50) DEFAULT '1080p',

    -- Status tracking
    status VARCHAR(50) DEFAULT 'queued',  -- queued, processing, completed, failed
    progress INTEGER DEFAULT 0,
    error_message TEXT,

    -- Fal.ai job tracking
    fal_request_id VARCHAR(255),

    -- Result
    video_url TEXT,
    thumbnail_url TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Videos table
CREATE TABLE IF NOT EXISTS ai_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES ai_video_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Video data
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    prompt TEXT,
    model VARCHAR(50),
    duration INTEGER,
    aspect_ratio VARCHAR(50),
    resolution VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_user_id ON ai_video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_status ON ai_video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_created_at ON ai_video_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_videos_user_id ON ai_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_videos_job_id ON ai_videos(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_videos_created_at ON ai_videos(created_at);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ai_video_jobs_updated_at ON ai_video_jobs;
CREATE TRIGGER update_ai_video_jobs_updated_at
    BEFORE UPDATE ON ai_video_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
