-- ============================================
-- ClipKing Database Migration
-- Version: 006
-- Date: 2026-01-31
-- Description: Add AI generation presets (model-agnostic) for Image & Video generators
-- Based on new_preset_info.md production-level prompts
-- ============================================

-- Create a new visual style for AI generation presets (model-agnostic)
INSERT INTO visual_styles (id, display_name) VALUES
  ('ai_generation', 'AI Generation')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: AI Generation Presets (12 styles from preset_engineering.md)
-- These are model-agnostic and work with all AI models
-- ============================================

-- Preset 1: Cinematic
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('cinematic', 'ai_generation', 'Cinematic', 'Film-style, high-dynamic-range, realistic lighting, shallow depth-of-field',
   'cinematic portrait of the same subject, shot like a high-end movie still with a shallow depth of field using an 85mm lens, tightly focused subject with smooth background bokeh, dramatic 3-point lighting with warm key light and soft cool fill light, subtle volumetric atmospheric light rays, soft cinematic film grain, analog lens flares at practical light sources, rich but natural color grading with teal-orange contrast, slight gradient vignetting, studio level clarity and detail, photorealistic skin texture with visible pores and natural highlights, careful shadow shaping, emotional but grounded expression, high dynamic range lighting, editorial movie production aesthetic, ultra high quality,',
   '',
   'cartoonish, flat lighting, low resolution, distorted face, oversaturated, deformed hands')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 2: Digital Art
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('digital_art', 'ai_generation', 'Digital Art', 'Highly detailed digital illustration with soft shading',
   'highly detailed digital illustration of the same subject, painterly yet clean digital art style, soft controlled shading with smooth gradient transitions, vibrant but balanced color blends, refined facial proportions while preserving identity, clean sharp edges without photographic noise, softly stylized skin without realistic pores, gentle rim lighting to separate subject from background, modern concept art quality, polished illustration finish, consistent lighting, no photographic artifacts, high-resolution digital painting aesthetic,',
   '',
   'grainy, realistic textures, photographic look, glitch, chromatic aberration')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 3: Neon Futuristic
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('neon_futuristic', 'ai_generation', 'Neon Futuristic', 'Cyberpunk neon aesthetic with glowing lights',
   'cyberpunk-inspired futuristic portrait of the same subject, neon-lit environment with glowing accent lights, vibrant cyan, magenta, and electric blue highlights, dark moody ambiance with high contrast lighting, reflective light accents on skin and hair, subtle neon rim lighting outlining the subject, futuristic color grading, glossy atmospheric glow, cinematic cyberpunk mood, stylized but recognizable facial features, dramatic lighting emphasis, immersive sci-fi aesthetic,',
   '',
   'washed out colors, low contrast, daylight, plain backgrounds')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 4: 4K Realistic
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('realistic_4k', 'ai_generation', '4K Realistic', 'Ultra realistic with crisp 4K detail and natural lighting',
   'ultra-realistic high-resolution portrait of the same subject, true-to-life facial proportions, extremely detailed 4K skin texture with natural pores and fine details, clean realistic eye reflections, accurate natural lighting with soft shadows, professional studio-grade realism, neutral color grading, crisp but not oversharpened details, lifelike depth and clarity, photographic accuracy, preserving identity, pose, background, and clothing with maximum realism,',
   '',
   'anime, cartoon, painterly, oversharpen, uncanny valley')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 5: Comic Book
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('comic_book', 'ai_generation', 'Comic Book', 'Bold black outlines with vibrant flat colors and halftone shading',
   'comic book panel style illustration of the same subject, bold expressive black outlines defining facial features, simplified yet recognizable facial structure, vibrant flat color fills with limited shading, halftone dot textures in shadows, dramatic high-contrast lighting, stylized comic-style highlights, dynamic illustrated composition, graphic novel aesthetic, strong visual clarity, exaggerated expression while maintaining likeness,',
   '',
   'realistic skin texture, soft gradients, photographic lighting')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 6: Anime
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('anime', 'ai_generation', 'Anime', 'Japanese animation style with cel shading and expressive eyes',
   'anime-style illustration of the same subject, clean cel-shaded rendering, large expressive anime eyes with detailed highlights, simplified nose and mouth proportions while preserving identity, smooth stylized skin without realistic texture, clean sharp outlines, vibrant yet soft gradient colors, polished anime studio quality, subtle depth in background, gentle lighting, high-quality modern anime aesthetic inspired by premium animation studios,',
   '',
   'realistic face textures, oily skin, photoreal shadows')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 7: Cartoon
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('cartoon', 'ai_generation', 'Cartoon', 'Simplified shapes with soft pastel colors and friendly design',
   'cartoon-style character illustration based on the same subject, simplified facial shapes and proportions, friendly approachable expression, smooth flat color fills, soft pastel color palette, thick clean outlines, minimal shading, playful 2D illustration style, exaggerated features while maintaining recognizable likeness, bright and cheerful tone, clean cartoon rendering quality,',
   '',
   'realistic textures, gritty detail, heavy shadows')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 8: Soft Aesthetic
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('soft_aesthetic', 'ai_generation', 'Soft Aesthetic', 'Clean editorial style with gentle diffused lighting and pastel palette',
   'soft aesthetic portrait of the same subject, clean editorial style, gentle diffused lighting evenly illuminating the face, soft natural highlights with controlled contrast, matte skin finish with realistic texture, calm pastel color palette without glow effects, airy and minimal composition, subtle depth of field with smooth background blur, neutral soft background tones, delicate color grading, light and elegant mood, refined softness without haze, no fantasy elements, preserving identity, pose, clothing, and background realism, high-quality modern editorial photography look,',
   '',
   'harsh lighting, dark tones, gritty textures, high contrast')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 9: Collage
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('collage', 'ai_generation', 'Collage', 'Mixed media collage style with torn paper textures',
   'mixed media collage-style artwork featuring the same subject, layered cut-out elements forming the portrait, visible torn paper edges and overlapping textures, textured paper grain and analog imperfections, artistic composition with depth created through layering, stylized abstraction while maintaining facial recognizability, handcrafted scrapbook aesthetic, creative editorial collage look,',
   '',
   'clean edges, photorealistic, smooth textures')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 10: Line Art
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('line_art', 'ai_generation', 'Line Art', 'Black and white line art with ink pen strokes',
   'black and white line art illustration of the same subject, clean ink pen contour drawing, expressive continuous line strokes defining facial structure, minimal shading using sparse hatching, sketchbook-style aesthetic, emphasis on outlines and form, elegant minimal composition, hand-drawn illustration feel, high clarity monochrome artwork,',
   '',
   'color, filled areas, realistic shading, photographic')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 11: Japanese Ink (Sumi-e)
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('sumi_e', 'ai_generation', 'Japanese Ink', 'Traditional Japanese sumi-e ink painting style',
   'traditional sumi-e Japanese ink painting style portrait of the same subject, expressive black ink brush strokes, fluid ink wash textures, high contrast between ink and white space, minimalist composition, organic brush movement, traditional rice paper texture, elegant restrained aesthetic, stylized abstraction while preserving facial essence,',
   '',
   'color, modern style, digital look, photorealistic')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- Preset 12: Kawaii
INSERT INTO presets (id, visual_style_id, display_name, description, prompt_prefix, prompt_suffix, negative_prompt) VALUES
  ('kawaii', 'ai_generation', 'Kawaii', 'Cute Japanese kawaii style with pastel tones',
   'kawaii-style character illustration inspired by the same subject, cute simplified facial proportions, large sparkling eyes, small nose and mouth, soft rounded forms, pastel color palette, gentle blush tones, adorable and cheerful expression, bubbly playful aesthetic, clean and polished cute illustration style,',
   '',
   'realistic, scary, dark, serious, mature')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  negative_prompt = EXCLUDED.negative_prompt;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed: 12 AI generation presets added';
END $$;
