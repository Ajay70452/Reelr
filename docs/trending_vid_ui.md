# 🧭 1️⃣ SIDEBAR STRUCTURE

Your left sidebar should now look like:

```
Generate
  • AI Image
  • AI Video

🔥 Trending Video

Series (locked)
```

When user clicks:

> 🔥 Trending Video

Main panel loads the new layout.

---

# 🖥 2️⃣ TRENDING VIDEO PAGE — TOP LAYOUT

At the top of this page:

```
-----------------------------------------
🔥 Trending AI Videos
Turn yourself into viral trend videos in seconds
-----------------------------------------

[ Select Trending Theme ]   [ Create Your Own ]
```

These are **large segmented tabs**, not small buttons.

Design:

- Rounded pill style
- Active tab highlighted
- Clear visual separation

Default tab = **Select Trending Theme**

---

# 🟣 3️⃣ TAB 1 — SELECT TRENDING THEME (Mass Market Flow)

This is your ad-driven engine.

---

## 🔹 SECTION A — Theme Grid

Top of page:

```
Trending Now 🔥

[ Dance Mania ]
[ Slow Glow Up ]
[ Anime Transform ]
[ Cinematic Walk ]
[ Meme Jump Cut ]
```

Each theme card contains:

- Looping preview video
- Small “Trending” badge
- Short description
- Duration badge (e.g., 8s)

Card Layout:

```
┌─────────────────────┐
|  Looping Preview    |
|  🔥 Dance Mania     |
|  8s | High Energy   |
└─────────────────────┘
```

Clicking a theme opens configuration panel below.

---

## 🔹 SECTION B — Configuration Panel (After Theme Selected)

Once a theme is clicked, show:

```
Selected Theme: Dance Mania
--------------------------------
Upload Your Photo *
[ Upload Image ]

Motion Intensity
( ) Subtle
(●) Normal
( ) Extreme

Aspect Ratio
(●) 9:16
( ) 1:1
( ) 16:9

Duration
(●) 8s
( ) 5s
( ) 10s

[ Generate Video ]
```

Notes:

- Upload Image required
- No prompt field here
- No reference video here
- Keep it simple
- No advanced settings

After generate:

- Show preview
- Regenerate button
- Download button

---

# 🔵 4️⃣ TAB 2 — CREATE YOUR OWN (Power Users)

This tab is slightly more advanced but still clean.

---

## 🔹 SECTION A — Uploads

```
Create Your Own AI Trend Video
--------------------------------

Upload Reference Image *
[ Upload Image ]

Optional Reference Video
[ Upload Video ]

Prompt
[ Textarea ]
"Describe the video you want..."
```

Important:

- Reference image required
- Reference video optional
- Prompt required

---

## 🔹 SECTION B — Controls

Below prompt:

```
Motion Intensity
( ) Subtle
(●) Normal
( ) Extreme

Duration
( ) 5s
(●) 8s
( ) 10s

Aspect Ratio
(●) 9:16
( ) 1:1
( ) 16:9
```

Keep controls identical to Trending tab for consistency.

---

## 🔹 SECTION C — Generate

```
[ Generate Video ]
```

After generation:

- Preview
- Regenerate (same prompt)
- Modify prompt
- Download

---

# 🎨 5️⃣ VISUAL HIERARCHY RULES (Important)

### Trending Tab:

- Big previews
- Visual first
- No thinking
- Large generate button

### Create Tab:

- Structured
- Clean spacing
- Prompt dominant
- Still minimal

---

# 🧠 6️⃣ UX FLOW SUMMARY

## Trending Flow:

```
Click Trending Video
↓
Select Theme
↓
Upload Image
↓
Choose intensity
↓
Generate
```

Low friction. High conversion.

---

## Create Your Own Flow:

```
Click Trending Video
↓
Switch to Create Your Own
↓
Upload Image
↓
Optional reference video
↓
Write prompt
↓
Choose intensity
↓
Generate
```

Higher engagement. Higher control.

---

# ⚙️ 7️⃣ Technical Mapping (Backend Awareness)

Trending tab:

- Predefined structured prompt
- Inject intensity modifier
- Inject camera grammar
- Inject motion pattern

Create tab:

- Use prompt enhancer
- Merge reference image
- Merge reference video
- Compose structured Kling 3.0 prompt

Two different prompt composers.

---

# 🚀 Why This UI Works

- Clean separation of user psychology
- Zero confusion
- Scalable
- Ad-friendly
- Not bloated
- Still powerful
- Clear mental model

---

# 🔥 Final Architecture

Sidebar → Trending Video
Inside → 2 Tabs
Each tab → Independent logic
Shared rendering engine (Kling 3.0 + Remotion polish)
