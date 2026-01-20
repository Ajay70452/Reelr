# ⭐ **SYSTEM ARCHITECTURE DOCUMENT — AI Video Generator MVP**

## **Version:** 1.0

## **Last Updated:** Today

## **Owner:** Founders (Ajay + Co-founder)

## **Scope:** Backend + Rendering + Infra + Model Pipelines

---

# 1. **High-Level System Overview**

The system is a multi-stage asynchronous AI video generation pipeline.

### **User Flow → System Flow Mapping**

```
User selects:
Genre → Visual Style → Preset → Quality → Voice → Music → Duration → Advanced Settings
```

Backend does:

```
→ LLM Script + Scene Generation
→ Visual Render (SORA / Moving Images / Stock)
→ Voice Generation
→ Caption Generation
→ Video Composition (FFmpeg)
→ Final Render + Store in S3
→ Signed URL Return
```

The architecture is optimized for:

- Fast prototyping
- Scalable rendering
- Support for multiple visual modalities
- Efficient cost control
- Strong fallback handling
- Clear separation between API ↔ Worker jobs

---

# 2. **Architecture Diagram (Conceptual)**

```
 [Client/Frontend]
        |
        v
 [FastAPI Backend API]  -----> [PostgreSQL DB]
        |
        v
 [Job Creator / Orchestrator]
        |
        v
 [Redis Queue]  --->  [Worker Cluster]
                         |
                         |-- Script Generator (LLM)
                         |-- Scene Generator
                         |-- Visual Generator:
                         |      - Sora Pipeline
                         |      - Moving Images Pipeline
                         |      - Stock Fallback
                         |
                         |-- Voice Generator (TTS)
                         |
                         |-- Caption Engine
                         |
                         └-- FFmpeg Renderer
                         |
                         v
                     [S3 Storage]
        |
        v
  [CDN Delivery (CloudFront)]
```

---

# 3. **Subsystem Breakdown**

## 3.1 **Frontend**

- Simple UI flow with 4 steps
- Makes API calls to backend
- Polls job status (`/jobs/{id}`)
- Displays final video via signed URL

Tech: React / Next.js / Tailwind (recommended)

---

## 3.2 **Backend API (FastAPI)**

Responsibilities:

- Authentication (Supabase/Auth0/Clerk)
- Validate user credits
- Receive video generation request
- Create job entry in DB
- Push job into Redis queue
- Provide job status polling
- Serve signed S3 URLs

Endpoints (summary):

- `POST /video/generate`
- `GET /video/job/{id}`
- `GET /video/{id}`
- `POST /user/credits/consume`
- `POST /user/credits/refund`

---

## 3.3 **Job Queue (Redis + RQ)**

Used to:

- Manage asynchronous job execution
- Handle concurrency limit per user
- Retry failed jobs
- Route jobs to different workers

Queues:

- `llm_queue`
- `visual_queue`
- `audio_queue`
- `render_queue`
- `high_priority` (for premium users)

---

## 3.4 **Worker Cluster**

Workers run separately from API and perform heavy operations.

### Worker Types:

#### **1) Script Worker**

- Calls LLM (GPT/Claude)
- Generates script + scenes
- Validates character limit
- Adapts script based on genre

#### **2) Visual Worker**

Handles the **visual style** selected:

- **Sora Mode:**

  - Generate Sora-style prompt
  - Call Sora API or Sora-like model (MiniSora/Lumiere/CogVideo)
  - Fetch or stream generated video segments

- **Moving Images Mode:**

  - Generate image prompts
  - Run AnimateDiff / Runway / Pika style motion
  - Produce 3–5 second segments

- **Stock Mode (fallback for failures):**

  - Query Pexels/Unsplash API
  - Download B-roll clips
  - Apply pan/zoom effect

#### **3) Audio Worker**

- Generate voiceover with:

  - ElevenLabs
  - OpenAI TTS

- Generate background music based on preset
- Normalize audio levels

#### **4) Caption Worker**

- Perform speech segmentation
- Generate timed captions
- Create SRT file or JSON time-maps

#### **5) Render Worker (FFmpeg)**

Combines everything:

- Scenes
- Captions
- Voice
- Music
- Effects
- Transitions

Outputs:

- MP4 final video (1080p default)

---

## 3.5 **Storage Layer**

### **AWS S3 Buckets**

- `raw-assets/` (downloaded stock clips)
- `ai-renders/` (motion or sora outputs)
- `final-videos/` (exported MP4s)
- `temp/` (auto-cleaned daily)

Features:

- Lifecycle rules to auto-delete old intermediates
- CloudFront caching for faster delivery

---

## 3.6 **Database (PostgreSQL)**

Tables:

- `users`
- `credits`
- `video_jobs`
- `videos`
- `niches`
- `presets`
- `billing`
- `worker_logs`

---

## 3.7 **CDN (CloudFront)**

Used for:

- Fast public delivery
- Signed URL protection
- High throughput for downloads

---

# 4. **Pipeline Logic**

## Visual Style Determines Pipeline:

### **Moving Images → AnimateDiff Pipeline**

- Takes image prompt per scene
- Generates 2–4 second moving images
- Outputs multiple short clips
- Perfect for short-form aesthetic videos

### **SORA AI Video → Sora Proxy Pipeline**

Until Sora API:

- Mini-Sora
- Lumiere
- CogVideoX

Later: upgrade to real Sora.

Outputs:

- Longer fluid cinematic clips
- POV movement
- High variance

### **Stock Fallback (Very Important!)**

Used if:

- Sora fails
- Motion fails
- Budget tier is low

---

# 5. **Credit System Logic**

### Credits consumed per render:

- Moving Images (Basic): 2 credits
- Moving Images (Premium): 5 credits
- SORA Basic: 10 credits
- SORA High Quality: 20–40 credits
- Stock fallback: 1 credit

Premium tiers replenish more credits monthly.

---

# 6. **Error Handling & Recovery**

If ANY pipeline fails:

### Fallback Sequence:

```
SORA → Motion → Stock → Refund
```

Workers catch errors and:

- retry 2×
- reduce quality
- trigger fallback
- update job status

---

# 7. **Scalability Strategy**

### Phase 1 (MVP)

- Few workers
- RunPod/Modal GPU for visual generation

### Phase 2

- Auto-scaling workers
- Separate high-priority queue
- Preload models on warm GPU machines

### Phase 3

- Multi-region S3/CDN
- Worker autoscaling groups
- On-demand GPU pools

---

# 8. **Security & Rate Limits**

Rate limits:

- 10 jobs/day for free-tier users
- 1 concurrent job/user
- Prevent API abuse
- Signed URLs expire after 3h

---

# 9. **Monitoring**

Tools:

- Sentry (errors)
- Prometheus/Grafana (worker metrics)
- Cloudwatch logs
- PostHog for user events

Health checks:

- Worker alive pings
- Queue depth watchers
- GPU utilization

---

# ⭐ **FINAL NOTE**

This architecture is **optimized for:**

- MVP speed
- Sora + Motion hybrid pipeline
- Low cost
- Clean scaling path
- High reliability
- Category-1 simplicity with Category-2 capabilities

You now have a **complete system blueprint**.

---
