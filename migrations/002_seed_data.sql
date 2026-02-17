-- ============================================
-- ClipKing Database - Seed Data
-- Version: 1.0
-- Date: 2026-01-23
-- ============================================

-- ============================================
-- SEED: genres
-- ============================================
INSERT INTO genres (id, display_name, description) VALUES
  ('motivation', 'Motivation', 'Inspiring content about success and personal growth'),
  ('business', 'Business & Money', 'Entrepreneurship, finance, and business strategies'),
  ('psychology', 'Psychology', 'Human behavior, mental health, and psychology facts'),
  ('philosophy', 'Philosophy', 'Philosophical ideas and deep thinking'),
  ('horror', 'Horror', 'Scary stories and creepy content'),
  ('animals', 'Animal Facts', 'Fascinating facts about animals and nature'),
  ('history', 'History Facts', 'Historical events and stories'),
  ('relationships', 'Relationship Advice', 'Dating, love, and relationship tips'),
  ('facts', 'Fun Facts', 'Interesting and surprising facts'),
  ('technology', 'Technology', 'Tech news, AI, and innovation'),
  ('health', 'Health & Fitness', 'Wellness, fitness, and health tips'),
  ('comedy', 'Comedy & Humor', 'Funny and entertaining content')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: visual_styles
-- ============================================
INSERT INTO visual_styles (id, display_name) VALUES
  ('moving_images', 'Moving Images'),
  ('cinematic_video', 'Cinematic AI Video'),
  ('stock_default', 'Stock Footage')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: presets (Moving Images)
-- ============================================
INSERT INTO presets (id, visual_style_id, display_name, description) VALUES
  ('cinematic_mi', 'moving_images', 'Cinematic', 'Dramatic lighting and epic compositions'),
  ('aesthetic_mi', 'moving_images', 'Aesthetic', 'Dreamy, colorful, and visually pleasing'),
  ('anime_mi', 'moving_images', 'Anime', 'Japanese animation style'),
  ('neon_mi', 'moving_images', 'Neon Glow', 'Cyberpunk vibes with neon colors'),
  ('minimal_mi', 'moving_images', 'Minimal Clean', 'Simple and modern design'),
  ('dark_mi', 'moving_images', 'Dark Moody', 'Dark tones with dramatic atmosphere'),
  ('vaporwave_mi', 'moving_images', 'Vaporwave', 'Retro 80s/90s aesthetic'),
  ('nature_mi', 'moving_images', 'Nature', 'Natural landscapes and outdoor scenes')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: presets (Cinematic Video)
-- ============================================
INSERT INTO presets (id, visual_style_id, display_name, description) VALUES
  ('cinematic_cv', 'cinematic_video', 'Cinematic', 'Hollywood-style cinematic shots'),
  ('pov_cv', 'cinematic_video', 'POV Movement', 'First-person perspective movement'),
  ('hyperreal_cv', 'cinematic_video', 'Hyperrealistic', 'Ultra-realistic visuals'),
  ('dreamy_cv', 'cinematic_video', 'Dreamy Surreal', 'Surreal and dreamlike atmosphere'),
  ('action_cv', 'cinematic_video', 'Action Dynamic', 'Fast-paced action sequences'),
  ('nature_cv', 'cinematic_video', 'Nature Documentary', 'Natural world documentary style')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: quality_options
-- ============================================
INSERT INTO quality_options (id, display_name, credits_required) VALUES
  ('standard', 'Standard', 2),
  ('premium', 'Premium', 5),
  ('ultra_premium', 'Ultra Premium', 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: voices
-- ============================================
INSERT INTO voices (id, display_name, provider, is_premium) VALUES
  ('male_confident', 'Male - Confident', 'elevenlabs', false),
  ('male_deep', 'Male - Deep Narrator', 'elevenlabs', false),
  ('female_friendly', 'Female - Friendly', 'elevenlabs', false),
  ('female_calm', 'Female - Calm', 'elevenlabs', false),
  ('male_energetic', 'Male - Energetic', 'elevenlabs', false),
  ('female_professional', 'Female - Professional', 'elevenlabs', true),
  ('male_storyteller', 'Male - Storyteller', 'elevenlabs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: music
-- ============================================
INSERT INTO music (id, display_name, category, is_premium) VALUES
  ('calm_ambient', 'Calm Ambient', 'ambient', false),
  ('energetic_beat', 'Energetic Beat', 'upbeat', false),
  ('emotional_piano', 'Emotional Piano', 'emotional', false),
  ('trap_beat', 'Trap Beat', 'trap', false),
  ('lo_fi_chill', 'Lo-Fi Chill', 'lo-fi', false),
  ('epic_cinematic', 'Epic Cinematic', 'cinematic', true),
  ('none', 'No Music', 'none', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'Genres: 12 entries';
  RAISE NOTICE 'Visual Styles: 3 entries';
  RAISE NOTICE 'Presets: 14 entries';
  RAISE NOTICE 'Quality Options: 3 entries';
  RAISE NOTICE 'Voices: 7 entries';
  RAISE NOTICE 'Music: 7 entries';
END $$;
