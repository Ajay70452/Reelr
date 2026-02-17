-- ============================================
-- ClipKing Database Migration
-- Version: 005
-- Date: 2026-01-31
-- Description: Add prompt columns to presets table for AI generation
-- ============================================

-- Add prompt_prefix column (style/prompt enhancer that goes before user prompt)
ALTER TABLE presets ADD COLUMN IF NOT EXISTS prompt_prefix TEXT;

-- Add prompt_suffix column (style/prompt enhancer that goes after user prompt)
ALTER TABLE presets ADD COLUMN IF NOT EXISTS prompt_suffix TEXT;

-- Add negative_prompt column (things to avoid in generation)
ALTER TABLE presets ADD COLUMN IF NOT EXISTS negative_prompt TEXT;

-- Add thumbnail_url for visual representation in preset selection
ALTER TABLE presets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Update existing presets with prompt engineering values
-- Based on preset_engineering.md specifications

-- Moving Images Presets
UPDATE presets SET
    prompt_prefix = 'cinematic film still, 85mm lens, shallow depth of field, realistic skin textures, dramatic lighting, volumetric light rays, bokeh, anamorphic look, ultra high quality,',
    prompt_suffix = ', professional photography, cinematic color grading',
    negative_prompt = 'cartoonish, flat lighting, low resolution, distorted face, oversaturated, deformed hands'
WHERE id = 'cinematic_mi';

UPDATE presets SET
    prompt_prefix = 'dreamy aesthetic shot, soft glowing light, pastel palette, gentle gradients, whimsical tone, clean and airy composition,',
    prompt_suffix = ', aesthetic vibes, beautiful colors',
    negative_prompt = 'harsh lighting, dark tones, gritty textures'
WHERE id = 'aesthetic_mi';

UPDATE presets SET
    prompt_prefix = 'anime style illustration, cel shading, large expressive eyes, clean outlines, vibrant soft gradients, studio ghibli inspired background,',
    prompt_suffix = ', anime aesthetic, japanese animation style',
    negative_prompt = 'realistic face textures, oily skin, photoreal shadows'
WHERE id = 'anime_mi';

UPDATE presets SET
    prompt_prefix = 'cyberpunk neon aesthetic, glowing lights, dark city ambiance, reflective surfaces, moody atmosphere, sharp contrast, futuristic color palette,',
    prompt_suffix = ', neon glow, vibrant colors, cyberpunk style',
    negative_prompt = 'washed out colors, low contrast, daylight, plain backgrounds'
WHERE id = 'neon_mi';

UPDATE presets SET
    prompt_prefix = 'minimalist design, clean composition, simple shapes, neutral palette, modern aesthetic, elegant simplicity,',
    prompt_suffix = ', minimal and clean, modern design',
    negative_prompt = 'cluttered, complex patterns, busy backgrounds'
WHERE id = 'minimal_mi';

UPDATE presets SET
    prompt_prefix = 'dark moody atmosphere, dramatic shadows, low key lighting, mysterious ambiance, cinematic noir style,',
    prompt_suffix = ', dark aesthetic, moody tones',
    negative_prompt = 'bright colors, cheerful, overexposed'
WHERE id = 'dark_mi';

UPDATE presets SET
    prompt_prefix = 'vaporwave aesthetic, retro 80s style, pastel pinks and blues, nostalgic vibes, synthwave colors,',
    prompt_suffix = ', vaporwave style, retro aesthetic',
    negative_prompt = 'modern style, realistic colors, natural lighting'
WHERE id = 'vaporwave_mi';

UPDATE presets SET
    prompt_prefix = 'natural landscape photography, outdoor scene, organic textures, natural lighting, scenic beauty,',
    prompt_suffix = ', nature photography, outdoor aesthetic',
    negative_prompt = 'urban, artificial, synthetic textures'
WHERE id = 'nature_mi';

-- Cinematic Video Presets
UPDATE presets SET
    prompt_prefix = 'Hollywood cinematic shot, professional film camera, dramatic lighting, movie scene quality,',
    prompt_suffix = ', cinematic film, professional production',
    negative_prompt = 'amateur, low quality, shaky cam, poor lighting'
WHERE id = 'cinematic_cv';

UPDATE presets SET
    prompt_prefix = 'first person point of view shot, immersive perspective, dynamic movement, action camera style,',
    prompt_suffix = ', POV shot, immersive experience',
    negative_prompt = 'third person, static shot, distant view'
WHERE id = 'pov_cv';

UPDATE presets SET
    prompt_prefix = 'ultra realistic portrait, 4k detail, crisp textures, natural lighting, photorealistic skin, studio grade realism,',
    prompt_suffix = ', hyperrealistic, photorealistic quality',
    negative_prompt = 'anime, cartoon, painterly, oversharpen, uncanny valley'
WHERE id = 'hyperreal_cv';

UPDATE presets SET
    prompt_prefix = 'surreal dreamscape, ethereal atmosphere, soft focus, fantasy elements, dream-like quality,',
    prompt_suffix = ', dreamy aesthetic, surreal vibes',
    negative_prompt = 'realistic, harsh, grounded, mundane'
WHERE id = 'dreamy_cv';

UPDATE presets SET
    prompt_prefix = 'action sequence, dynamic movement, fast-paced energy, dramatic angles, high intensity,',
    prompt_suffix = ', action shot, dynamic energy',
    negative_prompt = 'static, slow, calm, peaceful'
WHERE id = 'action_cv';

UPDATE presets SET
    prompt_prefix = 'nature documentary style, wildlife cinematography, natural world, planet earth quality,',
    prompt_suffix = ', documentary style, nature film',
    negative_prompt = 'urban, artificial, studio, indoor'
WHERE id = 'nature_cv';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 005 completed: Preset prompt columns added';
END $$;
