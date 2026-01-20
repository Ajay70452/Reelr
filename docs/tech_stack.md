# ⭐ **TECH STACK DOCUMENT — AI VIDEO GENERATOR MVP**

## **Version:** 1.0

## **Owner:** Founders + Engineering

---

# 1️⃣ **Frontend**

### **Framework**

- **Next.js (React)**
  - Fast rendering
  - Great for multi-step wizards
  - Ideal for SaaS dashboards

### **Styling**

- **TailwindCSS**
  - Fast UI iteration
  - Clean componentization
  - Dark-mode friendly

### **State Management**

- **Zustand** (lightweight, perfect for wizard flows)

### **Deployment**

- **Vercel**
  - Fast global CDN
  - Zero-config deploys
  - SSR/ISR where needed

---

# 2️⃣ **Backend**

### **Primary API Framework**

- **FastAPI (Python)**
  - Async-first
  - Perfect for connecting to AI pipelines
  - Fast and easy to scale

### **Auth**

- **Supabase Auth** or **Clerk**
  - JWT-based
  - Magic links or Google login
  - Fast setup

### **REST API**

- JSON-based
- Rate-limited
- Token-authenticated

---

# 3️⃣ **Database**

- **PostgreSQL**
  - Structured job tracking
  - Perfect for relational data
  - Easy scaling with Supabase or RDS

Optional:

- **Supabase** (Postgres + Auth + Storage + Dashboard)

---

# 4️⃣ **Job Queue & Workers**

### **Queue System**

- **Redis + RQ (Redis Queue)**
  - Simple
  - Reliable
  - Perfect for chained video pipelines

### **Worker Types**

- LLM Worker (CPU)
- Scene Worker (CPU)
- Visual Worker (GPU)
- Audio Worker (CPU)
- Caption Worker (CPU)
- Render Worker (CPU-heavy)
- Finalize Worker (CPU)

---

# 5️⃣ **AI / ML Models**

### **LLM**

- **OpenAI GPT-4.1 / GPT-4o mini** (scripts, scenes, prompts)
- Backup: **Claude 3 Haiku**

### **Video Models**

- **kling 2.6**
- **Sora**

### **Images**

- **nano banana pro**

### **TTS**

- **ElevenLabs**
- OR **OpenAI TTS v2**

---

# 6️⃣ **Rendering Pipeline**

### **Core Renderer**

- **FFmpeg**
  - Concatenation
  - Transitions
  - Captions
  - Audio mixing
  - Final export (MP4)

### **Video Processing Stack**

#### **Video Rendering Engine**

- **FFmpeg** (direct subprocess calls)
  - **NOT** MoviePy (too slow)
  - Raw FFmpeg commands or `ffmpeg-python` wrapper
  - Self-hosted on GPU workers for Ken Burns effects
  - Handles: concatenation, transitions, zoompan, audio overlay

#### **Video Assembly Pipeline Components:**

**1. Ken Burns Effect Generator**

- FFmpeg `zoompan` filter
- Randomized pan/zoom directions
- 3-5 second duration per image
- Smooth acceleration/deceleration

**2. Transition Engine**

- Crossfade transitions (0.5-1 second)
- FFmpeg `xfade` filter
- Variety of transition types (fade, dissolve, wipeleft)

**3. Audio Processor**

- Voiceover normalization (-16 LUFS)
- Music ducking (lower volume during speech)
- Fade in/out
- FFmpeg audio filters

**4. Caption/Subtitle Generator** (Optional Phase 2)

- Burn-in captions for social media
- Whisper for timestamp extraction
- FFmpeg `drawtext` filter

### **Runtime**

- Python script for orchestrating FFmpeg steps

---

# 7️⃣ **Storage & CDN**

### **Object Storage**

- **AWS S3**

### **CDN**

- **CloudFront**
  - Signed URLs
  - Worldwide speed

### **Temporary Storage**

- `/tmp` on worker instances
- Auto-clean per job

---

# 8️⃣ **GPU Execution**

### **Preferred Providers**

- **Modal.com** (best developer UX)
- **RunPod** (cheapest GPU)
- **AWS EC2 g5.xlarge / g6.xlarge** (stable long-term)

---

# 9️⃣ **Monitoring & Logging**

### Logging

- **Sentry** (errors)
- **CloudWatch** or **Grafana** (worker metrics)

### Analytics

- **PostHog** (user behavior)
- **Vercel analytics** (frontend)

---

# 🔟 **Payments & Billing**

- **Stripe**
  - Subscriptions
  - Credit packs
  - Webhooks

---

# ⭐ **Tech Stack Summary (One-Liner)**

**Next.js + FastAPI + Redis Queue + Python Workers + FFmpeg + S3 + Postgres + Modal GPUs + GPT-4 + Motion/Sora models**

That’s your entire machine — the simplest, fastest, highest-leverage stack for AI video SaaS.
