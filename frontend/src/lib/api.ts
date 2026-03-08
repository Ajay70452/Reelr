import axios from "axios";
import { supabase } from "@/lib/supabase";

const isProdBrowser = typeof window !== "undefined" && window.location.hostname !== "localhost";
const API_URL = isProdBrowser ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
const API_TIMEOUT = parseInt(
  process.env.NEXT_PUBLIC_API_TIMEOUT || "60000",
  10
);

/**
 * Resolve a media URL to an absolute URL.
 * Handles both S3 presigned URLs (returned as-is) and local API URLs
 * (prefixed with the API base URL).
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';

  // If it's already an absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative URL, prepend the API base URL
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Get the API base URL (useful for components that need it directly)
 */
export function getApiBaseUrl(): string {
  return API_URL;
}

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token from Supabase session
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        config.headers["supabase-token"] = session.access_token;
      }
    } catch (e) {
      console.error("Error setting up interceptor token", e);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't auto-redirect on 401 - let components handle auth state
    // The Supabase auth state listener will handle session expiry
    // Only redirect if it's a critical auth failure AND we're not on auth pages
    if (error.response?.status === 401) {
      // Check if we have a valid Supabase session before redirecting
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data: { session } } = await supabase.auth.getSession();

        // If no Supabase session exists, the user is truly logged out
        // But don't redirect from auth pages or if already redirecting
        if (!session && typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/auth/')) {
            // Don't use hard redirect - let the app handle it gracefully
            console.warn('API returned 401, but letting app handle auth state');
          }
        }
      } catch {
        // Supabase check failed, don't redirect
      }
    }

    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Metadata endpoints
  genres: {
    list: () => apiClient.get("/api/v1/meta/genres"),
  },
  visualStyles: {
    list: () => apiClient.get("/api/v1/meta/visual-styles"),
  },
  presets: {
    list: (styleId: string) => apiClient.get(`/api/v1/meta/presets/${styleId}`),
  },
  aiPresets: {
    list: () => apiClient.get("/api/v1/meta/ai-presets"),
  },
  qualityOptions: {
    list: () => apiClient.get("/api/v1/meta/quality-options"),
  },
  voices: {
    list: () => apiClient.get("/api/v1/meta/voices"),
  },
  deepgramVoices: {
    list: () => apiClient.get("/api/v1/meta/deepgram-voices"),
  },
  music: {
    list: () => apiClient.get("/api/v1/meta/music"),
  },

  // User endpoints
  user: {
    me: () => apiClient.get("/api/v1/user/me"),
    getCredits: () => apiClient.get("/api/v1/user/credits"),
  },

  // Video generation endpoints
  video: {
    generate: (data: any) => apiClient.post("/api/v1/video/generate", data),
    getJob: (jobId: string) => apiClient.get(`/api/v1/video/job/${jobId}`),
    cancelJob: (jobId: string) => apiClient.post(`/api/v1/video/job/${jobId}/cancel`),
    getVideo: (videoId: string) => apiClient.get(`/api/v1/video/${videoId}`),
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/video/list", { params }),
    listJobs: (params?: { status?: string; limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/video/jobs", { params }),
    getLimits: () => apiClient.get("/api/v1/video/limits"),
  },

  // Image generation endpoints
  image: {
    generate: (data: any) => apiClient.post("/api/v1/image/generate", data),
    getJob: (jobId: string) => apiClient.get(`/api/v1/image/job/${jobId}`),
    getImage: (imageId: string) => apiClient.get(`/api/v1/image/${imageId}`),
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/image/list", { params }),
    delete: (imageId: string) => apiClient.delete(`/api/v1/image/${imageId}`),
    getLimits: () => apiClient.get("/api/v1/image/limits"),
  },

  // AI Video generation endpoints (Sora 2, Veo 3, Kling 2.5, LTX-2)
  aiVideo: {
    generate: (data: any) => apiClient.post("/api/v1/ai-video/generate", data),
    getJob: (jobId: string) => apiClient.get(`/api/v1/ai-video/job/${jobId}`),
    getVideo: (videoId: string) => apiClient.get(`/api/v1/ai-video/${videoId}`),
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/ai-video/list", { params }),
    delete: (videoId: string) => apiClient.delete(`/api/v1/ai-video/${videoId}`),
    getLimits: () => apiClient.get("/api/v1/ai-video/limits"),
    getModels: () => apiClient.get("/api/v1/ai-video/models"),
    previewPrompt: (data: { prompt: string; model?: string; preset_id?: string; enhance_prompt?: boolean; negative_prompt?: string }) =>
      apiClient.post("/api/v1/ai-video/preview-prompt", data),
  },

  // Script-to-Video generation endpoints (Moving Images V1)
  scriptToVideo: {
    generate: (data: any) => apiClient.post("/api/v1/script-to-video/generate", data),
    getJob: (jobId: string) => apiClient.get(`/api/v1/script-to-video/job/${jobId}`),
    getVideo: (videoId: string) => apiClient.get(`/api/v1/script-to-video/${videoId}`),
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/script-to-video/list", { params }),
    delete: (videoId: string) => apiClient.delete(`/api/v1/script-to-video/${videoId}`),
    getLimits: () => apiClient.get("/api/v1/script-to-video/limits"),
    estimateCost: (script: string) => apiClient.post("/api/v1/script-to-video/estimate", null, { params: { script } }),
  },

  // Library endpoints (unified video library)
  library: {
    getVideos: (params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/v1/library/videos", { params }),
  },

  // Trending Video endpoints (Kling 3.0)
  trendingVideo: {
    generateTheme: (data: any) => apiClient.post("/api/v1/trending-video/generate-theme", data, { timeout: 120000 }),
    generateCustom: (data: any) => apiClient.post("/api/v1/trending-video/generate-custom", data, { timeout: 120000 }),
    getJob: (jobId: string) => apiClient.get(`/api/v1/trending-video/job/${jobId}`),
    getThemes: () => apiClient.get("/api/v1/trending-video/themes"),
    getLimits: () => apiClient.get("/api/v1/trending-video/limits"),
  },

  // Auth endpoints (placeholder - will be updated based on Supabase/Clerk)
  auth: {
    login: (email: string) => apiClient.post("/auth/login", { email }),
    register: (email: string) => apiClient.post("/auth/register", { email }),
  },
};

export default api;
