# Fal implementation

import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/kling-video/o3/standard/image-to-video", {
input: {
image_url: "https://v3b.fal.media/files/b/0a8cfd5a/8ABMp4n9rh3kfD2Rq8fHd_start_frame.png"
},
logs: true,
onQueueUpdate: (update) => {
if (update.status === "IN_PROGRESS") {
update.logs.map((log) => log.message).forEach(console.log);
}
},
});
console.log(result.data);
console.log(result.requestId);

Perfect.
Now we move from **UI imagination** to **execution discipline**.

This will be a **Product + Backend Flow Document** for:

> 🔥 Trending Video (Kling 3.0 Powered)

Structured so your team (or you) can implement without ambiguity.

---

# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Feature: Trending AI Video Generator (Kling 3.0)

---

# 1️⃣ Objective

Build a high-conversion, trend-focused AI video generator with two flows:

1. **Select Trending Theme** (Mass market, no prompt)
2. **Create Your Own** (Advanced users, prompt + references)

Powered by:

- Kling 3.0
- Remotion (composition)
- FFmpeg (final encoding)

---

# 2️⃣ User Segmentation

## Segment A — Trend Copiers

- Want fast output
- No creative thinking
- Upload image
- Generate viral clip

## Segment B — Creative Users

- Want control
- Provide prompt
- Optional reference video
- Expect structured output

Two flows must remain separated in backend.

---

# 3️⃣ High-Level System Architecture

```
Frontend
   ↓
Trending Video API
   ↓
Prompt Composer (Theme or Custom)
   ↓
Kling 3.0 Generation
   ↓
Remotion Composition Layer
   ↓
FFmpeg Final Encode
   ↓
CDN Storage
```

---

# 4️⃣ API Endpoints

---

## 🔹 Endpoint 1 — Generate Trending Theme Video

### POST

```
/api/trending-video/generate-theme
```

### Payload

```json
{
  "theme_id": "dance_mania",
  "reference_image": "file_url",
  "intensity": "normal",
  "duration": 8,
  "aspect_ratio": "9:16"
}
```

### Validation Rules

- reference_image REQUIRED
- no prompt field accepted
- duration must match theme limits
- aspect ratio validated

---

## 🔹 Endpoint 2 — Generate Custom Trending Video

### POST

```
/api/trending-video/generate-custom
```

### Payload

```json
{
  "prompt": "Make me do backflip in space",
  "reference_image": "file_url",
  "reference_video": "optional_file_url",
  "intensity": "normal",
  "duration": 8,
  "aspect_ratio": "9:16"
}
```

### Validation Rules

- reference_image REQUIRED
- prompt REQUIRED
- reference_video OPTIONAL

---

# 5️⃣ Backend Flow — Theme Mode

---

## STEP 1 — Fetch Theme Config

Themes stored in DB:

```json
{
  "id": "dance_mania",
  "base_prompt": "...",
  "camera_template": "...",
  "motion_template": "...",
  "default_duration": 8,
  "allowed_durations": [5, 8, 10]
}
```

---

## STEP 2 — Build Structured Kling Prompt

Prompt Composer merges:

- theme.base_prompt
- intensity modifier
- camera_template
- motion_template
- reference image injection

Example:

```
High energy dance sequence,
medium tracking shot,
energetic exaggerated movement,
smooth motion,
cinematic lighting,
avoid distortions,
subject based on reference image
```

No user prompt involved.

---

## STEP 3 — Kling 3.0 Call

Send:

```json
{
  "prompt": "...",
  "image_url": "reference_image",
  "duration": 8,
  "aspect_ratio": "9:16"
}
```

Receive:

- video clip (raw)
- request_id

Store clip.

---

## STEP 4 — Remotion Polish

Apply:

- subtle zoom or motion stabilization
- optional letterbox
- slight color grade
- optional overlay (TikTok-style)

Remotion outputs:

- enhanced_video.mp4

---

## STEP 5 — FFmpeg Final Encode

Use FFmpeg only for:

- audio normalization
- bitrate optimization
- encoding
- watermark (if needed)

Return final URL.

---

# 6️⃣ Backend Flow — Custom Mode

---

## STEP 1 — Prompt Enhancement

Use internal prompt enhancer:

Input:

- user prompt
- intensity
- reference video (optional)
- motion grammar

Output:

- structured Kling-ready prompt

---

## STEP 2 — Reference Video Handling (If Provided)

If reference_video exists:

- extract motion cues (optional advanced)
- inject style hint
- or pass directly to Kling (if supported)

---

## STEP 3 — Kling 3.0 Call

Same structure as theme mode.

---

## STEP 4 — Remotion Layer

Add:

- optional caption (if prompt includes dialogue)
- stylistic overlays
- minor polish

---

## STEP 5 — Final Encode

Same as theme mode.

---

# 7️⃣ Intensity Mapping Logic

Intensity affects:

| Intensity | Motion         | Camera              | Energy  |
| --------- | -------------- | ------------------- | ------- |
| Subtle    | small movement | stable              | calm    |
| Normal    | natural        | slight tracking     | dynamic |
| Extreme   | exaggerated    | aggressive tracking | high    |

This is implemented in Prompt Composer.

---

# 8️⃣ Duration Control Logic

Frontend offers:

- 5s
- 8s
- 10s

Backend validates against:

- theme.allowed_durations
- Kling limits

---

# 9️⃣ Error Handling

If Kling fails:

- retry once
- fallback error state

If Remotion fails:

- recompose
- log scene metadata

All jobs tracked by:

```
job_id
status
stage
timestamps
```

---

# 🔟 Job Lifecycle States

```
queued
building_prompt
generating_video
composing
encoding
completed
failed
```

Each stage logged.

---

# 1️⃣1️⃣ Performance Goals

- Prompt build < 200ms
- Kling generation: external
- Remotion render < 20s
- Total under 60–90s

Trend users expect fast results.

---

# 1️⃣2️⃣ Future Extensions (Not v1)

- Regenerate button (same theme, new seed)
- Seed exposure
- Batch trend generation
- Auto music injection

---

# 1️⃣3️⃣ Monetization Hooks

Not part of core logic, but supported:

- Credits per generation
- HD export premium
- Watermark removal
- Faster queue access

---

# 1️⃣4️⃣ Final System Design Principle

Trending Video is:

- A fast, structured, deterministic pipeline
- Separate from full AI Video tool
- Optimized for Meta ads
- Minimal user cognitive load

---

# 🧠 Summary

You now have:

- Clear UI flow
- Two backend endpoints
- Prompt composer separation
- Kling integration logic
- Remotion composition
- FFmpeg finalization
- Intensity mapping
- Duration logic
- Job states

This is production-grade direction.
