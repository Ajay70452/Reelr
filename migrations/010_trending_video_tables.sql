-- Migration 010: Trending Video Generation Tables
-- Creates table for Trending Video feature (Kling 3.0 powered)

-- Trending Video Jobs table
CREATE TABLE IF NOT EXISTS trending_video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Flow type: "theme" or "custom"
    flow_type VARCHAR(20) NOT NULL,

    -- Theme mode fields
    theme_id VARCHAR(100),

    -- Custom mode fields
    prompt TEXT,
    reference_video_url TEXT,

    -- Shared fields
    reference_image_url TEXT NOT NULL,
    composed_prompt TEXT,
    intensity VARCHAR(20) DEFAULT 'normal',
    duration INTEGER DEFAULT 8,
    aspect_ratio VARCHAR(20) DEFAULT '9:16',

    -- Status tracking
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Fal.ai tracking
    fal_request_id VARCHAR(255),

    -- Result
    video_url TEXT,
    thumbnail_url TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trending_video_jobs_user_id ON trending_video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_video_jobs_status ON trending_video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_trending_video_jobs_created_at ON trending_video_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_trending_video_jobs_flow_type ON trending_video_jobs(flow_type);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_trending_video_jobs_updated_at ON trending_video_jobs;
CREATE TRIGGER update_trending_video_jobs_updated_at
    BEFORE UPDATE ON trending_video_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
