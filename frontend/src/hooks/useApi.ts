import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Genre,
  VisualStyle,
  Preset,
  QualityOption,
  Voice,
  Music,
  VideoJob,
  Video,
  UserCredits,
  GenerateVideoRequest,
  GeneratedImage,
  GenerateImageRequest,
  AIVideo,
  AIVideoJob,
  AIVideoModelConfig,
  GenerateAIVideoRequest,
  AIPreset,
  PreviewPromptResponse,
  GenerateTrendingThemeRequest,
  GenerateTrendingCustomRequest,
  TrendingVideoJob,
  TrendingTheme,
  LibraryVideo,
} from "@/types";

// ============================================
// Library Hooks (Unified Video Library)
// ============================================
export function useLibraryVideos() {
  return useQuery<LibraryVideo[]>({
    queryKey: ["libraryVideos"],
    queryFn: async () => {
      try {
        const response = await api.library.getVideos({ limit: 100 });
        return response.data.videos || [];
      } catch (error) {
        console.warn('Failed to fetch library videos');
        return [];
      }
    },
  });
}

// Metadata Hooks
export function useGenres() {
  return useQuery<Genre[]>({
    queryKey: ["genres"],
    queryFn: async () => {
      try {
        const response = await api.genres.list();
        return response.data.genres;
      } catch (error) {
        // Fallback mock data if backend is down
        console.warn('Using mock genres data - backend not available');
        return [
          { id: 'motivation', display_name: 'Motivation', description: 'Inspiring content about success and personal growth' },
          { id: 'business', display_name: 'Business & Money', description: 'Entrepreneurship, finance, and business strategies' },
          { id: 'psychology', display_name: 'Psychology', description: 'Human behavior, mental health, and psychology facts' },
          { id: 'philosophy', display_name: 'Philosophy', description: 'Philosophical ideas and deep thinking' },
          { id: 'horror', display_name: 'Horror', description: 'Scary stories and creepy content' },
          { id: 'animals', display_name: 'Animal Facts', description: 'Fascinating facts about animals and nature' },
          { id: 'history', display_name: 'History Facts', description: 'Historical events and stories' },
          { id: 'relationships', display_name: 'Relationship Advice', description: 'Dating, love, and relationship tips' },
          { id: 'facts', display_name: 'Fun Facts', description: 'Interesting and surprising facts' },
          { id: 'technology', display_name: 'Technology', description: 'Tech news, AI, and innovation' },
          { id: 'health', display_name: 'Health & Fitness', description: 'Wellness, fitness, and health tips' },
          { id: 'comedy', display_name: 'Comedy & Humor', description: 'Funny and entertaining content' },
        ];
      }
    },
  });
}

export function useVisualStyles() {
  return useQuery<VisualStyle[]>({
    queryKey: ["visualStyles"],
    queryFn: async () => {
      try {
        const response = await api.visualStyles.list();
        return response.data.styles;
      } catch (error) {
        console.warn('Using mock visual styles data - backend not available');
        return [
          { id: 'moving_images', display_name: 'Moving Images', description: 'AI-generated images with subtle motion effects', type: 'moving_images' as const },
          { id: 'cinematic_video', display_name: 'Cinematic AI Video', description: 'Full AI-generated video clips with cinematic quality', type: 'cinematic' as const },
          { id: 'stock_default', display_name: 'Stock Footage', description: 'High-quality stock video clips matched to your script', type: 'stock' as const },
        ];
      }
    },
  });
}

export function usePresets(styleId: string | null) {
  return useQuery<Preset[]>({
    queryKey: ["presets", styleId],
    queryFn: async () => {
      if (!styleId) return [];
      try {
        const response = await api.presets.list(styleId);
        return response.data.presets;
      } catch (error) {
        console.warn('Using mock presets data - backend not available');
        const allPresets: Record<string, Preset[]> = {
          moving_images: [
            { id: 'cinematic_mi', visual_style_id: 'moving_images', display_name: 'Cinematic', description: 'Dramatic lighting and epic compositions' },
            { id: 'aesthetic_mi', visual_style_id: 'moving_images', display_name: 'Aesthetic', description: 'Dreamy, colorful, and visually pleasing' },
            { id: 'anime_mi', visual_style_id: 'moving_images', display_name: 'Anime', description: 'Japanese animation style' },
            { id: 'neon_mi', visual_style_id: 'moving_images', display_name: 'Neon Glow', description: 'Cyberpunk vibes with neon colors' },
            { id: 'minimal_mi', visual_style_id: 'moving_images', display_name: 'Minimal Clean', description: 'Simple and modern design' },
            { id: 'dark_mi', visual_style_id: 'moving_images', display_name: 'Dark Moody', description: 'Dark tones with dramatic atmosphere' },
            { id: 'vaporwave_mi', visual_style_id: 'moving_images', display_name: 'Vaporwave', description: 'Retro 80s/90s aesthetic' },
            { id: 'nature_mi', visual_style_id: 'moving_images', display_name: 'Nature', description: 'Natural landscapes and outdoor scenes' },
          ],
          cinematic_video: [
            { id: 'cinematic_cv', visual_style_id: 'cinematic_video', display_name: 'Cinematic', description: 'Hollywood-style cinematic shots' },
            { id: 'pov_cv', visual_style_id: 'cinematic_video', display_name: 'POV Movement', description: 'First-person perspective movement' },
            { id: 'hyperreal_cv', visual_style_id: 'cinematic_video', display_name: 'Hyperrealistic', description: 'Ultra-realistic visuals' },
            { id: 'dreamy_cv', visual_style_id: 'cinematic_video', display_name: 'Dreamy Surreal', description: 'Surreal and dreamlike atmosphere' },
            { id: 'action_cv', visual_style_id: 'cinematic_video', display_name: 'Action Dynamic', description: 'Fast-paced action sequences' },
            { id: 'nature_cv', visual_style_id: 'cinematic_video', display_name: 'Nature Documentary', description: 'Natural world documentary style' },
          ],
          stock_default: [],
        };
        return allPresets[styleId] || [];
      }
    },
    enabled: !!styleId,
  });
}

// AI Generation Presets Hook (for Image & Video generators)
export function useAIPresets() {
  return useQuery<AIPreset[]>({
    queryKey: ["aiPresets"],
    queryFn: async () => {
      try {
        const response = await api.aiPresets.list();
        return response.data.presets;
      } catch (error) {
        console.warn('Using fallback AI presets - backend not available');
        // Fallback presets matching new_preset_info.md with thumbnails
        return [
          { id: 'cinematic', display_name: 'Cinematic', description: 'High-end movie still with dramatic 3-point lighting and film grain', thumbnail_url: '/presets/cinematic.jpg' },
          { id: 'digital_art', display_name: 'Digital Art', description: 'Painterly digital illustration with smooth gradients and concept art quality', thumbnail_url: '/presets/digital_art.jpg' },
          { id: 'neon_futuristic', display_name: 'Neon Futuristic', description: 'Cyberpunk portrait with neon accents and dramatic contrast', thumbnail_url: '/presets/neon_futuristic.jpg' },
          { id: 'realistic_4k', display_name: '4K Realistic', description: 'Ultra-realistic with detailed skin texture and studio-grade accuracy', thumbnail_url: '/presets/4k-realisitc.jpg' },
          { id: 'comic_book', display_name: 'Comic Book', description: 'Bold outlines with halftone textures and graphic novel aesthetic', thumbnail_url: '/presets/comic_book.jpg' },
          { id: 'anime', display_name: 'Anime', description: 'Premium anime style with cel shading and expressive eyes', thumbnail_url: '/presets/anime.jpg' },
          { id: 'cartoon', display_name: 'Cartoon', description: 'Playful 2D illustration with simplified shapes and pastel colors', thumbnail_url: '/presets/cartoon.jpg' },
          { id: 'soft_aesthetic', display_name: 'Soft Aesthetic', description: 'Clean editorial style with gentle diffused lighting', thumbnail_url: '/presets/soft_aesthetic.jpg' },
          { id: 'collage', display_name: 'Collage', description: 'Mixed media with layered cut-outs and torn paper textures', thumbnail_url: '/presets/collage.jpg' },
          { id: 'line_art', display_name: 'Line Art', description: 'Clean ink contour drawing with minimal hatching', thumbnail_url: '/presets/line_art.jpg' },
          { id: 'sumi_e', display_name: 'Japanese Ink', description: 'Traditional sumi-e with expressive brush strokes and ink wash', thumbnail_url: '/presets/japenese_ink.jpg' },
          { id: 'kawaii', display_name: 'Kawaii', description: 'Cute style with large sparkling eyes and pastel tones', thumbnail_url: '/presets/kawaii.jpg' },
        ];
      }
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

export function useQualityOptions() {
  return useQuery<QualityOption[]>({
    queryKey: ["qualityOptions"],
    queryFn: async () => {
      const response = await api.qualityOptions.list();
      return response.data;
    },
  });
}

export function useVoices() {
  return useQuery<Voice[]>({
    queryKey: ["voices"],
    queryFn: async () => {
      try {
        const response = await api.voices.list();
        return response.data.voices;
      } catch (error) {
        console.warn('Using mock voices data - backend not available');
        return [
          { id: 'male_confident', display_name: 'Male - Confident', provider: 'elevenlabs' as const, voice_id: 'male_confident', gender: 'male' as const, is_premium: false },
          { id: 'male_deep', display_name: 'Male - Deep Narrator', provider: 'elevenlabs' as const, voice_id: 'male_deep', gender: 'male' as const, is_premium: false },
          { id: 'female_friendly', display_name: 'Female - Friendly', provider: 'elevenlabs' as const, voice_id: 'female_friendly', gender: 'female' as const, is_premium: false },
          { id: 'female_calm', display_name: 'Female - Calm', provider: 'elevenlabs' as const, voice_id: 'female_calm', gender: 'female' as const, is_premium: false },
          { id: 'male_energetic', display_name: 'Male - Energetic', provider: 'elevenlabs' as const, voice_id: 'male_energetic', gender: 'male' as const, is_premium: false },
          { id: 'female_professional', display_name: 'Female - Professional', provider: 'elevenlabs' as const, voice_id: 'female_professional', gender: 'female' as const, is_premium: true },
          { id: 'male_storyteller', display_name: 'Male - Storyteller', provider: 'elevenlabs' as const, voice_id: 'male_storyteller', gender: 'male' as const, is_premium: true },
        ];
      }
    },
  });
}

export function useMusic() {
  return useQuery<Music[]>({
    queryKey: ["music"],
    queryFn: async () => {
      try {
        const response = await api.music.list();
        return response.data.music;
      } catch (error) {
        console.warn('Using mock music data - backend not available');
        const s3Base = "https://clipking-media.s3.us-east-1.amazonaws.com/music/";
        return [
          { id: 'another_love', display_name: 'Another Love', genre: 'pop', mood: 'emotional', duration: 60, is_premium: false, preview_url: `${s3Base}Another%20Love.mp3` },
          { id: 'blade_runner_2049', display_name: 'Blade Runner 2049', genre: 'cinematic', mood: 'epic', duration: 60, is_premium: true, preview_url: `${s3Base}Blade%20Runner%202049.mp3` },
          { id: 'carman_prelude', display_name: 'Carman Prelude', genre: 'classical', mood: 'dramatic', duration: 60, is_premium: false, preview_url: `${s3Base}Carman%20Prelude.mp3` },
          { id: 'else_paris_extended', display_name: 'Else - Paris Extended', genre: 'electronic', mood: 'chill', duration: 60, is_premium: false, preview_url: `${s3Base}Else%20-%20Paris%20Extended.mp3` },
          { id: 'else_paris', display_name: 'Else - Paris', genre: 'electronic', mood: 'chill', duration: 60, is_premium: false, preview_url: `${s3Base}Else%20-%20Paris.mp3` },
          { id: 'fur_elise', display_name: 'Fur Elise', genre: 'classical', mood: 'calm', duration: 60, is_premium: false, preview_url: `${s3Base}Fur%20Elise.mp3` },
          { id: 'snowfall', display_name: 'Snowfall', genre: 'ambient', mood: 'calm', duration: 60, is_premium: false, preview_url: `${s3Base}Snowfall.mp3` },
          { id: 'none', display_name: 'No Music', genre: 'none', mood: 'none', duration: 0, is_premium: false },
        ];
      }
    },
  });
}

// Deepgram Voice type
export interface DeepgramVoice {
  id: string;
  display_name: string;
  gender: string;
  accent: string;
  provider: string;
  is_default: boolean;
  generation: string;
}

export function useDeepgramVoices() {
  return useQuery<DeepgramVoice[]>({
    queryKey: ["deepgramVoices"],
    queryFn: async () => {
      try {
        const response = await api.deepgramVoices.list();
        return response.data.voices;
      } catch (error) {
        console.warn('Using mock Deepgram voices - backend not available');
        return [
          // Aura 2 voices (latest)
          { id: 'aura-2-orion-en', display_name: 'Orion', gender: 'male', accent: 'American', provider: 'deepgram', is_default: true, generation: 'aura-2' },
          { id: 'aura-2-thalia-en', display_name: 'Thalia', gender: 'female', accent: 'American', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-luna-en', display_name: 'Luna', gender: 'female', accent: 'American', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-stella-en', display_name: 'Stella', gender: 'female', accent: 'American', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-athena-en', display_name: 'Athena', gender: 'female', accent: 'British', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-arcas-en', display_name: 'Arcas', gender: 'male', accent: 'American', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-perseus-en', display_name: 'Perseus', gender: 'male', accent: 'American', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-helios-en', display_name: 'Helios', gender: 'male', accent: 'British', provider: 'deepgram', is_default: false, generation: 'aura-2' },
          { id: 'aura-2-angus-en', display_name: 'Angus', gender: 'male', accent: 'Irish', provider: 'deepgram', is_default: false, generation: 'aura-2' },
        ];
      }
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

// User Hooks
export function useUserCredits() {
  return useQuery<UserCredits>({
    queryKey: ["userCredits"],
    queryFn: async () => {
      try {
        const response = await api.user.getCredits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch credits - backend may not be available');
        return { credits: 0, plan: 'free' };
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Video Generation Hooks
export function useGenerateVideo() {
  return useMutation({
    mutationFn: async (data: GenerateVideoRequest) => {
      const response = await api.video.generate(data);
      return response.data;
    },
  });
}

export function useVideoJob(jobId: string | null, enabled: boolean = true) {
  return useQuery<VideoJob>({
    queryKey: ["videoJob", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await api.video.getJob(jobId);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds if job is in progress
      if (data?.status === "processing" || data?.status === "queued") {
        return 2000;
      }
      return false;
    },
  });
}

export function useVideo(videoId: string | null) {
  return useQuery<Video>({
    queryKey: ["video", videoId],
    queryFn: async () => {
      if (!videoId) throw new Error("Video ID is required");
      const response = await api.video.getVideo(videoId);
      return response.data;
    },
    enabled: !!videoId,
  });
}

export function useVideos() {
  return useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: async () => {
      try {
        const response = await api.video.list();
        return response.data.videos || response.data || [];
      } catch (error) {
        console.warn('Failed to fetch videos - backend may not be available');
        return [];
      }
    },
  });
}

export function useVideoJobs(status?: string) {
  return useQuery<VideoJob[]>({
    queryKey: ["videoJobs", status],
    queryFn: async () => {
      try {
        const response = await api.video.listJobs({ status });
        return response.data.jobs || response.data || [];
      } catch (error) {
        console.warn('Failed to fetch video jobs');
        return [];
      }
    },
  });
}

export function useCancelJob() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.video.cancelJob(jobId);
      return response.data;
    },
  });
}

export function useUserLimits() {
  return useQuery({
    queryKey: ["userLimits"],
    queryFn: async () => {
      try {
        const response = await api.video.getLimits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch user limits');
        return null;
      }
    },
  });
}

// Image Generation Hooks
export function useGenerateImage() {
  return useMutation({
    mutationFn: async (data: GenerateImageRequest) => {
      const response = await api.image.generate(data);
      return response.data;
    },
  });
}

export function useImageJob(jobId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["imageJob", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await api.image.getJob(jobId);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds if job is in progress
      if (data?.status === "processing" || data?.status === "queued") {
        return 2000;
      }
      return false;
    },
  });
}

export function useUserImages() {
  return useQuery<GeneratedImage[]>({
    queryKey: ["userImages"],
    queryFn: async () => {
      try {
        const response = await api.image.list();
        return response.data || [];
      } catch (error) {
        console.warn('Failed to fetch images - backend may not be available');
        return [];
      }
    },
  });
}

export function useDeleteImage() {
  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await api.image.delete(imageId);
      return response.data;
    },
  });
}

export function useImageLimits() {
  return useQuery({
    queryKey: ["imageLimits"],
    queryFn: async () => {
      try {
        const response = await api.image.getLimits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch image limits');
        return null;
      }
    },
  });
}

// AI Video Generation Hooks (Sora 2, Veo 3, Kling 2.5, LTX-2)
export function useGenerateAIVideo() {
  return useMutation({
    mutationFn: async (data: GenerateAIVideoRequest) => {
      const response = await api.aiVideo.generate(data);
      return response.data;
    },
  });
}

export function useAIVideoJob(jobId: string | null, enabled: boolean = true) {
  return useQuery<AIVideoJob>({
    queryKey: ["aiVideoJob", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await api.aiVideo.getJob(jobId);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3 seconds if job is in progress (video takes longer)
      if (data?.status === "processing" || data?.status === "queued") {
        return 3000;
      }
      return false;
    },
  });
}

export function useAIVideos() {
  return useQuery<AIVideo[]>({
    queryKey: ["aiVideos"],
    queryFn: async () => {
      try {
        const response = await api.aiVideo.list();
        return response.data || [];
      } catch (error) {
        console.warn('Failed to fetch AI videos - backend may not be available');
        return [];
      }
    },
  });
}

export function useDeleteAIVideo() {
  return useMutation({
    mutationFn: async (videoId: string) => {
      const response = await api.aiVideo.delete(videoId);
      return response.data;
    },
  });
}

export function useAIVideoLimits() {
  return useQuery({
    queryKey: ["aiVideoLimits"],
    queryFn: async () => {
      try {
        const response = await api.aiVideo.getLimits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch AI video limits');
        return null;
      }
    },
  });
}

export function useAIVideoModels() {
  return useQuery<Record<string, AIVideoModelConfig>>({
    queryKey: ["aiVideoModels"],
    queryFn: async () => {
      try {
        const response = await api.aiVideo.getModels();
        return response.data.models;
      } catch (error) {
        console.warn('Failed to fetch AI video models - using defaults');
        // Return default model configs
        return {
          sora2: {
            name: "Sora 2",
            resolutions: ["720p", "1080p"],
            aspect_ratios: ["9:16", "16:9"],
            durations: [4, 8, 12],
            supports_negative_prompt: false,
            supports_audio: false,
            supports_seed: false,
            max_duration: 12,
            default_duration: 8,
            default_aspect_ratio: "16:9",
            default_resolution: "1080p",
          },
          veo3: {
            name: "Veo 3",
            resolutions: ["720p", "1080p"],
            aspect_ratios: ["16:9", "9:16"],
            durations: [4, 6, 8],
            supports_negative_prompt: true,
            supports_audio: true,
            supports_seed: true,
            supports_auto_fix_prompt: true,
            max_duration: 8,
            default_duration: 6,
            default_aspect_ratio: "16:9",
            default_resolution: "1080p",
          },
          kling25: {
            name: "Kling 2.5",
            aspect_ratios: ["16:9", "9:16", "1:1"],
            durations: [5, 10],
            supports_negative_prompt: true,
            supports_audio: false,
            supports_seed: false,
            supports_cfg_scale: true,
            cfg_scale_default: 0.5,
            max_duration: 10,
            default_duration: 5,
            default_aspect_ratio: "16:9",
          },
          ltx2: {
            name: "LTX-2",
            aspect_ratios: ["landscape_4_3", "landscape_16_9", "portrait_16_9"],
            durations: [4, 8, 12, 16, 20],
            supports_negative_prompt: true,
            supports_audio: true,
            supports_seed: true,
            supports_fps: true,
            fps_default: 25,
            supports_video_quality: true,
            video_quality_options: ["high", "balanced"],
            supports_prompt_expansion: true,
            supports_safety_checker: true,
            supports_multiscale: true,
            supports_camera_lora: true,
            max_duration: 20,
            default_duration: 8,
            default_aspect_ratio: "landscape_16_9",
          },
        };
      }
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

// Prompt Preview Hook (AI Video)
export function usePreviewPrompt() {
  return useMutation<PreviewPromptResponse, Error, { prompt: string; model?: string; preset_id?: string; enhance_prompt?: boolean; negative_prompt?: string }>({
    mutationFn: async (data) => {
      const response = await api.aiVideo.previewPrompt(data);
      return response.data;
    },
  });
}

// Script-to-Video Generation Hooks (Moving Images V1)
export interface SceneBreakdown {
  scene_id: number;
  narration: string;
  visual_description: string;
  duration: number;
}

export interface ScriptToVideoJob {
  job_id: string;
  status: string;
  progress: number;
  current_step?: string;
  total_scenes?: number;
  completed_scenes?: number;
  scenes?: SceneBreakdown[];
  video_url?: string;
  thumbnail_url?: string;
  error_message?: string;
}

export interface ScriptToVideo {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  scene_count?: number;
  script_preview?: string;
  created_at: string;
}

export interface GenerateScriptToVideoRequest {
  script: string;
  media_type?: string;
  preset_id?: string;
  image_model?: string;
  aspect_ratio?: string;
  duration?: number;  // 30, 45, or 60 seconds
  consistent_character?: boolean;
  bgm_id?: string;
  voice_id?: string;
  enhance_prompt?: boolean;
}

export function useGenerateScriptToVideo() {
  return useMutation({
    mutationFn: async (data: GenerateScriptToVideoRequest) => {
      const response = await api.scriptToVideo.generate(data);
      return response.data;
    },
  });
}

export function useScriptToVideoJob(jobId: string | null, enabled: boolean = true) {
  return useQuery<ScriptToVideoJob>({
    queryKey: ["scriptToVideoJob", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await api.scriptToVideo.getJob(jobId);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3 seconds if job is in progress
      if (data?.status && !['completed', 'failed'].includes(data.status)) {
        return 3000;
      }
      return false;
    },
  });
}

export function useScriptToVideos() {
  return useQuery<ScriptToVideo[]>({
    queryKey: ["scriptToVideos"],
    queryFn: async () => {
      try {
        const response = await api.scriptToVideo.list();
        return response.data || [];
      } catch (error) {
        console.warn('Failed to fetch script-to-videos - backend may not be available');
        return [];
      }
    },
  });
}

export function useDeleteScriptToVideo() {
  return useMutation({
    mutationFn: async (videoId: string) => {
      const response = await api.scriptToVideo.delete(videoId);
      return response.data;
    },
  });
}

export function useScriptToVideoLimits() {
  return useQuery({
    queryKey: ["scriptToVideoLimits"],
    queryFn: async () => {
      try {
        const response = await api.scriptToVideo.getLimits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch script-to-video limits');
        return null;
      }
    },
  });
}

// ============================================
// Trending Video Hooks (Kling 3.0)
// ============================================
export function useGenerateTrendingTheme() {
  return useMutation({
    mutationFn: async (data: GenerateTrendingThemeRequest) => {
      const response = await api.trendingVideo.generateTheme(data);
      return response.data;
    },
  });
}

export function useGenerateTrendingCustom() {
  return useMutation({
    mutationFn: async (data: GenerateTrendingCustomRequest) => {
      const response = await api.trendingVideo.generateCustom(data);
      return response.data;
    },
  });
}

export function useTrendingVideoJob(jobId: string | null, enabled: boolean = true) {
  return useQuery<TrendingVideoJob>({
    queryKey: ["trendingVideoJob", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await api.trendingVideo.getJob(jobId);
      return response.data;
    },
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status && !['completed', 'failed'].includes(data.status)) {
        return 3000;
      }
      return false;
    },
  });
}

export function useTrendingThemes() {
  return useQuery<TrendingTheme[]>({
    queryKey: ["trendingThemes"],
    queryFn: async () => {
      try {
        const response = await api.trendingVideo.getThemes();
        return response.data.themes;
      } catch (error) {
        console.warn('Failed to fetch trending themes - using defaults');
        return [
          { id: 'dance_mania', display_name: 'Dance Mania', description: 'High energy dance moves', default_duration: 8, allowed_durations: [5, 8, 10], has_motion_video: false },
          { id: 'slow_glow_up', display_name: 'Slow Glow Up', description: 'Smooth cinematic transformation', default_duration: 8, allowed_durations: [5, 8, 10], has_motion_video: false },
          { id: 'anime_transform', display_name: 'Anime Transform', description: 'Anime-style power up effect', default_duration: 8, allowed_durations: [5, 8, 10], has_motion_video: false },
          { id: 'cinematic_walk', display_name: 'Cinematic Walk', description: 'Movie-style slow walk', default_duration: 8, allowed_durations: [5, 8, 10], has_motion_video: false },
          { id: 'meme_jump_cut', display_name: 'Meme Jump Cut', description: 'Quick chaotic energy', default_duration: 5, allowed_durations: [5, 8], has_motion_video: false },
        ];
      }
    },
    staleTime: 300000,
  });
}

export function useTrendingVideoLimits() {
  return useQuery({
    queryKey: ["trendingVideoLimits"],
    queryFn: async () => {
      try {
        const response = await api.trendingVideo.getLimits();
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch trending video limits');
        return null;
      }
    },
  });
}
