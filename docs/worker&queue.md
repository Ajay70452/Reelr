# ⭐ **WORKER & QUEUE ARCHITECTURE DOCUMENT**

## Version: 1.0

## Owner: Backend Infrastructure Team

## Stack: FastAPI + Redis + RQ Workers + GPU Workers + FFmpeg Workers

---

# 1️⃣ HIGH-LEVEL OVERVIEW

Your system uses a **multi-queue architecture** to run video generation jobs asynchronously:

```
FastAPI → Redis Queue → Worker Cluster → S3 → Frontend
```

### Worker Types:

1. **LLM Worker** (CPU)
2. **Scene Worker** (CPU)
3. **Visual Worker** (GPU-heavy)
4. **Audio Worker** (CPU)
5. **Caption Worker** (CPU)
6. **Render Worker** (CPU-heavy)
7. **Finalize Worker** (CPU)

### Queue Groups:

```
llm_queue
scene_queue
visual_queue
audio_queue
caption_queue
render_queue
finalize_queue

high_priority_queue
```

---

# 2️⃣ QUEUE STRUCTURE

## **Redis Queues**

We use **RQ** (Redis Queue) for simplicity and reliability.

### 1. `llm_queue`

- Generates scripts
- Very fast (<1 sec per request)
- High concurrency

### 2. `scene_queue`

- Converts script → scenes
- Creates prompts
- Medium concurrency (~10–20 workers)

### 3. `visual_queue`

- MOST EXPENSIVE
- Requires GPUs
- Runs SORA / MiniSora / AnimateDiff / Runway

Must be isolated from CPU jobs.

Has two sub-queues:

```
visual_sora_queue (GPU)
visual_motion_queue (GPU)
```

### 4. `audio_queue`

- TTS + music processing
- Low CPU
- High concurrency

### 5. `caption_queue`

- Caption timing
- OCR/whisper fallback (optional)

### 6. `render_queue`

- FFmpeg pipeline
- CPU-heavy
- Medium concurrency

### 7. `finalize_queue`

- Upload to S3
- Cleanup tmp files
- Update job status
- Issue refund if needed

---

# 3️⃣ WORKER TYPES & RESPONSIBILITIES

---

# ⭐ **1. LLM Worker (CPU)**

**Queue:** `llm_queue`

## Responsibilities:

- Generate scripts
- Rewrite scripts for timing
- Generate scenes
- Detect harmful content
- Produce raw scene prompts

## Machine Type:

- CPU-only
- 1–2 vCPU
- High concurrency (20–50 workers)

## Time Limit:

- < 10 seconds per job

---

# ⭐ **2. Scene Worker (CPU)**

**Queue:** `scene_queue`

Responsibilities:

- Refine scene segmentation
- Add preset-based constraints
- Add visual-style conditions
- Convert script → structured scene JSON

## Machine Type:

- CPU
- 1 vCPU
- 10–20 workers

## Time Limit:

- < 5 seconds

---

# ⭐ **3. Visual Workers (GPU)**

This is the HEART of the system.

---

# **A) Sora Worker (GPU)**

**Queue:** `visual_sora_queue`

Responsibilities:

- Generate video clips from scene prompts
- Produce 3–7 second video segments
- Upload raw clips to S3

### GPU Requirements:

- 24GB VRAM recommended
- Modal / RunPod / EC2 g5.2xlarge

### Concurrency:

- 1 job per GPU machine
- 1–5 machines

### Time Limit:

- 20–40 sec per scene
- 3–4 minute timeout

---

# **B) Moving Images Worker (GPU)**

**Queue:** `visual_motion_queue`

Handles:

- AnimateDiff
- Runway-like motion
- Pika-style subtle animation

### GPU Requirements:

- 8–16GB VRAM
- Faster than SORA pipeline

### Time Limit:

- 2–10 sec per scene

---

# **C) Stock Fallback Worker (CPU)**

If visual generation fails:

**Queue:** `visual_queue`, but CPU-only worker picks it up.

- Fetches stock footage
- Applies pan/zoom effect
- Outputs video clips

---

# ⭐ **4. Audio Worker (CPU)**

**Queue:** `audio_queue`

Responsibilities:

- Voice generation using TTS APIs
- Background music mixing
- Audio normalization
- Removing silence
- Producing final `voice.wav`

### Machine:

- CPU
- 1–2 vCPU

### Time Limit:

- < 10 sec

---

# ⭐ **5. Caption Worker (CPU)**

**Queue:** `caption_queue`

Responsibilities:

- Generate subtitle timings
- Apply caption style templates
- Output `captions.srt` or JSON

---

# ⭐ **6. Render Worker (CPU-heavy)**

**Queue:** `render_queue`

This is FFmpeg heavy lifting.

Responsibilities:

- Concatenate visual clips
- Adjust to voice timings
- Insert captions
- Add transitions
- Add effects
- Apply aspect ratio
- Export final MP4

### Machine:

- CPU-only
- 4–8 vCPU recommended
- Local SSD scratch

### Time Limit:

- 30–120 seconds

---

# ⭐ **7. Finalize Worker (CPU)**

**Queue:** `finalize_queue`

Responsibilities:

- Upload final video to S3
- Generate thumbnail
- Cleanup /tmp
- Mark job status
- Return signed URL

Time limit:

- < 5 sec

---

# 4️⃣ WORKER FLOW ORDER (Sequential / Chained)

```
1. llm_worker
2. scene_worker
3. visual_worker (GPU)
4. audio_worker
5. caption_worker
6. render_worker
7. finalize_worker
```

Each worker enqueues the next stage after completing.

---

# 5️⃣ CONCURRENCY & SCALING RULES

### LLM Workers:

- Very cheap
- 10–50 concurrency

### Scene Workers:

- 10–20 concurrency

### Visual Workers (GPU):

- Most expensive
- 1 job per GPU
- Max concurrency = number of GPUs

### Render Workers:

- CPU-heavy
- 4–8 concurrency

### Finalize:

- Light workload
- 20 concurrency

---

# 6️⃣ PRIORITY SYSTEM

### Premium users:

- Their jobs go to `high_priority_queue`
- Their jobs **jump the line**
- GPU workers poll high-priority first

### Free users:

- Go to normal queues
- Rate-limited

---

# 7️⃣ RETRY, FALLBACK & FAILURE LOGIC

### **Automatic Retries:**

| Stage    | Retries |
| -------- | ------- |
| LLM      | 2       |
| Scene    | 1       |
| Visual   | 2       |
| Audio    | 1       |
| Render   | 1       |
| Finalize | 1       |

---

### **Fallback Logic (Most Important)**

If **SORA worker fails twice**:

```
Switch job to Moving Images queue
Mark fallback_used = true
```

If Moving Images fails:

```
Switch job to Stock fallback
fallback_used = true
```

If all fail:

```
Refund credits
Mark job status = "failed"
```

---

# 8️⃣ RESOURCE MANAGEMENT RULES

### TMP File Cleanup:

Workers delete all temp files after each job.

### S3 Upload:

Only final renders are long-term stored.

### GPU Warm Loading:

Workers preload models to avoid cold starts.

---

# 9️⃣ LOGGING & MONITORING

### Logs stored in:

- `worker_logs` DB table
- CloudWatch / Grafana dashboards

### Logs include:

- Job ID
- Worker type
- Duration
- Failure message
- Retry count
- GPU/CPU usage

---

# 1️⃣0️⃣ WORKER DEPLOYMENT STRATEGY

### Phase 1 (MVP)

- 1 GPU worker (Sora proxy)
- 1 GPU worker (AnimateDiff)
- 1–2 CPU render workers
- 5–10 LLM workers
- 1 finalize worker

### Phase 2

- Autoscale CPU workers
- Add additional GPU instances
- High-priority queue for Pro/Premium users

### Phase 3

- Multi-region worker pools
- Dedicated Sora pipeline machines
- Worker health checks & autoscaling scripts

---

# ⭐ FINAL SUMMARY

Your worker architecture is:

- **Scalable**
- **GPU-aware**
- **Fail-safe**
- **Modular**
- **Optimized for SORA and Motion models**
- **Aligned with real-world AI video SaaS engineering**

This system will **not crash**, will keep you **cost-efficient**, and will give users a consistently stable experience.
