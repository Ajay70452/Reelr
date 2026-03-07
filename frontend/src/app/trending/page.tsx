'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToastStore } from '@/store/toastStore';
import type { TrendingTheme } from '@/types';
import {
    useGenerateTrendingTheme,
    useGenerateTrendingCustom,
    useTrendingVideoJob,
    useTrendingThemes,
} from '@/hooks/useApi';

// ============================================
// Theme UI Gradients (for config panel)
// ============================================
const THEME_GRADIENTS: Record<string, string> = {
    dance_mania: 'from-pink-600 via-purple-600 to-indigo-600',
    slow_glow_up: 'from-amber-500 via-orange-500 to-rose-500',
    anime_transform: 'from-cyan-500 via-blue-500 to-violet-600',
    cinematic_walk: 'from-gray-700 via-gray-600 to-gray-500',
    meme_jump_cut: 'from-green-500 via-emerald-500 to-teal-500',
};

type MotionIntensity = 'subtle' | 'normal' | 'extreme';
type AspectRatio = '9:16' | '1:1' | '16:9';
type Duration = 5 | 8 | 10;
type Quality = 'standard' | 'pro';
type ActiveTab = 'themes' | 'create';

const STATUS_LABELS: Record<string, string> = {
    queued: 'Queued...',
    building_prompt: 'Preparing...',
    generating_video: 'Generating video...',
    composing: 'Composing...',
    encoding: 'Encoding final video...',
    completed: 'Complete!',
    failed: 'Generation failed',
};

// ============================================
// Icons
// ============================================
function UploadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}

// ============================================
// Shared Inner Components
// ============================================
function RadioGroup<T extends string | number>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div>
            <span className="text-xs font-semibold text-[#6F7688] uppercase tracking-wider mb-3 block">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={String(opt.value)}
                        onClick={() => onChange(opt.value)}
                        className={`px-4 py-2.5 text-sm rounded-xl transition-all duration-120 whitespace-nowrap ${value === opt.value
                            ? 'bg-[#C8FF4D] text-[#1C1F26] font-semibold shadow-[0_0_16px_rgba(200,255,77,0.35)]'
                            : 'bg-gradient-to-b from-[#262b38] to-[#222631] text-[#A1A8B8] hover:text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_0_1px_rgba(200,255,77,0.4),0_0_18px_rgba(200,255,77,0.25)]'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FileUpload({
    label,
    accept,
    required,
    preview,
    onSelect,
    onRemove,
    hint,
}: {
    label: string;
    accept: string;
    required?: boolean;
    preview: string | null;
    onSelect: (file: File) => void;
    onRemove: () => void;
    hint?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore((s) => s.addToast);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = accept.includes('image');
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

        if (isImage && !validImageTypes.includes(file.type)) {
            addToast({ type: 'warning', title: 'Invalid file type', message: 'Please select a JPG, PNG, or WEBP image.' });
            return;
        }
        if (!isImage && !validVideoTypes.includes(file.type)) {
            addToast({ type: 'warning', title: 'Invalid file type', message: 'Please select an MP4, WEBM, or MOV video.' });
            return;
        }

        const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            addToast({ type: 'warning', title: 'File too large', message: `File must be less than ${isImage ? '10MB' : '50MB'}.` });
            return;
        }

        onSelect(file);
    };

    return (
        <div>
            <div className="flex items-center gap-1 mb-2">
                <span className="text-sm font-medium text-[#A1A8B8]">{label}</span>
                {required && <span className="text-red-400 text-xs">*</span>}
            </div>
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />

            {preview ? (
                <div className="relative group rounded-2xl overflow-hidden bg-[#222631]">
                    {accept.includes('image') ? (
                        <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                    ) : (
                        <video src={preview} className="w-full h-40 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 text-xs bg-[#222631] text-white rounded-lg hover:bg-[#262B38] transition-colors"
                        >
                            Change
                        </button>
                        <button
                            onClick={onRemove}
                            className="px-3 py-1.5 text-xs bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-40 rounded-2xl flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#262b38] to-[#222631] shadow-[inset_0_2px_6px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.4),0_0_0_1px_rgba(200,255,77,0.4),0_0_18px_rgba(200,255,77,0.25)] transition-all duration-150 group"
                >
                    <UploadIcon className="w-8 h-8 text-[#A1A8B8] group-hover:text-[#C8FF4D] transition-colors" />
                    <span className="text-sm text-[#A1A8B8] group-hover:text-white transition-colors">
                        Click to upload
                    </span>
                    {hint && <span className="text-xs text-[#6F7688]">{hint}</span>}
                </button>
            )}
        </div>
    );
}

// ============================================
// 9:16 Video Theme Card
// ============================================
function ThemeCard({
    theme,
    isSelected,
    onSelect,
}: {
    theme: TrendingTheme;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Control video playback based on selection
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isSelected) {
            video.muted = false;
            video.play().catch(() => {
                // If autoplay with sound fails, try muted first
                video.muted = true;
                video.play();
            });
            setIsPlaying(true);
        } else {
            video.pause();
            video.currentTime = 0;
            video.muted = true;
            setIsPlaying(false);
        }
    }, [isSelected]);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card selection when clicking play/pause
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.muted = false;
            video.play().catch(() => {
                video.muted = true;
                video.play();
            });
            setIsPlaying(true);
        }
    };

    return (
        <button
            onClick={onSelect}
            className={`relative rounded-2xl overflow-hidden transition-all duration-150 group shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)] ${isSelected
                ? 'card-glow-lime scale-[1.02]'
                : 'hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(200,255,77,0.15),inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                }`}
        >
            {/* 9:16 Video Preview */}
            <div className="aspect-[9/16] bg-[#1C1F26] relative">
                {theme.preview_url ? (
                    <>
                        <video
                            ref={videoRef}
                            src={theme.preview_url}
                            className="w-full h-full object-cover"
                            loop
                            muted
                            playsInline
                        />
                        {/* Play/Pause button overlay */}
                        {!isSelected ? (
                            // Play icon when not selected
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            // Play/Pause control when selected
                            <div
                                onClick={togglePlayPause}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        togglePlayPause(e as any);
                                    }
                                }}
                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-sm flex items-center justify-center transition-colors z-10 cursor-pointer"
                            >
                                {isPlaying ? (
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#262b38] to-[#222631] flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-[rgba(255,255,255,0.06)] border-t-[#C8FF4D] rounded-full animate-spin" />
                    </div>
                )}
                {/* Selection indicator - lime glow overlay */}
                {isSelected && (
                    <div className="absolute inset-0 bg-[#C8FF4D]/10 border-2 border-[#C8FF4D] pointer-events-none" />
                )}
            </div>
        </button>
    );
}

// ============================================
// Preview Panel (Right Side)
// ============================================
function PreviewPanel({
    isGenerating,
    isPending,
    jobData,
    completedVideoUrl,
    onRegenerate,
    onDownload,
}: {
    isGenerating: boolean;
    isPending: boolean;
    jobData: any;
    completedVideoUrl: string | null;
    onRegenerate: () => void;
    onDownload: () => void;
}) {
    // Generating state
    if (isGenerating && jobData && !completedVideoUrl) {
        const label = STATUS_LABELS[jobData.status] || jobData.status;
        return (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
                <div className="w-16 h-16 border-4 border-[rgba(255,255,255,0.06)] border-t-[#C8FF4D] rounded-full animate-spin" />
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <div className="w-48">
                        <div className="h-1.5 bg-[#0B0D12] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#C8FF4D] to-[#E0FF99] rounded-full transition-all duration-500"
                                style={{ width: `${jobData.progress || 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-[#A1A8B8] text-center mt-1">{jobData.progress || 0}%</p>
                    </div>
                </div>
                <p className="text-xs text-[#5A6179]">This may take 30-90 seconds</p>
            </div>
        );
    }

    // Pending (mutation firing)
    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.06)] border-t-[#C8FF4D] rounded-full animate-spin" />
                <p className="text-sm text-[#7E86B5]">Starting generation...</p>
            </div>
        );
    }

    // Completed state
    if (completedVideoUrl) {
        return (
            <div className="flex flex-col h-full p-6">
                <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#1C1F26]">
                    <video src={completedVideoUrl} controls className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onRegenerate}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#222631] text-[#A1A8B8] rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_0_1px_rgba(200,255,77,0.4),0_0_18px_rgba(200,255,77,0.25)] hover:text-white transition-all duration-120"
                    >
                        <RefreshIcon className="w-4 h-4" />
                        Regenerate
                    </button>
                    <button
                        onClick={onDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C8FF4D] text-[#1C1F26] font-semibold rounded-xl hover:bg-[#D8FF75] shadow-[0_4px_16px_rgba(200,255,77,0.35)] hover:shadow-[0_6px_24px_rgba(200,255,77,0.5)] transition-all duration-120"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Download
                    </button>
                </div>
            </div>
        );
    }

    // Empty state — placeholder
    return (
        <div className="flex flex-col items-center justify-center h-full gap-5 p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#262b38] to-[#222631] flex items-center justify-center shadow-[0_0_30px_rgba(200,255,77,0.1)]">
                <SparklesIcon className="w-10 h-10 text-[#C8FF4D]/60" />
            </div>
            <div>
                <p className="text-lg font-semibold text-white">Your AI Video Preview</p>
                <p className="text-sm text-[#A1A8B8] mt-1.5 italic font-light">Pick a theme, upload your photo, and watch the magic</p>
            </div>
        </div>
    );
}

// ============================================
// Tab 1 — Select Trending Theme
// ============================================
function TrendingThemeTab({
    onJobStart,
    isGenerating,
    themes,
}: {
    onJobStart: (jobId: string) => void;
    isGenerating: boolean;
    themes: TrendingTheme[];
}) {
    const addToast = useToastStore((s) => s.addToast);
    const generateTheme = useGenerateTrendingTheme();

    const [selectedTheme, setSelectedTheme] = useState<TrendingTheme | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>('normal');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [duration, setDuration] = useState<Duration>(8);
    const [quality, setQuality] = useState<Quality>('standard');

    const handleImageSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setImagePreview(dataUrl);
            setImageDataUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleRemoveImage = useCallback(() => {
        setImagePreview(null);
        setImageDataUrl(null);
    }, []);

    const handleGenerate = useCallback(() => {
        if (!selectedTheme) {
            addToast({ type: 'warning', title: 'No theme selected', message: 'Please select a trending theme first.' });
            return;
        }
        if (!imageDataUrl) {
            addToast({ type: 'warning', title: 'Image required', message: 'Please upload your photo to continue.' });
            return;
        }

        generateTheme.mutate(
            {
                theme_id: selectedTheme.id,
                reference_image: imageDataUrl,
                intensity: motionIntensity,
                duration,
                aspect_ratio: aspectRatio,
                quality,
            },
            {
                onSuccess: (data) => {
                    onJobStart(data.job_id);
                    addToast({ type: 'info', title: 'Generation started', message: 'Your trending video is being generated...' });
                },
                onError: (err: any) => {
                    const detail = err?.response?.data?.detail;
                    const msg = typeof detail === 'string' ? detail : detail?.error || 'Failed to start generation.';
                    addToast({ type: 'error', title: 'Error', message: msg });
                },
            }
        );
    }, [selectedTheme, imageDataUrl, motionIntensity, duration, aspectRatio, quality, generateTheme, addToast, onJobStart]);

    const handleThemeSelect = useCallback((theme: TrendingTheme) => {
        setSelectedTheme(theme);
        setDuration(theme.default_duration as Duration);
    }, []);

    const busy = generateTheme.isPending || isGenerating;

    return (
        <div className="space-y-8">
            {/* Theme Grid — 9:16 Video Cards */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Trending Now</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {themes.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            isSelected={selectedTheme?.id === theme.id}
                            onSelect={() => handleThemeSelect(theme)}
                        />
                    ))}
                </div>
            </div>

            {/* Configuration Panel */}
            {selectedTheme && (
                <div className="bg-[#14172a] rounded-2xl p-4 md:p-6 space-y-5 md:space-y-6 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)] animate-fade-slide-in">
                    <FileUpload
                        label="Upload Your Photo"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        preview={imagePreview}
                        onSelect={handleImageSelect}
                        onRemove={handleRemoveImage}
                        hint="JPG, PNG, or WEBP up to 10MB"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                        <RadioGroup
                            label="Motion Intensity"
                            options={[
                                { value: 'subtle' as MotionIntensity, label: 'Subtle' },
                                { value: 'normal' as MotionIntensity, label: 'Normal' },
                                { value: 'extreme' as MotionIntensity, label: 'Extreme' },
                            ]}
                            value={motionIntensity}
                            onChange={setMotionIntensity}
                        />
                        <RadioGroup
                            label="Aspect Ratio"
                            options={[
                                { value: '9:16' as AspectRatio, label: '9:16' },
                                { value: '1:1' as AspectRatio, label: '1:1' },
                                { value: '16:9' as AspectRatio, label: '16:9' },
                            ]}
                            value={aspectRatio}
                            onChange={setAspectRatio}
                        />
                        <RadioGroup
                            label="Duration"
                            options={selectedTheme.allowed_durations.map(d => ({
                                value: d as Duration,
                                label: `${d}s`,
                            }))}
                            value={duration}
                            onChange={setDuration}
                        />
                        <RadioGroup
                            label="Quality"
                            options={[
                                { value: 'standard' as Quality, label: 'Standard' },
                                { value: 'pro' as Quality, label: 'Pro' },
                            ]}
                            value={quality}
                            onChange={setQuality}
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={busy || !imageDataUrl}
                        className={`w-full py-4 rounded-[14px] font-semibold text-base transition-all ${busy || !imageDataUrl
                            ? 'bg-[#222631] text-[#6F7688] cursor-not-allowed'
                            : 'bg-[#C8FF4D] text-[#1C1F26] hover:bg-[#D8FF75] shadow-[0_6px_24px_rgba(200,255,77,0.4)] hover:shadow-[0_10px_40px_rgba(200,255,77,0.5)]'
                            }`}
                    >
                        {generateTheme.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.15)] border-t-white rounded-full animate-spin" />
                                Starting...
                            </span>
                        ) : (
                            'Generate Video'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// Tab 2 — Create Your Own
// ============================================
function CreateYourOwnTab({
    onJobStart,
    isGenerating,
}: {
    onJobStart: (jobId: string) => void;
    isGenerating: boolean;
}) {
    const addToast = useToastStore((s) => s.addToast);
    const generateCustom = useGenerateTrendingCustom();

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>('normal');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [duration, setDuration] = useState<Duration>(8);
    const [quality, setQuality] = useState<Quality>('standard');

    const handleImageSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setImagePreview(dataUrl);
            setImageDataUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleVideoSelect = useCallback((file: File) => {
        setVideoPreview(URL.createObjectURL(file));
        const reader = new FileReader();
        reader.onloadend = () => setVideoDataUrl(reader.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleRemoveImage = useCallback(() => {
        setImagePreview(null);
        setImageDataUrl(null);
    }, []);

    const handleRemoveVideo = useCallback(() => {
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
        setVideoDataUrl(null);
    }, [videoPreview]);

    const handleGenerate = useCallback(() => {
        if (!imageDataUrl) {
            addToast({ type: 'warning', title: 'Image required', message: 'Please upload a reference image.' });
            return;
        }
        if (!videoDataUrl) {
            addToast({ type: 'warning', title: 'Motion video required', message: 'Please upload a motion reference video.' });
            return;
        }

        generateCustom.mutate(
            {
                prompt: prompt.trim() || undefined,
                reference_image: imageDataUrl,
                reference_video: videoDataUrl,
                intensity: motionIntensity,
                duration,
                aspect_ratio: aspectRatio,
                quality,
            },
            {
                onSuccess: (data) => {
                    onJobStart(data.job_id);
                    addToast({ type: 'info', title: 'Generation started', message: 'Your custom video is being generated...' });
                },
                onError: (err: any) => {
                    const detail = err?.response?.data?.detail;
                    const msg = typeof detail === 'string' ? detail : detail?.error || 'Failed to start generation.';
                    addToast({ type: 'error', title: 'Error', message: msg });
                },
            }
        );
    }, [imageDataUrl, videoDataUrl, prompt, motionIntensity, duration, aspectRatio, quality, generateCustom, addToast, onJobStart]);

    const canGenerate = !!imageDataUrl && !!videoDataUrl;
    const busy = generateCustom.isPending || isGenerating;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-1">Create Your Own AI Trend Video</h3>
                <p className="text-sm text-[#7E86B5]">Upload your image + a motion reference video, and let AI replicate the motion.</p>
            </div>

            <div className="bg-[#14172a] rounded-2xl p-4 md:p-6 space-y-5 md:space-y-6 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                {/* Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUpload
                        label="Upload Reference Image"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        preview={imagePreview}
                        onSelect={handleImageSelect}
                        onRemove={handleRemoveImage}
                        hint="JPG, PNG, or WEBP up to 10MB"
                    />
                    <FileUpload
                        label="Motion Reference Video"
                        accept="video/mp4,video/webm,video/quicktime"
                        required
                        preview={videoPreview}
                        onSelect={handleVideoSelect}
                        onRemove={handleRemoveVideo}
                        hint="MP4, WEBM, or MOV up to 50MB"
                    />
                </div>

                {/* Prompt (optional) */}
                <div>
                    <div className="flex items-center gap-1 mb-2">
                        <span className="text-sm font-medium text-[#7E86B5]">Description</span>
                        <span className="text-xs text-[#5A6179]">(optional)</span>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Optionally describe the look you want (e.g., 'Cyberpunk style, neon lighting')"
                        className="w-full px-4 py-3 bg-gradient-to-b from-[#262b38] to-[#222631] rounded-[14px] text-white placeholder-[#A1A8B8] resize-none focus:outline-none focus:shadow-[0_0_0_1px_rgba(200,255,77,0.4),0_0_18px_rgba(200,255,77,0.25),inset_0_2px_6px_rgba(0,0,0,0.4)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] text-sm leading-relaxed transition-all duration-150"
                        rows={2}
                    />
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                    <RadioGroup
                        label="Motion Intensity"
                        options={[
                            { value: 'subtle' as MotionIntensity, label: 'Subtle' },
                            { value: 'normal' as MotionIntensity, label: 'Normal' },
                            { value: 'extreme' as MotionIntensity, label: 'Extreme' },
                        ]}
                        value={motionIntensity}
                        onChange={setMotionIntensity}
                    />
                    <RadioGroup
                        label="Aspect Ratio"
                        options={[
                            { value: '9:16' as AspectRatio, label: '9:16' },
                            { value: '1:1' as AspectRatio, label: '1:1' },
                            { value: '16:9' as AspectRatio, label: '16:9' },
                        ]}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                    />
                    <RadioGroup
                        label="Duration"
                        options={[
                            { value: 5 as Duration, label: '5s' },
                            { value: 8 as Duration, label: '8s' },
                            { value: 10 as Duration, label: '10s' },
                        ]}
                        value={duration}
                        onChange={setDuration}
                    />
                    <RadioGroup
                        label="Quality"
                        options={[
                            { value: 'standard' as Quality, label: 'Standard' },
                            { value: 'pro' as Quality, label: 'Pro' },
                        ]}
                        value={quality}
                        onChange={setQuality}
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={busy || !canGenerate}
                    className={`w-full py-4 rounded-[14px] font-semibold text-base transition-all ${busy || !canGenerate
                        ? 'bg-[#222631] text-[#6F7688] cursor-not-allowed'
                        : 'bg-[#C8FF4D] text-[#1C1F26] hover:bg-[#D8FF75] shadow-[0_4px_20px_rgba(200,255,77,0.4)] hover:shadow-[0_4px_28px_rgba(200,255,77,0.55)]'
                        }`}
                >
                    {generateCustom.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.15)] border-t-white rounded-full animate-spin" />
                            Starting...
                        </span>
                    ) : (
                        'Generate Video'
                    )}
                </button>
            </div>
        </div>
    );
}

// ============================================
// Main Page — Split-Screen Layout
// ============================================
export default function TrendingVideoPage() {
    const addToast = useToastStore((s) => s.addToast);
    const [activeTab, setActiveTab] = useState<ActiveTab>('themes');

    // Fetch trending themes from API
    const { data: themes = [] } = useTrendingThemes();

    // Shared generation state — drives the preview panel
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const { data: jobData } = useTrendingVideoJob(activeJobId);

    // React to job status changes
    useEffect(() => {
        if (!jobData) return;
        if (jobData.status === 'completed' && jobData.video_url) {
            setCompletedVideoUrl(jobData.video_url);
            setActiveJobId(null);
            addToast({ type: 'success', title: 'Video ready!', message: 'Your trending video has been generated.' });
        } else if (jobData.status === 'failed') {
            setActiveJobId(null);
            addToast({ type: 'error', title: 'Generation failed', message: jobData.error_message || 'Something went wrong. Please try again.' });
        }
    }, [jobData, addToast]);

    const handleJobStart = useCallback((jobId: string) => {
        setCompletedVideoUrl(null);
        setActiveJobId(jobId);
        setIsPending(false);
    }, []);

    const handleRegenerate = useCallback(() => {
        setCompletedVideoUrl(null);
    }, []);

    const handleDownload = useCallback(() => {
        if (completedVideoUrl) {
            window.open(completedVideoUrl, '_blank');
        }
    }, [completedVideoUrl]);

    const isGenerating = !!activeJobId;

    return (
        <AppLayout>
            <div className="flex flex-col min-h-screen xl:h-screen bg-[#0B0D12]">
                {/* Header */}
                <header className="flex-shrink-0 px-4 md:px-6 xl:px-8 py-4 md:py-6">
                    <h1 className="text-2xl md:text-[28px] xl:text-[32px] font-bold text-white tracking-tight">Trending AI Videos</h1>
                    <p className="text-[#A1A8B8] text-sm mt-1 mb-6 md:mb-8">Turn yourself into viral trend videos in seconds</p>
                </header>

                {/* Tablet/Mobile Preview — shown above inputs below xl */}
                {(isGenerating || completedVideoUrl || isPending) && (
                    <div className="xl:hidden px-4 md:px-6 pb-4">
                        <div className="rounded-[20px] overflow-hidden max-h-[300px] md:max-h-[350px]" style={{ background: 'linear-gradient(180deg, #262b38 0%, #222631 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(200,255,77,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
                            <PreviewPanel
                                isGenerating={isGenerating}
                                isPending={isPending}
                                jobData={jobData}
                                completedVideoUrl={completedVideoUrl}
                                onRegenerate={handleRegenerate}
                                onDownload={handleDownload}
                            />
                        </div>
                    </div>
                )}

                {/* Split Layout — vertical on mobile/tablet, horizontal on desktop */}
                <div className="flex-1 flex flex-col xl:flex-row xl:overflow-hidden">
                    {/* Left Panel — Input */}
                    <div className="flex-1 xl:overflow-y-auto px-4 md:px-6 xl:px-8 pb-24 md:pb-8">
                        {/* Segmented Tabs */}
                        <div className="pb-4 md:pb-6">
                            <div className="flex md:inline-flex bg-[#222631] rounded-full p-1 shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                                <button
                                    onClick={() => setActiveTab('themes')}
                                    className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${activeTab === 'themes'
                                        ? 'bg-[#C8FF4D] text-[#1C1F26] shadow-lg shadow-[rgba(200,255,77,0.2)]'
                                        : 'text-[#A1A8B8] hover:text-white'
                                        }`}
                                >
                                    Trending Themes
                                </button>
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${activeTab === 'create'
                                        ? 'bg-[#C8FF4D] text-[#1C1F26] shadow-lg shadow-[rgba(200,255,77,0.2)]'
                                        : 'text-[#A1A8B8] hover:text-white'
                                        }`}
                                >
                                    Create Your Own
                                </button>
                            </div>
                        </div>

                        {/* Tab Content with animation */}
                        <div key={activeTab} className="animate-fade-slide-in">
                            {activeTab === 'themes' ? (
                                <TrendingThemeTab onJobStart={handleJobStart} isGenerating={isGenerating} themes={themes} />
                            ) : (
                                <CreateYourOwnTab onJobStart={handleJobStart} isGenerating={isGenerating} />
                            )}
                        </div>
                    </div>

                    {/* Right Panel — Preview (desktop only) */}
                    <div className="hidden xl:flex w-[400px] 2xl:w-[440px] bg-[#1C1F26] flex-shrink-0 shadow-[-1px_0_0_rgba(255,255,255,0.04)]">
                        <div className="w-full flex flex-col p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex-shrink-0">Preview</h3>
                            <div className="flex-1 rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(180deg, #262b38 0%, #222631 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(200,255,77,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
                                <PreviewPanel
                                    isGenerating={isGenerating}
                                    isPending={isPending}
                                    jobData={jobData}
                                    completedVideoUrl={completedVideoUrl}
                                    onRegenerate={handleRegenerate}
                                    onDownload={handleDownload}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
