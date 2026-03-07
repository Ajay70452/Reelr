-- ============================================
-- Migration: Enable Row Level Security (RLS)
-- Description: Secures public tables by enabling RLS and adding appropriate policies.
-- Reference tables are read-only for everyone.
-- User-data tables are restricted to the authenticated user.
-- ============================================

-- 1. Reference Data Tables (Public Read-Only)
-- These tables contain data that all users should be able to read, but only admins/backend can write.

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to genres" ON genres;
CREATE POLICY "Allow public read-only access to genres" ON genres FOR SELECT USING (true);

ALTER TABLE music ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to music" ON music;
CREATE POLICY "Allow public read-only access to music" ON music FOR SELECT USING (true);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to presets" ON presets;
CREATE POLICY "Allow public read-only access to presets" ON presets FOR SELECT USING (true);

ALTER TABLE quality_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to quality_options" ON quality_options;
CREATE POLICY "Allow public read-only access to quality_options" ON quality_options FOR SELECT USING (true);


-- 2. User Data Tables (Owner Access Only)
-- These tables contain user-specific data and should only be readable/writable by the owner.

ALTER TABLE ai_video_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own ai_video_jobs" ON ai_video_jobs;
CREATE POLICY "Users can manage their own ai_video_jobs" ON ai_video_jobs USING (user_id = auth.uid());

ALTER TABLE ai_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own ai_videos" ON ai_videos;
CREATE POLICY "Users can manage their own ai_videos" ON ai_videos USING (user_id = auth.uid());

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own billing_history" ON billing_history;
CREATE POLICY "Users can manage their own billing_history" ON billing_history USING (user_id = auth.uid());

ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own credits" ON credits;
CREATE POLICY "Users can manage their own credits" ON credits USING (user_id = auth.uid());

ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own image_jobs" ON image_jobs;
CREATE POLICY "Users can manage their own image_jobs" ON image_jobs USING (user_id = auth.uid());

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own images" ON images;
CREATE POLICY "Users can manage their own images" ON images USING (user_id = auth.uid());

ALTER TABLE script_to_video_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own script_to_video_jobs" ON script_to_video_jobs;
CREATE POLICY "Users can manage their own script_to_video_jobs" ON script_to_video_jobs USING (user_id = auth.uid());

-- Optional: Secure the base users and video tables just in case they aren't already covered
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view and update their own record" ON users;
CREATE POLICY "Users can view and update their own record" ON users USING (id = auth.uid());

ALTER TABLE IF EXISTS video_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own video_jobs" ON video_jobs;
CREATE POLICY "Users can manage their own video_jobs" ON video_jobs USING (user_id = auth.uid());

ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own videos" ON videos;
CREATE POLICY "Users can manage their own videos" ON videos USING (user_id = auth.uid());

-- 3. More tables that were missed
ALTER TABLE script_to_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own script_to_videos" ON script_to_videos;
CREATE POLICY "Users can manage their own script_to_videos" ON script_to_videos USING (user_id = auth.uid());

ALTER TABLE trending_video_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own trending_video_jobs" ON trending_video_jobs;
CREATE POLICY "Users can manage their own trending_video_jobs" ON trending_video_jobs USING (user_id = auth.uid());

ALTER TABLE visual_styles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to visual_styles" ON visual_styles;
CREATE POLICY "Allow public read-only access to visual_styles" ON visual_styles FOR SELECT USING (true);

ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to voices" ON voices;
CREATE POLICY "Allow public read-only access to voices" ON voices FOR SELECT USING (true);

ALTER TABLE worker_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Backend can insert, no public access" ON worker_logs;
CREATE POLICY "Backend can insert, no public access" ON worker_logs FOR ALL USING (false); -- Backend using service role will bypass this
