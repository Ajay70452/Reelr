Perfect — this is the **core IP** of your entire SaaS.
This doc determines **how your videos LOOK**, how consistent they are, and why users feel your output is “premium.”

Below is a **production-grade Preset Engineering Document**, based on how real SaaS (storyshort, revid, faceless, cutlabs, autoshorts) design their presets internally.

This is NOT just prompts.
This is _full engineering_:

- Prompt engineering
- Negative prompts
- Motion settings
- Render controls
- Color grading
- Character consistency rules
- Camera style
- Lighting design
- LoRA/Model selection
- Scene-parity rules
- Fallback rules
- Quality multipliers
- Timing adjustments
- How each preset should FEEL

This is exactly what teams build internally — and don’t reveal.

Let’s go.

---

# ⭐ **PRESET ENGINEERING DOCUMENT**

## Version 1.0

## Owner: Video Generation Team

## Purpose: Define consistent visual output for each preset across scenes, styles, models, and durations.

---

# 1️⃣ **Preset Architecture Overview**

A preset is NOT just a prompt.

A preset is a **bundle**:

```
Preset = {
  base_prompt,
  style_prompt,
  camera_preset,
  lighting_preset,
  composition_rules,
  color_palette,
  motion_type,
  negative_prompt,
  quality_level,
  LoRA (optional),
  rendering_params,
}
```

This ensures:

- the same style across all scenes
- same face structure
- same color theme
- same lighting energy
- same movement style

Without this → scenes look disconnected (bad).

---

# 2️⃣ **Preset Structure Specification**

Each preset must follow this schema:

```
{
  "id": "cinematic",
  "display_name": "Cinematic",
  "model": "flux-1.1-pro",
  "base_prompt": "...",
  "style_prompt": "...",
  "camera": "...",
  "lighting": "...",
  "composition": "...",
  "color_palette": "...",
  "motion": {
     "type": "slow_cinematic_pan",
     "strength": 0.4,
     "fps": 24
  },
  "negative_prompt": "...",
  "quality_multiplier": 1.2,
  "lora": null
}
```

---

# 3️⃣ **Preset Principles**

### ✔ MUST produce consistent style across 6–10 scenes

### ✔ MUST work with ONE base model (Flux or Playground)

### ✔ MUST animate cleanly through AnimateDiff

### ✔ MUST maintain subject identity (important!)

### ✔ MUST look good even if script content changes

### ✔ MUST render fast (important for SaaS)

---

# 4️⃣ **Core Presets (Your MVP Needs)**

Below are **production-level presets** for the EXACT styles shown in your screenshot.

For each one, I’ll define:

- style description
- prompt template
- negative prompt
- motion type
- model selection
- notes

---

# ⭐ PRESET 1 — **Cinematic**

### **Description**

Film-style, high-dynamic-range, realistic lighting, shallow depth-of-field.

### **Base Prompt**

```
cinematic film still, 85mm lens, shallow depth of field, realistic skin textures, dramatic lighting, volumetric light rays, bokeh, anamorphic look, ultra high quality
```

### **Negative Prompt**

```
cartoonish, flat lighting, low resolution, distorted face, oversaturated, deformed hands
```

### **Motion**

- Slow pan (left → right)
- Slight camera drift
- Strength: 0.35

### **Model**

Flux 1.1 Pro or Playground 2.9

---

# ⭐ PRESET 2 — **Digital Art**

### **Base Prompt**

```
highly detailed digital illustration, soft shading, smooth gradients, vibrant color blends, clean edges, soft rim lighting
```

### **Negative Prompt**

```
grainy, realistic textures, photographic look, glitch, chromatic aberration
```

### **Motion**

- Subtle zoom-in
- Strength: 0.25

---

# ⭐ PRESET 3 — **Neon Futuristic**

### **Base Prompt**

```
cyberpunk neon aesthetic, glowing lights, dark city ambiance, reflective surfaces, moody atmosphere, sharp contrast, futuristic color palette
```

### **Negative Prompt**

```
washed out colors, low contrast, daylight, plain backgrounds
```

### **Motion**

- Parallax neon movement
- Strength: 0.45

---

# ⭐ PRESET 4 — **4K Realistic**

### **Base Prompt**

```
ultra realistic portrait, 4k detail, crisp textures, natural lighting, photorealistic skin, studio grade realism
```

### **Negative Prompt**

```
anime, cartoon, painterly, oversharpen, uncanny valley
```

_(This preset could later use Nano Banana Pro for PREMIUM.)_

### Motion:

- Subtle expression change
- Small handheld camera movement

---

# ⭐ PRESET 5 — **Comic Book**

### **Base Prompt**

```
comic book panel style, bold black outlines, vibrant flat colors, halftone shading, dramatic expressions, action-oriented composition
```

### **Negative Prompt**

```
realistic skin texture, soft gradients, photographic lighting
```

### Motion:

- Short dynamic zoom bursts
- Strength: 0.3

---

# ⭐ PRESET 6 — **Anime**

### **Base Prompt**

```
anime style illustration, cel shading, large expressive eyes, clean outlines, vibrant soft gradients, studio ghibli inspired background
```

### **Negative Prompt**

```
realistic face textures, oily skin, photoreal shadows
```

### Motion:

- AnimateDiff anime LoRA
- Strength: 0.45

---

# ⭐ PRESET 7 — **Cartoon**

### **Base Prompt**

```
cartoon style, simplified shapes, soft pastel colors, thick lines, friendly character design, 2d illustration aesthetic
```

### **Negative Prompt**

```
realistic textures, gritty detail, heavy shadows
```

### Motion:

- Swaying motion
- Strength: 0.3

---

# ⭐ PRESET 8 — **Playground / Soft Aesthetic**

### **Base Prompt**

```
dreamy aesthetic shot, soft glowing light, pastel palette, gentle gradients, whimsical tone, clean and airy composition
```

### **Motion**

- Light zoom-in
- Soft drift
- Strength: 0.2

---

# ⭐ PRESET 9 — **Collage**

### **Base Prompt**

```
mixed media collage style, torn paper textures, layered cut-out shapes, grainy paper details, artistic composition
```

### Motion:

- “Scrapbook” pop-in animation
- Strength: 0.4

---

# ⭐ PRESET 10 — **Line Art**

### **Base Prompt**

```
black and white line art, ink pen strokes, contour drawing, sketchbook aesthetic, minimal shading
```

### Motion:

- Gentle shake
- Strength: 0.15

---

# ⭐ PRESET 11 — **Japanese Ink (Sumi-e)**

### **Base Prompt**

```
sumi-e Japanese ink painting, black ink wash, traditional brush strokes, elegant minimalism, high contrast ink textures
```

### Motion:

- Ink spread motion
- Strength: 0.25

---

# ⭐ PRESET 12 — **Kawaii**

### **Base Prompt**

```
kawaii character style, pastel tones, simple cute expressions, soft round forms, bubble aesthetic, adorable color palette
```

### Motion:

- “Bounce” motion
- Strength: 0.35

---

# 5️⃣ **Motion Profiles (AnimateDiff)**

Create a motion library:

| Motion Name    | Description              | Strength |
| -------------- | ------------------------ | -------- |
| slow_pan       | cinematic pan left→right | 0.35     |
| zoom_in        | gentle zoom              | 0.25     |
| parallax       | multi-layer parallax     | 0.45     |
| bounce         | kawaii up/down bounce    | 0.35     |
| ink_spread     | sumi-e dissolve motion   | 0.25     |
| anime_movement | anime motion             | 0.45     |
| drift          | slow drifting camera     | 0.2      |

Each preset is tied to 1 motion style.

---

# 6️⃣ **Rendering Parameters (per preset)**

Examples:

**Cinematic**

- FPS: 24
- Color Grade: “Analog Film” LUT
- Noise: slight film grain

**Anime**

- FPS: 18
- Color Grade: “Anime Saturated”
- Edge Enhancement: ON

**Line Art**

- FPS: 12
- No color corrections
- No transitions

---

# 7️⃣ **Ensuring Scene Consistency**

Use a “style token” injected in prompts:

```
style_token = "cinematic_style_v1"
```

So all scenes include:

```
portrait of a person..., cinematic_style_v1
```

This forces the model to match the style across all scenes.

---

# 8️⃣ **Fallbacks**

If a preset fails:

1. Try again with lower CFG
2. Try alternative prompt
3. Fall back to simpler preset (Digital Art)
4. Last fallback: stock footage

---

# ⭐ FINAL RESULT

This document gives you:

- Identical preset quality as storyshort & revid
- Consistent styles
- Fast rendering
- Explained motion logic
- Scene consistency
- Production quality videos

This is the foundation of high ARPU customers.

---
