-- Add duration column to script_to_video_jobs
ALTER TABLE script_to_video_jobs ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;
