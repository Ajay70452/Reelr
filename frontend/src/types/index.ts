// API Response Types

export interface Genre {
  id: string;
  display_name: string;
  description: string;
  icon?: string;
  example_topics?: string[];
}

export interface VisualStyle {
  id: string;
  display_name: string;
  description?: string;
  type?: "moving_images" | "cinematic" | "stock";
  thumbnail?: string;
}

export interface Preset {
  id: string;
  visual_style_id: string;
  display_name: string;
  description: string;
  base_prompt?: string;
  negative_prompt?: string;
  motion_type?: string;
  quality_multiplier?: number;
  thumbnail?: string;
  preview_video?: string;
}

// AI Generation Presets (for Image & Video generators)
export interface AIPreset {
  id: string;
  display_name: string;
  description?: string;
  prompt_prefix?: string;
  prompt_suffix?: string;
  negative_prompt?: string;
  thumbnail_url?: string;
}

export interface QualityOption {
  id: string;
  display_name: string;
  description?: string;
  credits_required: number;
  resolution?: string;
  features?: string[];
}

export interface Voice {
  id: string;
  display_name: string;
  provider: "elevenlabs" | "openai";
  voice_id: string;
  gender?: "male" | "female" | "neutral";
  age_range?: string;
  accent?: string;
  preview_url?: string;
  is_premium: boolean;
}

export interface Music {
  id: string;
  display_name: string;
  genre: string;
  mood: string;
  category?: string;
  duration: number;
  file_path?: string;
  preview_url?: string;
  is_premium: boolean;
}

export interface VideoJob {
  id: string;
  user_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  current_stage?: string;
  genre_id: string;
  custom_topic?: string;
  visual_style_id: string;
  preset_id: string;
  quality_option_id: string;
  voice_id: string;
  music_id: string;
  aspect_ratio: string;
  duration: number;
  settings: VideoSettings;
  script?: string;
  scenes?: Scene[];
  error_message?: string;
  fallback_used: boolean;
  credits_used: number;
  video_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoSettings {
  emphasis_words: boolean;
  fast_cuts: boolean;
  auto_effects: boolean;
  auto_captions: boolean;
}

export interface Scene {
  scene_id: number;
  narration: string;
  visual_prompt: string;
  duration: number;
  video_url?: string;
  image_url?: string;
}

export interface Video {
  id: string;
  job_id: string;
  user_id: string;
  title?: string;
  video_url: string;
  thumbnail_url: string;
  cdn_url: string;
  duration: number;
  file_size: number;
  resolution: string;
  aspect_ratio: string;
  views: number;
  created_at: string;
}

export interface UserCredits {
  credits: number;
  plan: string;
}

// Request Types

export interface GenerateVideoRequest {
  genre_id: string;
  custom_topic?: string;
  visual_style_id: string;
  preset_id: string;
  quality_option_id: string;
  voice_id: string;
  music_id: string;
  aspect_ratio: string;
  duration: number;
  settings: VideoSettings;
}

export interface ConsumeCreditsRequest {
  amount: number;
}

// Image Generation Types

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  prompt: string;
  model: string;
  image_size: string;
  seed?: number;
  created_at: string;
}

export interface GenerateImageRequest {
  prompt: string;
  model: string;  // flux-2-pro, flux-2-max, nano-banana, nano-banana-pro
  image_size: string;  // square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
  seed?: number;
  safety_tolerance?: number;
  enable_safety_checker?: boolean;
  output_format?: string;  // jpeg, png
  preset_id?: string;  // Optional style preset
  enhance_prompt?: boolean;  // If true, uses LLM to expand short prompts
}

export interface ImageJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  image_url?: string;
  thumbnail_url?: string;
  error_message?: string;
}

// AI Video Generation Types (Sora 2, Veo 3, Kling 2.5, LTX-2)

export type AIVideoModel = "sora2" | "veo3" | "kling25" | "ltx2";

export interface AIVideoModelConfig {
  name: string;
  resolutions?: string[];
  aspect_ratios: string[];
  durations: number[];
  supports_negative_prompt: boolean;
  supports_audio: boolean;
  supports_seed: boolean;
  max_duration: number;
  default_duration: number;
  default_aspect_ratio: string;
  default_resolution?: string;
  // Model-specific
  supports_cfg_scale?: boolean;
  cfg_scale_default?: number;
  supports_fps?: boolean;
  fps_default?: number;
  supports_video_quality?: boolean;
  video_quality_options?: string[];
  supports_prompt_expansion?: boolean;
  supports_safety_checker?: boolean;
  supports_multiscale?: boolean;
  supports_camera_lora?: boolean;
  supports_auto_fix_prompt?: boolean;
  estimated_time?: string;
}

export interface PreviewPromptResponse {
  original_prompt: string;
  enhanced_prompt: string;
  negative_prompt: string | null;
  was_expanded: boolean;
}

export interface GenerateAIVideoRequest {
  prompt: string;
  model: AIVideoModel;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  negative_prompt?: string;
  // Reference image available for ALL models - base64 data URL or public URL
  reference_image?: string;
  // Optional style preset - augments the user prompt
  preset_id?: string;
  // Prompt enhancement - if true, uses LLM to expand short prompts
  enhance_prompt?: boolean;
  options?: {
    generate_audio?: boolean;
    seed?: number;
    cfg_scale?: number;
    fps?: number;
    video_quality?: string;
    enable_prompt_expansion?: boolean;
    enable_safety_checker?: boolean;
    multiscale?: boolean;
    camera_lora?: string;
    camera_lora_scale?: number;
    auto_fix_prompt?: boolean;
  };
}

export interface AIVideoJob {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  video_url?: string;
  thumbnail_url?: string;
  error_message?: string;
}

export interface AIVideo {
  id: string;
  url: string;
  thumbnail_url?: string;
  prompt: string;
  model: AIVideoModel;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  created_at: string;
}

// Trending Video Types (Kling 2.6 Motion Control)

export type TrendingIntensity = "subtle" | "normal" | "extreme";
export type TrendingQuality = "standard" | "pro";

export interface GenerateTrendingThemeRequest {
  theme_id: string;
  reference_image: string;
  intensity: TrendingIntensity;
  duration: number;
  aspect_ratio: string;
  quality: TrendingQuality;
}

export interface GenerateTrendingCustomRequest {
  prompt?: string;
  reference_image: string;
  reference_video: string; // REQUIRED — motion reference video
  intensity: TrendingIntensity;
  duration: number;
  aspect_ratio: string;
  quality: TrendingQuality;
}

export interface TrendingVideoJob {
  job_id: string;
  status: "queued" | "building_prompt" | "generating_video" | "composing" | "encoding" | "completed" | "failed";
  progress: number;
  video_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  flow_type?: "theme" | "custom";
  theme_id?: string;
}

export interface TrendingTheme {
  id: string;
  display_name: string;
  description: string;
  default_duration: number;
  allowed_durations: number[];
  has_motion_video: boolean;
  preview_url?: string;
}

// UI State Types

export interface WizardStep {
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
}
