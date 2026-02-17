-

# ⭐ **FRONTEND UX FLOW DOCUMENT — AI VIDEO GENERATOR MVP**

## **Version:** 1.0

## **Owner:** Product & Frontend Team

## **Scope:** Web App UX for Step 1 → Video Generation → Delivery

## **Platform:** React / Next.js

---

# 1️⃣ **HIGH-LEVEL USER FLOW (Top to Bottom)**

```
Landing Page → Signup → Dashboard → Create Video Flow (4 Steps)
   → Job Progress Screen → Video Library → Playback & Download
```

You must design the experience so that **even a first-time user completes a video in under 60 seconds**.

---

# 2️⃣ **DETAILED SCREEN-BY-SCREEN FLOW**

---

# ⭐ **SCREEN 1 — Landing Page**

### PURPOSE:

Make the user click “Generate Your First Video”.

### MUST HAVE ELEMENTS:

- Hero headline:
  **“Create AI Videos in Minutes — Motion, Sora, or Classic Faceless.”**
- Subheadline:
  **“Pick a genre → choose a style → auto-generate videos that go viral.”**
- CTA:
  **Get Started (Free)**
- Demo videos autoplaying
- Trust icons (“Powered by Sora-like AI Models”)
- Pricing teaser (“Plans start from $19/mo”)

### UX RULE:

**Remove choice. Give them one clear action: Start Creating.**

---

# ⭐ **SCREEN 2 — Signup/Login**

Fast & frictionless:

- Email only OR Google login
- No password until first video generated (passwordless magic link recommended)

---

# ⭐ **SCREEN 3 — User Dashboard**

This is the home screen.

### Sections:

- **Create New Video** (big button)
- **Your Videos** (grid of previous renders)
- **Credits remaining**
- **Upgrade button**

### UX Guidelines:

- The dashboard must feel EMPTY but motivating.
- First-time users see a **“Let’s make your first video → Start”** popup.

---

# ⭐ **CREATE VIDEO FLOW (4 STEP WIZARD)**

This is your CORE UX.

User must experience ZERO confusion.

---

# **STEP 1 — Select Genre (Niche)**

### Layout:

Grid of **10–12 cards**, each with:

- Icon / image
- Name (Motivation, Business, Psychology, etc.)

Also include:

- “Custom Topic” card at bottom

### UX Guidelines:

- Default selection: NONE
- After clicking a genre → instantly highlight & auto-advance to Step 2
- Category descriptions appear on hover

### Microcopy:

**“Choose the type of story you want to create.”**

---

# **STEP 2 — Select Visual Style**

This is the _most important UX step_.

### Part 1: Main Style Selection

Two large selectable boxes:

1️⃣ **Moving Images (Fast / Aesthetic)**
2️⃣ **Sora AI Video (Cinematic / Premium)**

After selecting a style → display the preset options below it.

---

### Part 2: Preset Selection (Conditional)

A multi-row grid depending on the style chosen.

Example presets:

- Cinematic
- Aesthetic
- Anime
- Neon
- Minimalist
- POV
- Hyperreal

Only show 6–8 presets max.

---

### Part 3: Quality Selection

Horizontal 3-option selector:

- **Basic** — fewer credits
- **Standard** — recommended
- **Premium** — highest quality (Sora-style upscale)

Premium tier should show a lock icon for free users.

### UX Guidelines:

- Each selection feels like "one-click progression"
- Do NOT scroll inside this step
- Do NOT overwhelm with 20 presets

### Microcopy:

**“Choose how you want the video to LOOK.”**

---

# **STEP 3 — Voice + Music**

### Layout:

Two sections:

### A) Voice Selection (horizontal cards)

- Male
- Female
- Deep narrator
- Soft emotional
- Premium (locked)

Include play icons to preview.

### B) Background Music

Simple dropdown:

- Energetic
- Emotional
- Calm
- Trap
- None

### UX Rule:

Do NOT allow users to upload their own music in MVP.

### Microcopy:

**“Pick the voice and vibe of your video.”**

---

# **STEP 4 — Video Settings**

### Layout:

Three simple selectors:

**A) Aspect Ratio**

- 9:16 (default)
- 1:1
- 16:9

**B) Duration**
Preset buttons:

- 15 sec
- 30 sec
- 45 sec
- 60 sec

**C) Advanced Options (collapsed by default)**

- Emphasis Words: ON/OFF
- Fast Cuts: ON/OFF
- Auto Effects: ON/OFF
- Auto Captions: ON/OFF

### Microcopy:

**“Almost done — set your video format.”**

---

# ⭐ **FINAL STEP — Generate Video**

Button: **Generate Video**

On click:

- Immediate credit deduction
- Redirect to Job Status screen

---

# ⭐ **JOB STATUS SCREEN**

Shows:

- Progress bar (%)
- Steps completed (“Generating Script”, “Creating Scenes”, “Rendering”, etc.)
- Optional animation
- Job ID
- Button: “Go to Dashboard”

### UX Guideline:

Keep user calm.
Jobs will take 30–90 seconds for Moving Images, 2–5 mins for Sora-style.

---

# ⭐ **VIDEO COMPLETE SCREEN**

Shows:

- Autoplay of final video
- Download button
- Copy link
- “Create Another Video”
- “Add to Batch”
- Suggestion: “Upgrade for HD Sora clips”

---

# ⭐ **VIDEO LIBRARY**

Grid view with:

- Thumbnails
- Duration
- Timestamp
- Buttons: Download / Delete / Duplicate settings

---

# 3️⃣ **UI/UX DESIGN PRINCIPLES**

These rules must guide your entire UI.

---

# ✔ 1. **No more than 3 decisions per screen**

Cognitive load must remain low.

---

# ✔ 2. **Everything must fit in one screen without scrolling**

Especially Step 2 & 3.

---

# ✔ 3. **Dark, cinematic theme works BEST**

Because your product outputs video.

Use:

- Black
- Deep gray
- Neon green/blue accents
- Soft card shadows

Like: Runway, Pika, Revid.

---

# ✔ 4. **Use guided microcopy everywhere**

Examples:

- “Select a vibe”
- “Choose your story type”
- “Let AI handle the heavy lifting”
- “This will take about 1 minute”

---

# ✔ 5. **Minimal user choices = maximum conversion**

Users do NOT want to think.
They want to **click → see magic**.

---

# ✔ 6. **Preset previews must be mini video loops**

1–2 second autoplay loops for each preset drastically improve UX.

---

# ✔ 7. **A “Use Recommended Settings” button boosts conversions**

Offer a one-click auto-fill option for beginners.

---

# ✔ 8. **Show credit cost after each selection**

Example:
“Estimated Cost: 8 credits”

Prevents surprise.

---

# ✔ 9. **Error handling must always fallback**

If Sora fails → “Video generated using Motion Style fallback.”

---

# ✔ 10. **Mobile responsiveness is essential**

Most creators use their phone.

---

# ⭐ **FINAL DELIVERABLE: COMPLETE FRONTEND FLOW**

**Landing → Signup → Dashboard → Create Video Wizard (4 Steps)**
→ Job Status → Video Complete → Library
