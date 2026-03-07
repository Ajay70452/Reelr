-- migration/011_update_music_seed.sql
-- Ensure columns exist
ALTER TABLE music ADD COLUMN IF NOT EXISTS genre VARCHAR;
ALTER TABLE music ADD COLUMN IF NOT EXISTS mood VARCHAR;

-- Clear old dummy music names and insert the actual S3 tracks
DELETE FROM music WHERE id != 'none';

INSERT INTO music (id, display_name, category, genre, mood, is_premium) VALUES
  ('another_love', 'Another Love', 'pop', 'pop', 'emotional', false),
  ('blade_runner_2049', 'Blade Runner 2049', 'cinematic', 'cinematic', 'epic', true),
  ('carman_prelude', 'Carman Prelude', 'classical', 'classical', 'dramatic', false),
  ('else_paris_extended', 'Else - Paris Extended', 'electronic', 'electronic', 'chill', false),
  ('else_paris', 'Else - Paris', 'electronic', 'electronic', 'chill', false),
  ('fur_elise', 'Fur Elise', 'classical', 'classical', 'calm', false),
  ('snowfall', 'Snowfall', 'ambient', 'ambient', 'calm', false)
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  genre = EXCLUDED.genre,
  mood = EXCLUDED.mood,
  is_premium = EXCLUDED.is_premium;
