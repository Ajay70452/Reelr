# ⭐ **DATABASE SCHEMA DOCUMENT — AI VIDEO GENERATOR MVP**

## **Version:** 1.0

## **DB:** PostgreSQL

## **Owner:** Backend Engineering

---

# 1️⃣ **Entity Relationship Diagram (ERD) — HIGH LEVEL**

```
Users --< Credits
Users --< VideoJobs --< Videos
Genres --< VideoJobs
VisualStyles --< VideoJobs
Presets --< VideoJobs
Voices --< VideoJobs
Music --< VideoJobs
QualityOptions --< VideoJobs
```

This structure allows:

- Simple querying
- Efficient job processing
- Clean future expansion (batch, multi-scene metadata, etc.)

---

# 2️⃣ **TABLE DEFINITIONS**

Let’s define each table.

---

# ⭐ 2.1 **users**

Stores basic user details.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  auth_provider TEXT DEFAULT 'supabase',
  created_at TIMESTAMP DEFAULT NOW(),
  plan TEXT DEFAULT 'free'
);
```

---

# ⭐ 2.2 **credits**

Tracks how many credits a user has.

```sql
CREATE TABLE credits (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_left INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id)
);
```

---

# ⭐ 2.3 **genres**

List of content categories for Step 1.

```sql
CREATE TABLE genres (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT
);
```

Sample values:

- motivation
- business
- psychology
- philosophy
- horror
- animals
- history
- relationships

---

# ⭐ 2.4 **visual_styles**

(Step 2 main choice)

```sql
CREATE TABLE visual_styles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);
```

Example:

- moving_images
- cinematic_video (Kling 2.6 / Sora premium)
- stock_default (fallback system)

---

# ⭐ 2.5 **presets**

Presets depend on visual style.

```sql
CREATE TABLE presets (
  id TEXT PRIMARY KEY,
  visual_style_id TEXT REFERENCES visual_styles(id),
  display_name TEXT NOT NULL,
  description TEXT
);
```

Examples:

- cinematic
- aesthetic
- anime
- vaporwave
- pov
- hyperreal
- neon

---

# ⭐ 2.6 **quality_options**

```sql
CREATE TABLE quality_options (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  credits_required INT NOT NULL
);
```

Examples:

- basic → 2 credits
- standard → 5 credits
- premium → 12 credits

---

# ⭐ 2.7 **voices**

Available TTS options.

```sql
CREATE TABLE voices (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE
);
```

Examples:

- male_1
- female_1
- deep_narrator
- premium_voice_a

---

# ⭐ 2.8 **music**

Background music options.

```sql
CREATE TABLE music (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT,
  is_premium BOOLEAN DEFAULT FALSE
);
```

---

# ⭐ 2.9 **video_jobs**

This is the CORE table where rendering jobs are tracked.

```sql
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- selections
  genre_id TEXT REFERENCES genres(id),
  visual_style_id TEXT REFERENCES visual_styles(id),
  preset_id TEXT REFERENCES presets(id),
  quality_id TEXT REFERENCES quality_options(id),

  voice_id TEXT REFERENCES voices(id),
  music_id TEXT REFERENCES music(id),

  topic TEXT,
  script TEXT,                 -- LLM output
  scenes JSONB,                -- scene-by-scene structure

  duration INT,
  aspect_ratio TEXT,

  advanced JSONB,              -- emphasis_words, fast_cuts, auto_effects

  status TEXT DEFAULT 'queued',      -- queued|processing|completed|failed
  progress INT DEFAULT 0,

  error_message TEXT,
  fallback_used BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# ⭐ 2.10 **videos**

Stores the final output and metadata.

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES video_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INT,
  resolution TEXT DEFAULT '1080p',
  size_mb DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# ⭐ 2.11 **billing_history**

Tracks subscription or credit pack purchases.

```sql
CREATE TABLE billing_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  credits_added INT,
  plan TEXT,
  provider TEXT,
  external_ref TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# ⭐ 2.12 **worker_logs**

Critical for debugging generation failures.

```sql
CREATE TABLE worker_logs (
  id SERIAL PRIMARY KEY,
  job_id UUID REFERENCES video_jobs(id),
  worker_type TEXT,
  log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 3️⃣ **INDEXING STRATEGY**

```sql
CREATE INDEX idx_jobs_user ON video_jobs(user_id);
CREATE INDEX idx_jobs_status ON video_jobs(status);
CREATE INDEX idx_videos_user ON videos(user_id);
CREATE INDEX idx_jobs_created ON video_jobs(created_at);
```

---

# 4️⃣ **FALLBACK & FAILSAFE SUPPORT**

The schema explicitly supports:

- marking fallbacks
- storing intermediate scenes
- storing error logs
- tracking credits for quality-level jobs

---

# 5️⃣ **SCHEMA SUMMARY**

| Table           | Purpose                                 |
| --------------- | --------------------------------------- |
| users           | user accounts                           |
| credits         | track balances                          |
| genres          | Step 1 categories                       |
| visual_styles   | Cinematic Video / Moving Images / Stock |
| presets         | cinematic, anime, aesthetic, etc.       |
| quality_options | basic / standard / premium              |
| voices          | AI voice options                        |
| music           | bgm                                     |
| video_jobs      | generation pipeline tracking            |
| videos          | final rendered MP4s                     |
| billing_history | payments                                |
| worker_logs     | errors + pipeline tracking              |

---

# ⭐ Final Verdict

This schema is:

- **Minimal but complete**
- **Perfect for an MVP**
- **Supports Kling 2.6 + Flux + Moving Images**
- **Allows future scaling**
- **Clear enough for any backend dev**
- **Production-ready**
