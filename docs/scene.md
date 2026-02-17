Perfect. Below is a **clean, implementation-ready Scene Condensation Spec** with the **1 Scene = 1 Image rule hard-locked**.

This is written so you (or an engineer) can implement it **without interpretation**.

---

# 📄 SCENE CONDENSATION SPEC

## Version: v1.0 (Strict Mode)

### Status

**LOCKED:** 1 Scene → 1 Image
No exceptions in v1.

---

## 1️⃣ Purpose

Prevent **image overgeneration** by enforcing a deterministic, cost-controlled mapping between script scenes and generated images.

This spec ensures:

- predictable output
- lower cost
- faster generation
- higher visual consistency
- better downstream animation

---

## 2️⃣ Core Rule (Non-Negotiable)

> **Each Scene produces EXACTLY ONE image.**

- 3 scenes → 3 images
- 10 scenes → 10 images
- Never more
- Never less

This rule **cannot be overridden** by prompt content, LLM output, or presets in v1.

---

## 3️⃣ Definitions

### Scene

A scene is a **script block** explicitly labeled as:

```
Scene X:
```

A scene may contain:

- Visual
- Text on screen
- Sound
- Music
- Timing

### Keyframe Image

A **single representative visual** generated to anchor motion for that scene.

---

## 4️⃣ Accepted Scene Structure

A scene may include multiple fields, but **only one field is allowed to drive image generation**.

### Supported Fields

- `Visual:` ✅
- `Text on screen:` ❌ (ignored for image gen)
- `Sound:` ❌ (ignored)
- `Music:` ❌ (ignored)
- Timestamps ❌ (ignored)

---

## 5️⃣ Scene Parsing Rules

### 5.1 Scene Detection

A new scene starts when:

```
Scene <number>
```

is detected.

Everything until the next `Scene` marker belongs to the same scene.

---

### 5.2 Visual Extraction (Critical)

For each scene:

- Extract ONLY the content under `Visual:`
- If multiple sentences exist → treat as ONE description
- Do NOT split
- Do NOT enumerate
- Do NOT create variations

---

## 6️⃣ Keyframe Prompt Construction

### Input

Raw `Visual:` text from scene.

### Output

A **single condensed keyframe prompt**.

### Construction Rules

1. Use the `Visual:` description as the **core**
2. Clean unnecessary words (timestamps, redundancy)
3. Lightly normalize language (optional)
4. Append preset modifiers (if selected)
5. Append quality modifiers (if applicable)

---

### Example

**Scene Input**

```
Scene 2
Visual: Close-up of hands brushing through tall grass.
Text on screen: “Fast. Loud. Crowded.”
Sound: Nature rustle.
```

**Keyframe Prompt (final)**

```
Close-up cinematic shot of hands gently brushing through tall grass,
natural lighting, shallow depth of field, calm and intimate mood
```

✔ Text
✔ Sound
✔ Timing
→ All ignored for image generation

---

## 7️⃣ Hard Image Budget Enforcement

### System Constraint

```ts
IMAGES_PER_SCENE = 1;
```

### Total Image Count

```ts
TOTAL_IMAGES = TOTAL_SCENES * 1;
```

---

### Validation Check (Mandatory)

Before image generation begins:

```ts
if (imagesToGenerate !== sceneCount) {
  throw new Error("Scene condensation violation: image count mismatch");
}
```

This check **must exist** to prevent silent cost leaks.

---

## 8️⃣ Disallowed Behaviors (Explicit)

The following are **NOT allowed** in v1:

- ❌ Multiple images per scene
- ❌ Image generation from:
  - Text on screen
  - Sound cues
  - Music cues

- ❌ “Storyboard style” generation
- ❌ Start / mid / end image splitting
- ❌ Emotion-based extra frames
- ❌ LLM hallucinated scene expansion

---

## 9️⃣ LLM Usage Rules (If Used)

If an LLM is used for condensation, it MUST be instructed:

> “Generate ONE visual keyframe description for this scene.
> Do NOT split the scene.
> Do NOT create multiple images.
> Do NOT add variations.”

If LLM output contains:

- multiple visuals
- numbered lists
- alternatives

→ **Reject and regenerate**

---

## 🔟 Downstream Compatibility

This spec is designed to work with:

- AnimateDiff
- Kling
- Sora
- Veo
- LTX-2

Each model:

- receives **one image per scene**
- animates that image
- downstream stitching handles motion & timing

---

## 1️⃣1️⃣ Why This Spec Exists (Rationale)

- Short-form videos (2–6s scenes) do NOT need multiple keyframes
- Motion models interpolate better from one strong anchor
- Extra images increase:
  - cost
  - latency
  - inconsistency

- Users expect:
  - fast output
  - predictable results

---

## 1️⃣2️⃣ Future Extensions (Explicitly Disabled)

The following are **v2 ideas** and are NOT allowed now:

- 2 images for long scenes
- intro/outro images
- dynamic pacing rules
- beat-based image splitting

No early optimization.

---

## 1️⃣3️⃣ Acceptance Criteria

This spec is correctly implemented if:

- 3-scene script → 3 images generated
- No image generated from text/sound/music
- Image count is deterministic
- Cost scales linearly with scene count
- No silent overgeneration occurs

---

## Final Statement (Lock)

> **Scene Condensation v1 is intentionally strict.
> One Scene. One Image. Always.**
