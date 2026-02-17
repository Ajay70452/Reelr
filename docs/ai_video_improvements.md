# AI Video Quality & UX Polish Plan

## Context

The AI video generator already has prompt enhancement (`app/services/prompt_enhancer.py`) and image-to-video support implemented. However, the prompt enhancer uses an outdated model (Claude 3 Haiku), generic image-focused prompts for video generation, and has a logic bug. The frontend uses `alert()` for errors and lacks prompt preview, suggestions, and generation time estimates.

This plan polishes both backend quality and frontend UX.

---

## Current AI Video Models

| Model | Fal.ai Endpoint | Max Duration | Credit Cost |
|-------|----------------|-------------|-------------|
| Sora 2 | `fal-ai/sora-2/text-to-video/pro` | 12s | 20 |
| Veo 3 | `fal-ai/veo3` | 8s | 15 |
| Kling 2.5 | `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` | 10s | 10 |
| LTX-2 | `fal-ai/ltx-2-19b/distilled/text-to-video` | 20s | 5 |

### Image-to-Video Models (already registered)
- Kling i2v Pro/Standard
- Veo2 i2v
- Minimax i2v
- Luma Dream Machine i2v

### Quality Tiers (renamed)

| Tier | Image Model | Video Model | Resolution | Upscale |
|------|------------|------------|------------|---------|
| Standard (2 credits) | Flux Schnell | CogVideoX 2B / Kling Standard | 768x768 | No |
| Premium (5 credits) | Flux Pro | CogVideoX 2B / Kling Pro | 1024x1024 | No |
| Ultra Premium (12 credits) | Flux Pro | CogVideoX 5B / Kling Pro | 1024x1024 | RealESRGAN |

---

## Phase 1: Prompt Enhancer Backend Upgrades

**File:** `app/services/prompt_enhancer.py` (all changes in one file)

### 1A. Upgrade Claude Model
- Change `claude-3-haiku-20240307` → `claude-haiku-4-5-20251001`
- Same cost tier, significantly better instruction following

### 1B. Cache Anthropic Client
- Current: creates new `anthropic.Anthropic()` on every call
- Fix: add `@lru_cache` singleton pattern at module level
- Move `import anthropic` and `os.getenv` out of method body

### 1C. Video-Specific System Prompts
Replace single generic `LLM_EXPANSION_SYSTEM_PROMPT` with model-specific prompts:

| Model | Prompt Style |
|-------|-------------|
| `sora2` | Narrative/screenplay — describe story flow, camera movements, mood shifts |
| `veo3` | Cinematic language — camera angle, depth of field, lighting setup |
| `kling25` | Structured/descriptive — subject, action, environment, lighting tags |
| `ltx2` | Technical/specification — resolution quality, camera motion type, color grading |
| `image` | Keep current generic prompt |

### 1D. Video-Specific Quality Suffix
Replace generic `"high quality, sharp focus, professional composition"` with model-aware suffixes:

| Model | Quality Suffix |
|-------|---------------|
| `image` | high quality, sharp focus, professional composition |
| `sora2` | high quality, smooth motion, cinematic look, professional production |
| `veo3` | high quality, fluid motion, cinematic cinematography, professional |
| `kling25` | high quality, consistent motion, smooth transitions, professional |
| `ltx2` | high quality, temporal consistency, smooth motion, professional rendering |

### 1E. Increase SHORT_PROMPT_THRESHOLD
- Change from 10 → 15 words
- 10 words catches reasonable prompts like "A cinematic shot of sunset over the ocean"
- 15 catches truly short ones like "a dog running" or "sunset on beach"

### 1F. Fix Expansion Logic Bug
**Bug:** When user toggles Enhance ON but prompt has ≥10 words, expansion is skipped due to double condition:
```python
should_expand = enhance_prompt or (word_count < SHORT_PROMPT_THRESHOLD)
if should_expand and word_count < SHORT_PROMPT_THRESHOLD:  # BUG
```
**Fix:** Change to `if should_expand:` so user-toggled Enhance always works regardless of word count.

### 1G. Differentiate Prompt Joining
- **Sora/Veo** (narrative models): Join with `. ` for sentence flow
- **Kling/LTX/image** (descriptive models): Keep `, ` tag-list joining

---

## Phase 2: Prompt Preview & Suggestions

### 2A. New Preview Endpoint
**File:** `app/api/routes/ai_video.py`

Add `POST /ai-video/preview-prompt` — runs prompt enhancement pipeline and returns result without starting generation:
```json
{
  "original_prompt": "a cat",
  "enhanced_prompt": "A fluffy orange tabby cat sitting on a sunlit windowsill, warm afternoon light streaming through the glass, cinematic shallow depth of field, smooth subtle motion, professional production",
  "negative_prompt": "blurry, low quality...",
  "was_expanded": true
}
```

### 2B. Frontend Preview UI
**File:** `frontend/src/app/generate/video/page.tsx`

- Add `usePreviewPrompt()` mutation hook
- When Enhance is toggled ON, show "Preview" button or auto-preview with 500ms debounce
- Display enhanced prompt in a collapsible purple-tinted panel between prompt input and controls
- "Use this prompt" button copies enhanced version into prompt field

### 2C. Prompt Suggestion Chips
**File:** `frontend/src/app/generate/video/page.tsx`

Add 3 example prompts per model, shown as horizontal scrollable chips when prompt is empty:

| Model | Example Prompts |
|-------|----------------|
| Sora 2 | "A golden retriever running through autumn leaves, camera follows alongside, warm light" |
| Veo 3 | "Cinematic close-up of coffee being poured, steam rising, soft morning light through window" |
| Kling 2.5 | "Cat stretching on a sunlit windowsill, dust particles floating, cozy atmosphere" |
| LTX-2 | "Aerial orbit around a medieval castle, foggy morning, photorealistic, camera slowly circling" |

Clicking a chip fills the prompt field.

---

## Phase 3: Toast Notifications

### 3A. Toast Store + Component
**New files:**
- `frontend/src/components/ui/Toast.tsx`
- `frontend/src/components/ui/ToastContainer.tsx`

Zustand store with `addToast()` / `removeToast()`. Fixed top-right position, auto-dismiss after 4s. Styled per type: success (green), error (red), warning (yellow), info (blue).

Mount `<ToastContainer />` in AppLayout.

### 3B. Replace All `alert()` Calls

| Location | Current | Replacement |
|----------|---------|-------------|
| Video page — invalid file type | `alert('Please select a JPG...')` | Warning toast |
| Video page — file too large | `alert('Image must be < 10MB')` | Warning toast |
| Video page — insufficient credits | `alert('Insufficient credits...')` | Error toast |
| Image page — same patterns | `alert(...)` | Warning/error toasts |

Add success/error toasts on generation complete/fail:
- Completed: `{ type: 'success', title: 'Video ready', message: 'Your video has been generated.' }`
- Failed: `{ type: 'error', title: 'Generation failed', message: jobStatus.error_message }`

---

## Phase 4: Generation Time Estimates

### 4A. Add Estimates to Model Configs
**File:** `app/services/model_router.py`

| Model | Estimated Time |
|-------|---------------|
| Sora 2 | 30–90 seconds |
| Veo 3 | 45–120 seconds |
| Kling 2.5 | 20–60 seconds |
| LTX-2 | 60–180 seconds |

### 4B. Display in Frontend
- Show in model selector cards: "~20-60s"
- Show in `GeneratingCard` during generation progress
- Add `estimated_time` to `AIVideoModelConfig` type

---

## Implementation Sequence

| Phase | Scope | Files | Effort |
|-------|-------|-------|--------|
| **Phase 1** | Backend only | `prompt_enhancer.py` | 1-2 hours |
| **Phase 2** | Full stack | `ai_video.py`, `api.ts`, `useApi.ts`, `video/page.tsx` | 2-3 hours |
| **Phase 3** | Frontend only | New `Toast.tsx`, `ToastContainer.tsx`, update pages | 2-3 hours |
| **Phase 4** | Full stack | `model_router.py`, `types/index.ts`, `video/page.tsx` | 1 hour |

---

## Verification Checklist

- [ ] Prompt enhancer: Test with short prompts (<15 words) across all model types — verify video-specific expansion
- [ ] Enhance toggle: Test with long prompts (>15 words) + Enhance enabled — should still expand (bug fix)
- [ ] Preview endpoint: Hit `/ai-video/preview-prompt` with different model/preset combos
- [ ] Toast system: Trigger all error/success paths (invalid file, insufficient credits, generation complete/fail)
- [ ] Prompt suggestions: Verify chips appear when prompt is empty, change per model, fill prompt on click
- [ ] Build: Run `npx next build` to verify no type errors

---

## Critical Files

| File | Changes |
|------|---------|
| `app/services/prompt_enhancer.py` | Phase 1 — model upgrade, cached client, video prompts, quality suffixes, threshold, bug fix |
| `app/api/routes/ai_video.py` | Phase 2A — preview-prompt endpoint |
| `frontend/src/app/generate/video/page.tsx` | Phases 2-4 — preview UI, suggestions, toasts, time estimates |
| `frontend/src/lib/api.ts` | Phase 2A — API client method |
| `frontend/src/hooks/useApi.ts` | Phase 2A — usePreviewPrompt hook |
| `frontend/src/components/ui/Toast.tsx` | Phase 3 — new file |
| `frontend/src/components/ui/ToastContainer.tsx` | Phase 3 — new file |
| `app/services/model_router.py` | Phase 4 — estimated_time field |
| `frontend/src/types/index.ts` | Phase 4 — type additions |

---

## Notes

- **No DB migration required** — all changes use existing schema. The `options` JSON column on `AIVideoJob` can store enhancement metadata.
- **Backward compatible** — the `model` parameter already exists in `enhance()`. Unknown model values fall back to the default image prompt.
- **Rate limiting** — the preview endpoint calls the LLM, so it should respect existing rate limits (piggyback on the generation rate limiter or add a lightweight one like 10 previews/min/user).
