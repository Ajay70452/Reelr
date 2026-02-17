import { type ClassValue, clsx } from "clsx";

// Utility for merging class names (useful with Tailwind)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format duration in seconds to MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Format credits with commas
export function formatCredits(credits: number): string {
  return credits.toLocaleString();
}

// Format file size
export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}

// Format date relative to now (e.g., "2 hours ago")
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return then.toLocaleDateString();
}

// Validate video settings
export function validateVideoSettings(settings: any): string | null {
  if (!settings.genreId && !settings.customTopic) {
    return "Please select a genre or enter a custom topic";
  }
  if (!settings.visualStyleId) {
    return "Please select a visual style";
  }
  if (!settings.presetId) {
    return "Please select a preset";
  }
  if (!settings.qualityOptionId) {
    return "Please select a quality option";
  }
  if (!settings.voiceId) {
    return "Please select a voice";
  }
  if (!settings.musicId) {
    return "Please select background music";
  }
  return null;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Get aspect ratio dimensions
export function getAspectRatioDimensions(ratio: string): { width: number; height: number } {
  const ratios: Record<string, { width: number; height: number }> = {
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1080, height: 1080 },
    "16:9": { width: 1920, height: 1080 },
  };
  return ratios[ratio] || ratios["9:16"];
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}
