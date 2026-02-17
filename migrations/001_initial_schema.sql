-- ============================================
-- ClipKing Database Schema - Initial Migration
-- Version: 1.0
-- Date: 2026-01-23
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- Stores user account information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  auth_provider TEXT DEFAULT 'supabase',
  created_at TIMESTAMP DEFAULT NOW(),
  plan TEXT DEFAULT 'free'
);

-- ============================================
-- TABLE: credits
-- Tracks user credit balances
-- ============================================
CREATE TABLE IF NOT EXISTS credits (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_left INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- ============================================
-- TABLE: genres
-- Content categories for video generation
-- ============================================
CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT
);

-- ============================================
-- TABLE: visual_styles
-- Main visual style options (Moving Images, Cinematic, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS visual_styles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);

-- ============================================
-- TABLE: presets
-- Visual presets for each style
-- ============================================
CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  visual_style_id TEXT REFERENCES visual_styles(id),
  display_name TEXT NOT NULL,
  description TEXT
);

-- ============================================
-- TABLE: quality_options
-- Quality tiers and their credit costs
-- ============================================
CREATE TABLE IF NOT EXISTS quality_options (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  credits_required INT NOT NULL
);

-- ============================================
-- TABLE: voices
-- Text-to-speech voice options
-- ============================================
CREATE TABLE IF NOT EXISTS voices (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE
);

-- ============================================
-- TABLE: music
-- Background music options
-- ============================================
CREATE TABLE IF NOT EXISTS music (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT,
  is_premium BOOLEAN DEFAULT FALSE
);

-- ============================================
-- TABLE: video_jobs
-- Core table tracking video generation jobs
-- ============================================
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- User selections
  genre_id TEXT REFERENCES genres(id),
  visual_style_id TEXT REFERENCES visual_styles(id),
  preset_id TEXT REFERENCES presets(id),
  quality_id TEXT REFERENCES quality_options(id),
  voice_id TEXT REFERENCES voices(id),
  music_id TEXT REFERENCES music(id),

  -- Generation data
  topic TEXT,
  script TEXT,
  scenes JSONB,

  -- Settings
  duration INT,
  aspect_ratio TEXT,
  advanced JSONB,

  -- Status tracking
  status TEXT DEFAULT 'queued',
  progress INT DEFAULT 0,
  error_message TEXT,
  fallback_used BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: videos
-- Final rendered video outputs
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES video_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INT,
  resolution TEXT DEFAULT '1080p',
  size_mb DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: billing_history
-- Payment and subscription tracking
-- ============================================
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  credits_added INT,
  plan TEXT,
  provider TEXT,
  external_ref TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: worker_logs
-- Worker execution logs for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS worker_logs (
  id SERIAL PRIMARY KEY,
  job_id UUID REFERENCES video_jobs(id),
  worker_type TEXT,
  log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance optimization
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_user ON video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON video_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_worker_logs_job ON worker_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_history(user_id);

-- ============================================
-- TRIGGERS for automatic timestamp updates
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_jobs_updated_at 
  BEFORE UPDATE ON video_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'ClipKing database schema created successfully!';
END $$;
