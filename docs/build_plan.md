# ⭐ **BUILD PLAN — AI VIDEO GENERATOR MVP (ClipKing)**

## **Version:** 1.0

## **Last Updated:** January 23, 2026

## **Owner:** Founders + Engineering Team

## **Timeline:** 5 Weeks to Launch

---

# 🚀 **GETTING STARTED — RECOMMENDED ORDER**

This document provides a **clear, actionable roadmap** to build and launch ClipKing from zero to MVP.

---

## **Phase 1: Foundation Setup (Week 1)**

### **1.1 Database Setup**

**Goal:** Set up PostgreSQL and create all core tables

**Tasks:**

- [ ] Set up **PostgreSQL** database (recommended: Supabase for hosted DB + Auth)
  - Alternative: Local PostgreSQL via Docker
- [ ] Create core database tables from [database_schema.md](database_schema.md):
  - `users` — user accounts
  - `credits` — credit tracking
  - `genres` — content categories
  - `visual_styles` — Cinematic Video / Moving Images / Stock
  - `presets` — cinematic, anime, aesthetic, etc.
  - `quality_options` — basic / standard / premium
  - `voices` — TTS voice options
  - `music` — background music options
  - `video_jobs` — job tracking
  - `videos` — final rendered outputs
  - `billing_history` — payment records
  - `worker_logs` — pipeline debugging
- [ ] Add indexes for performance (user_id, status, created_at)
- [ ] Seed lookup tables with initial data:
  - 10-12 genres (Motivation, Business, Psychology, etc.)
  - 6-8 presets per visual style
  - 5+ voice options
  - 5+ music options

**Tech Stack:**

- PostgreSQL
- Supabase (recommended) or AWS RDS

---

### **1.2 Backend API Skeleton**

**Goal:** Initialize FastAPI project with authentication and basic endpoints

**Tasks:**

- [ ] Initialize **FastAPI** project structure
- [ ] Set up **Supabase Auth** or **Clerk** for authentication
  - Implement JWT token validation
  - Support magic link + Google OAuth
- [ ] Configure CORS for frontend communication
- [ ] Build metadata endpoints (per [api_specification.md](api_specification.md)):
  - `GET /meta/genres`
  - `GET /meta/visual-styles`
  - `GET /meta/presets/{style_id}`
  - `GET /meta/quality-options`
  - `GET /meta/voices`
  - `GET /meta/music`
- [ ] Build user endpoints:
  - `GET /user/credits`
  - `POST /user/credits/consume`
- [ ] Set up environment variables (.env)
- [ ] Add basic error handling and logging

**Tech Stack:**

- FastAPI (Python)
- Supabase Auth / Clerk
- Pydantic for validation

---

### **1.3 Redis Queue Setup**

**Goal:** Set up job queue infrastructure for async video generation

**Tasks:**

- [ ] Install and configure **Redis**
  - Local: via Docker
  - Production: Redis Cloud or AWS ElastiCache
- [ ] Install **RQ (Redis Queue)** Python library
- [ ] Create queue structure (per [worker&queue.md](worker&queue.md)):
  - `llm_queue` — script generation
  - `scene_queue` — scene parsing
  - `visual_queue` — Kling/Motion generation (GPU)
  - `audio_queue` — TTS + music
  - `caption_queue` — caption timing
  - `render_queue` — FFmpeg composition
  - `finalize_queue` — S3 upload + cleanup
  - `high_priority_queue` — for premium users
- [ ] Test basic job enqueue/dequeue
- [ ] Set up worker health monitoring

**Tech Stack:**

- Redis
- RQ (Redis Queue)
- Docker (for local development)

---

## **Phase 2: Frontend MVP (Week 2)**

### **2.1 Project Setup**

**Goal:** Initialize Next.js project with core dependencies

**Tasks:**

- [ ] Initialize **Next.js** project with TypeScript
- [ ] Install dependencies:
  - **TailwindCSS** — styling
  - **Zustand** — state management
  - **Axios** — API calls
  - **React Query** — data fetching & caching
- [ ] Set up environment variables for API endpoints
- [ ] Configure dark theme (per [frontend_flow&guidelines.md](frontend_flow&guidelines.md))
  - Black + deep gray base
  - Neon green/blue accents
  - Soft card shadows
- [ ] Deploy early to **Vercel** for continuous deployment

**Tech Stack:**

- Next.js (React)
- TailwindCSS
- Zustand
- Vercel

---

### **2.2 Build Core Screens**

**Goal:** Build all screens from landing to video library

Build screens in this **specific order** (per [frontend_flow&guidelines.md](frontend_flow&guidelines.md)):

#### **Screen 1: Landing Page**

- [ ] Hero section with headline: "Create AI Videos in Minutes"
- [ ] Auto-playing demo videos
- [ ] Single CTA: "Get Started (Free)"
- [ ] Trust indicators
- [ ] Pricing teaser

#### **Screen 2: Signup/Login**

- [ ] Email-only or Google OAuth login
- [ ] Passwordless magic link (recommended)
- [ ] Fast authentication flow

#### **Screen 3: Dashboard**

- [ ] "Create New Video" button (prominent)
- [ ] Video grid (previous renders)
- [ ] Credits remaining display
- [ ] Upgrade button
- [ ] First-time user popup: "Let's make your first video"

#### **Screen 4: Create Video Wizard (4 Steps)**

**STEP 1 — Select Genre**

- [ ] Grid of 10-12 genre cards
- [ ] "Custom Topic" option
- [ ] Auto-advance on selection
- [ ] Hover descriptions

**STEP 2 — Select Visual Style** (MOST IMPORTANT)

- [ ] Two main options:
  - Moving Images (Fast/Aesthetic)
  - Sora AI Video (Cinematic/Premium)
- [ ] Conditional preset grid (6-8 presets)
- [ ] Quality selector: Basic / Standard / Premium
- [ ] Preview loops for each preset (1-2 sec autoplay)
- [ ] Show credit cost dynamically

**STEP 3 — Voice + Music**

- [ ] Voice selection cards (with play preview)
- [ ] Background music dropdown
- [ ] Lock icon for premium options

**STEP 4 — Video Settings**

- [ ] Aspect ratio selector (9:16, 1:1, 16:9)
- [ ] Duration buttons (15s, 30s, 45s, 60s)
- [ ] Advanced options (collapsed):
  - Emphasis Words toggle
  - Fast Cuts toggle
  - Auto Effects toggle
  - Auto Captions toggle
- [ ] Final "Generate Video" button

#### **Screen 5: Job Status Screen**

- [ ] Progress bar with percentage
- [ ] Step-by-step status:
  - "Generating Script..."
  - "Creating Scenes..."
  - "Rendering Video..."
  - "Finalizing..."
- [ ] Job ID display
- [ ] "Go to Dashboard" button

#### **Screen 6: Video Complete Screen**

- [ ] Autoplay final video
- [ ] Download button
- [ ] Copy link button
- [ ] "Create Another Video" button
- [ ] Upsell: "Upgrade for HD Sora clips"

#### **Screen 7: Video Library**

- [ ] Grid view of all videos
- [ ] Thumbnail + duration + timestamp
- [ ] Actions: Download / Delete / Duplicate settings

**UX Rules to Follow:**

- ✅ No more than 3 decisions per screen
- ✅ Everything fits in one screen (no scrolling in Steps 2 & 3)
- ✅ Dark cinematic theme
- ✅ Guided microcopy everywhere
- ✅ Show credit cost after each selection
- ✅ Mobile responsive

**Tech Stack:**

- Next.js pages/components
- TailwindCSS for styling
- Zustand for wizard state
- React Query for API polling

---

## **Phase 3: Core Pipeline (Week 3-4)**

### **3.1 Video Generation API Endpoint**

**Goal:** Implement the core job creation endpoint

**Tasks:**

- [ ] Build `POST /video/generate` endpoint
  - Validate all input parameters
  - Check user credits
  - Deduct credits immediately
  - Create `video_jobs` database entry
  - Enqueue job to `llm_queue`
  - Return job_id
- [ ] Build `GET /video/job/{id}` polling endpoint
  - Return status: queued/processing/completed/failed
  - Return progress percentage
  - Return video_url when completed
- [ ] Build `GET /video/{id}` metadata endpoint
- [ ] Implement rate limiting (10 jobs/day free tier)
- [ ] Implement concurrency limit (1 job/user)

---

### **3.2 Worker 1: LLM Worker (Script Generation)**

**Goal:** Generate scripts and scenes from user input

**Tasks:**

- [ ] Create LLM worker listening to `llm_queue`
- [ ] Integrate **OpenAI GPT-4.1** or **Claude 3 Haiku**
- [ ] Generate script based on:
  - Genre
  - Topic (custom or auto-generated)
  - Duration (15s, 30s, 45s, 60s)
- [ ] Structure script into scenes (3-10 scenes)
- [ ] Store script in `video_jobs.script`
- [ ] Store scenes JSON in `video_jobs.scenes`
- [ ] Update job status to next stage
- [ ] Enqueue to `visual_queue`
- [ ] Error handling with retry logic (2 attempts)

**Output Format (scenes JSON):**

```json
[
  {
    "scene_id": 1,
    "narration": "Success is not final...",
    "visual_prompt": "Cinematic shot of mountain peak at sunrise",
    "duration": 5
  }
]
```

---

### **3.3 Worker 2: Visual Worker (GPU-Heavy)**

**Goal:** Generate video/image content based on visual style

**Tasks:**

- [ ] Create visual worker listening to `visual_queue`
- [ ] Route based on `visual_style_id`:

**For Moving Images:**

- [ ] Integrate **Flux 1.1 Pro** for image generation
- [ ] Generate image per scene using visual_prompt
- [ ] Apply **Ken Burns effect** (pan/zoom) using FFmpeg
- [ ] Output: 3-5 second video clips per scene

**For Sora AI Video:**

- [ ] Integrate **Kling 2.6** (primary video generation model)
- [ ] Integrate **Sora API** as premium option (when available)
- [ ] Generate cinematic video clips per scene
- [ ] Longer duration (5-10 seconds)
- [ ] Fallback to Moving Images if Kling fails

**Fallback: Stock Video**

- [ ] Query Pexels/Unsplash API for B-roll
- [ ] Download and apply pan/zoom effect

- [ ] Store outputs in S3 `ai-renders/` bucket
- [ ] Update job progress
- [ ] Enqueue to `audio_queue`

**Infrastructure:**

- Deploy GPU workers to **Modal.com** or **RunPod**
- Use GPU instances (A10G or better)

---

### **3.4 Worker 3: Audio Worker (TTS + Music)**

**Goal:** Generate voiceover and background music

**Tasks:**

- [ ] Create audio worker listening to `audio_queue`
- [ ] Integrate **ElevenLabs** or **OpenAI TTS v2**
- [ ] Generate voiceover from script narration
- [ ] Select background music based on `music_id`
  - Preload music files or use royalty-free library
- [ ] Normalize audio levels (-16 LUFS)
- [ ] Apply music ducking (lower volume during speech)
- [ ] Store audio files in S3 `audio/` folder
- [ ] Enqueue to `caption_queue`

---

### **3.5 Worker 4: Caption Worker**

**Goal:** Generate timed captions for accessibility

**Tasks:**

- [ ] Create caption worker listening to `caption_queue`
- [ ] Use **Whisper** or word-level timing from TTS
- [ ] Generate SRT or JSON time-map
- [ ] Store caption data
- [ ] Enqueue to `render_queue`

---

### **3.6 Worker 5: Render Worker (FFmpeg)**

**Goal:** Combine all assets into final video

**Tasks:**

- [ ] Create render worker listening to `render_queue`
- [ ] Install **FFmpeg** on worker instances
- [ ] Implement rendering pipeline:
  1. Concatenate scene videos/images
  2. Apply transitions (crossfade, xfade filter)
  3. Overlay voiceover audio
  4. Mix background music with ducking
  5. Burn-in captions (if enabled)
  6. Apply final effects (emphasis words, fast cuts)
  7. Export to MP4 (1080p, H.264)
- [ ] Use **raw FFmpeg commands** (NOT MoviePy for speed)
- [ ] Store render in `/tmp` temporarily
- [ ] Enqueue to `finalize_queue`

**Key FFmpeg Operations:**

- Ken Burns: `zoompan` filter
- Transitions: `xfade` filter
- Audio mixing: `amix`, `volume` filters
- Captions: `drawtext` filter or subtitle burn-in

---

### **3.7 Worker 6: Finalize Worker**

**Goal:** Upload to S3 and cleanup

**Tasks:**

- [ ] Create finalize worker listening to `finalize_queue`
- [ ] Upload final video to S3 `final-videos/` bucket
- [ ] Generate thumbnail (first frame or middle frame)
- [ ] Upload thumbnail to S3
- [ ] Create CloudFront signed URL
- [ ] Store URLs in `videos` table
- [ ] Update `video_jobs.status` to "completed"
- [ ] Clean up temporary files
- [ ] If failure occurred: refund credits

---

## **Phase 4: Storage & Delivery (Week 4)**

### **4.1 AWS S3 Setup**

**Tasks:**

- [ ] Create S3 buckets:
  - `clipking-raw-assets/` — stock clips, images
  - `clipking-ai-renders/` — Kling/Motion outputs
  - `clipking-final-videos/` — exported MP4s
  - `clipking-temp/` — temporary files
- [ ] Configure bucket permissions (private)
- [ ] Set up lifecycle rules:
  - Auto-delete `temp/` files after 24 hours
  - Auto-delete `ai-renders/` after 7 days (optional)
- [ ] Enable versioning for `final-videos/`

---

### **4.2 CloudFront CDN Setup**

**Tasks:**

- [ ] Create CloudFront distribution
- [ ] Point to S3 `final-videos/` bucket
- [ ] Enable signed URLs (3-hour expiry)
- [ ] Configure caching headers
- [ ] Add custom domain (optional)
- [ ] Test video delivery speed

---

## **Phase 5: Polish & Launch (Week 5)**

### **5.1 Stripe Billing Integration**

**Tasks:**

- [ ] Set up Stripe account
- [ ] Create subscription plans:
  - **Free:** 10 credits/month
  - **Basic ($19/mo):** 50 credits/month
  - **Pro ($49/mo):** 200 credits/month
  - **Premium ($99/mo):** 500 credits/month
- [ ] Create one-time credit packs
- [ ] Implement webhook handlers:
  - `invoice.payment_succeeded` → add credits
  - `customer.subscription.deleted` → downgrade plan
- [ ] Build frontend pricing page
- [ ] Build checkout flow

---

### **5.2 Fallback Logic & Error Handling**

**Tasks:**

- [ ] Implement fallback sequence: `Kling → Motion → Stock → Refund`
- [ ] Add retry logic to all workers (2 attempts max)
- [ ] Automatic fallback triggers:
  - If Kling API fails → use Moving Images
  - If GPU worker timeout → use stock footage
  - If all fail → refund credits + notify user
- [ ] Store fallback flag in `video_jobs.fallback_used`
- [ ] Display fallback message in UI

---

### **5.3 Monitoring & Analytics**

**Tasks:**

- [ ] Set up **Sentry** for error tracking
  - Add to FastAPI backend
  - Add to Next.js frontend
- [ ] Set up **PostHog** for user analytics
  - Track wizard step completion
  - Track video generation success rate
  - Track user retention
- [ ] Set up worker health monitoring:
  - Queue depth alerts
  - Worker alive pings
  - GPU utilization tracking
- [ ] Create admin dashboard (optional):
  - Active jobs
  - Queue status
  - Error logs

---

### **5.4 Testing & QA**

**Tasks:**

- [ ] End-to-end testing:
  - Sign up → Create video → Download
  - Test all genre combinations
  - Test all visual styles
  - Test all presets
- [ ] Load testing:
  - 10 concurrent users
  - 100 concurrent users
- [ ] Error scenario testing:
  - GPU timeout
  - API rate limits
  - Insufficient credits
  - Invalid inputs
- [ ] Mobile responsiveness testing
- [ ] Browser compatibility (Chrome, Safari, Firefox)

---

### **5.5 Security & Rate Limits**

**Tasks:**

- [ ] Implement rate limits:
  - Free tier: 10 jobs/day
  - Paid tier: 100 jobs/day
  - Max 1 concurrent job per user
- [ ] Add request validation & sanitization
- [ ] Secure API keys in environment variables
- [ ] Enable HTTPS only
- [ ] Implement CSRF protection
- [ ] Add DDoS protection (Cloudflare recommended)

---

### **5.6 Documentation**

**Tasks:**

- [ ] API documentation (auto-generated with FastAPI)
- [ ] User guide / Help Center
- [ ] Video tutorials
- [ ] FAQ page
- [ ] Terms of Service
- [ ] Privacy Policy

---

### **5.7 Launch Preparation**

**Tasks:**

- [ ] Domain setup
- [ ] SSL certificates
- [ ] Email setup (transactional emails via SendGrid/Postmark)
- [ ] Customer support setup (Intercom/Crisp)
- [ ] Marketing page copy
- [ ] Social media assets
- [ ] Launch announcement
- [ ] Product Hunt submission prep

---

## 📦 **QUICK START CHECKLIST**

Use this to track overall progress:

```
□ Set up PostgreSQL database (Supabase)
□ Create all database tables + seed data
□ Initialize FastAPI project
□ Build metadata endpoints
□ Set up Redis + RQ
□ Initialize Next.js project
□ Build landing page
□ Build signup/login flow
□ Build dashboard
□ Build 4-step video wizard
□ Build job status screen
□ Build video library
□ Deploy frontend to Vercel
□ Build POST /video/generate endpoint
□ Build LLM Worker (script generation)
□ Build Visual Worker (Kling/Motion)
□ Build Audio Worker (TTS + music)
□ Build Caption Worker
□ Build FFmpeg Render Worker
□ Build Finalize Worker (S3 upload)
□ Set up S3 buckets
□ Set up CloudFront CDN
□ Deploy GPU workers to Modal/RunPod
□ Integrate Stripe billing
□ Implement fallback logic
□ Add Sentry error tracking
□ Add PostHog analytics
□ End-to-end testing
□ Security audit
□ Launch!
```

---

## 💡 **RECOMMENDED DEVELOPMENT APPROACH**

### **3 Parallel Tracks:**

1. **Backend Track:**
   - Database + FastAPI + Redis setup
   - API endpoints
   - Worker pipeline

2. **Frontend Track:**
   - Next.js UI
   - 4-step wizard (can mock API initially)
   - Dashboard & library

3. **AI/Pipeline Track:**
   - Test LLM → Visual → FFmpeg locally
   - Optimize rendering speed
   - Fine-tune prompts

**Timeline:**

- Week 1: Foundation
- Week 2: Frontend MVP + Backend skeleton
- Week 3: Pipeline integration
- Week 4: Storage + delivery
- Week 5: Polish + launch

**Critical Path:**
The pipeline (Phase 3) is the most complex. Start testing LLM + FFmpeg locally ASAP, even before full frontend is ready.

---

## 🎯 **SUCCESS CRITERIA**

Your MVP is ready when:

✅ User can sign up in < 30 seconds  
✅ User can generate a video in < 60 seconds (interaction time)  
✅ Video renders in < 2 minutes (Moving Images)  
✅ Video renders in < 5 minutes (Cinematic/Kling)  
✅ All fallbacks work automatically  
✅ Credits are deducted correctly  
✅ Videos are delivered via CDN  
✅ Mobile experience is smooth  
✅ Error rate < 5%

---

## 🚀 **NEXT STEPS**

Start with:

1. Set up PostgreSQL database (Supabase recommended)
2. Initialize FastAPI project
3. Initialize Next.js project
4. Build first API endpoint (`GET /meta/genres`)
5. Build first frontend screen (Landing Page)

Then work systematically through each phase.

**You're ready to build!** 🎬
