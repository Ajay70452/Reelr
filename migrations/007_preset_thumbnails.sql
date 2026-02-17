-- ============================================
-- ClipKing Database Migration
-- Version: 007
-- Date: 2026-01-31
-- Description: Add thumbnail URLs to AI generation presets
-- ============================================

-- Update AI generation presets with thumbnail URLs
-- Thumbnails are served from /presets/ in the frontend public folder

UPDATE presets SET thumbnail_url = '/presets/cinematic.jpg' WHERE id = 'cinematic';
UPDATE presets SET thumbnail_url = '/presets/digital_art.jpg' WHERE id = 'digital_art';
UPDATE presets SET thumbnail_url = '/presets/neon_futuristic.jpg' WHERE id = 'neon_futuristic';
UPDATE presets SET thumbnail_url = '/presets/4k-realisitc.jpg' WHERE id = 'realistic_4k';
UPDATE presets SET thumbnail_url = '/presets/comic_book.jpg' WHERE id = 'comic_book';
UPDATE presets SET thumbnail_url = '/presets/anime.jpg' WHERE id = 'anime';
UPDATE presets SET thumbnail_url = '/presets/cartoon.jpg' WHERE id = 'cartoon';
UPDATE presets SET thumbnail_url = '/presets/soft_aesthetic.jpg' WHERE id = 'soft_aesthetic';
UPDATE presets SET thumbnail_url = '/presets/collage.jpg' WHERE id = 'collage';
UPDATE presets SET thumbnail_url = '/presets/line_art.jpg' WHERE id = 'line_art';
UPDATE presets SET thumbnail_url = '/presets/japenese_ink.jpg' WHERE id = 'sumi_e';
UPDATE presets SET thumbnail_url = '/presets/kawaii.jpg' WHERE id = 'kawaii';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed: Preset thumbnails added';
END $$;
