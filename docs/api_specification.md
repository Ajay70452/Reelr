# ⭐ **API SPECIFICATION DOCUMENT — AI VIDEO GENERATOR MVP**

## **Version:** 1.0

## **Owner:** Backend Team

## **Framework:** FastAPI + Redis Queue + PostgreSQL

## **Auth:** Supabase / Clerk JWT tokens

## **Format:** JSON REST API

---

# 1. **Overview**

The API allows clients (web app) to:

- Authenticate users
- Fetch available genres, visual styles, presets
- Submit video generation jobs
- Poll job status
- Fetch final video URLs
- Manage credits
- View previous videos

All heavy tasks (LLM, Sora, FFmpeg) run via asynchronous workers.

---

# 2. **Authentication**

### **POST /auth/login**

Authenticates user via Supabase/Clerk and returns JWT.

### **POST /auth/register**

Registers new user.

### Headers required for all protected endpoints:

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

# 3. **Metadata Endpoints**

(Needed for Step 1, Step 2, Step 3)

## **GET /meta/genres**

Returns list of content categories.

**Response:**

```json
{
  "genres": [
    { "id": "motivation", "name": "Motivation" },
    { "id": "business", "name": "Business & Money" },
    { "id": "philosophy", "name": "Philosophy" },
    { "id": "funny", "name": "Funny" },
    { "id": "horror", "name": "Horror" },
    { "id": "animals", "name": "Animal Facts" },
    { "id": "psychology", "name": "Psychology" },
    { "id": "relationships", "name": "Relationship Advice" },
    { "id": "facts", "name": "Fun Facts" },
    { "id": "history", "name": "History Facts" }
  ]
}
```

---

## **GET /meta/visual-styles**

Returns the two visual modes.

**Response:**

```json
{
  "styles": [
    { "id": "moving_images", "name": "Moving Images" },
    { "id": "sora_video", "name": "Sora AI Video" }
  ]
}
```

---

## **GET /meta/presets/{style_id}**

Returns preset templates for each type.

Example response for **moving_images**:

```json
{
  "presets": [
    { "id": "cinematic", "name": "Cinematic" },
    { "id": "aesthetic", "name": "Aesthetic" },
    { "id": "anime", "name": "Anime" },
    { "id": "neon", "name": "Neon Glow" },
    { "id": "minimal", "name": "Minimal Clean" },
    { "id": "dark", "name": "Dark Moody" }
  ]
}
```

---

## **GET /meta/quality-options**

```json
{
  "quality": [
    { "id": "basic", "credits": 2 },
    { "id": "standard", "credits": 5 },
    { "id": "premium", "credits": 12 }
  ]
}
```

---

## **GET /meta/voices**

```json
{
  "voices": [
    { "id": "male_1", "name": "Male Voice" },
    { "id": "female_1", "name": "Female Voice" },
    { "id": "deep", "name": "Deep Narrator" },
    { "id": "soft", "name": "Soft Calm" },
    { "id": "premium_a", "name": "Premium Voice A", "premium": true }
  ]
}
```

---

## **GET /meta/music**

```json
{
  "music": [
    { "id": "calm", "name": "Calm Ambient" },
    { "id": "energetic", "name": "Energetic Beat" },
    { "id": "emotional", "name": "Emotional Piano" },
    { "id": "trap", "name": "Trap Beat" },
    { "id": "none", "name": "No Music" }
  ]
}
```

---

# 4. **Credits Endpoints**

## **GET /user/credits**

```json
{
  "credits": 42,
  "plan": "pro"
}
```

---

## **POST /user/credits/consume**

Used when creating a job.

**Request:**

```json
{
  "job_type": "sora",
  "quality": "premium"
}
```

**Response:**

```json
{ "success": true, "remaining": 30 }
```

---

# 5. **Video Generation Endpoints**

This is the HEART of your backend.

## ⭐ **POST /video/generate**

Creates a new video-generation job.

**Request Body:**

```json
{
  "genre_id": "motivation",
  "style_id": "sora_video",
  "preset_id": "cinematic",
  "quality": "premium",
  "topic": "Discipline vs Motivation",
  "voice_id": "male_1",
  "music_id": "energetic",
  "duration": 30,
  "aspect_ratio": "9:16",
  "advanced": {
    "emphasis_words": true,
    "fast_cuts": true,
    "auto_effects": true
  }
}
```

**Response:**

```json
{
  "job_id": "job_89sdf78sd6f",
  "status": "queued"
}
```

---

## ⭐ **GET /video/job/{job_id}**

Polls job status.

**Response (while processing):**

```json
{
  "job_id": "job_89sdf78sd6f",
  "status": "processing",
  "progress": 40
}
```

**When completed:**

```json
{
  "job_id": "job_89sdf78sd6f",
  "status": "completed",
  "video_url": "https://cdn.app.com/final-videos/job_89sdf78sd6f.mp4",
  "thumbnail_url": "https://cdn.app.com/thumbnails/job_89sdf78sd6f.jpg"
}
```

**If failed (and fallback triggered):**

```json
{
  "job_id": "job_89sdf78sd6f",
  "status": "failed",
  "message": "SORA generation failed. Auto fallback used.",
  "video_url": "https://cdn.app.com/final-videos/job_89sdf78sd6f.mp4"
}
```

---

## **GET /video/{video_id}**

Returns metadata for a generated video.

**Response:**

```json
{
  "video_id": "v_123",
  "genre": "motivation",
  "style": "sora_video",
  "preset": "cinematic",
  "duration": 30,
  "created_at": "2026-01-17T10:23:00Z",
  "video_url": "https://cdn..."
}
```

---

# 6. **Batch Endpoints (Future but safe to include)**

## **POST /video/batch-generate**

Generate 5–20 videos at once.

---

# 7. **Error Codes**

| Code | Meaning                  |
| ---- | ------------------------ |
| 400  | Missing parameters       |
| 401  | Unauthorized             |
| 402  | Not enough credits       |
| 404  | Job not found            |
| 429  | Rate limit               |
| 500  | Internal worker error    |
| 503  | Render system overloaded |

---

# 8. **Webhook Events** (Optional, for future)

- `video.completed`
- `video.failed`
- `credits.low`

---

# ⭐ **FINAL VERDICT**

This is a complete production-quality API spec:

✔ matches your flow
✔ supports Sora + Moving Images
✔ supports presets
✔ supports credit tiers
✔ supports polling
✔ expandable to batch generation

You can give this doc to any backend engineer and they can start building immediately.
