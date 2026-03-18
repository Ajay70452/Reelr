'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useUserStore } from '@/store/userStore';
import {
    useGenerateAIVideo,
    useAIVideos,
    useAIVideoJob,
    useAIVideoModels,
    useDeleteAIVideo,
    useAIPresets,
    usePreviewPrompt,
} from '@/hooks/useApi';
import PresetSelectorModal from '@/components/generator/PresetSelectorModal';
import { useToastStore } from '@/store/toastStore';
import type { AIVideo, AIVideoModel, AIVideoModelConfig, AIPreset } from '@/types';
import { useDropShare } from '@/hooks/useDropShare';

// Model definitions with icons and credit costs
const MODEL_INFO: Record<AIVideoModel, { icon: string; creditCost: number; description: string; estimatedTime: string }> = {
    sora2: { icon: '✦', creditCost: 20, description: 'Premium quality, up to 12s', estimatedTime: '~30-90s' },
    veo3: { icon: '◈', creditCost: 15, description: 'Audio support, up to 8s', estimatedTime: '~45-120s' },
    kling25: { icon: '◉', creditCost: 10, description: 'Fast generation, 5s/10s', estimatedTime: '~20-60s' },
    ltx2: { icon: '⬡', creditCost: 5, description: 'Advanced options, up to 20s', estimatedTime: '~60-180s' },
};

// Prompt suggestion chips per model
const PROMPT_SUGGESTIONS: Record<AIVideoModel, string[]> = {
    sora2: [
        'A golden retriever running through autumn leaves, camera follows alongside, warm light',
        'Time-lapse of a flower blooming in a garden, morning dew evaporating, golden hour',
        'Underwater coral reef with tropical fish swimming, light rays filtering through water',
    ],
    veo3: [
        'Cinematic close-up of coffee being poured, steam rising, soft morning light through window',
        'A dancer performing contemporary ballet in an empty warehouse, dramatic side lighting',
        'Rain falling on a busy Tokyo street at night, neon reflections on wet pavement',
    ],
    kling25: [
        'Cat stretching on a sunlit windowsill, dust particles floating, cozy atmosphere',
        'Astronaut walking on Mars surface, red dust kicked up by boots, Earth visible in sky',
        'Chef plating a gourmet dish, precise movements, steam rising, professional kitchen',
    ],
    ltx2: [
        'Aerial orbit around a medieval castle, foggy morning, photorealistic, camera slowly circling',
        'Macro shot of a butterfly landing on a wildflower, shallow depth of field, 4K detail',
        'Northern lights dancing over snowy mountains, mirror-like lake reflection, timelapse',
    ],
};

// Icons
function VideoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
}

function PlayIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
    );
}

function ShareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
    );
}

function CreditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
    );
}

function ArrowUpIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
        </svg>
    );
}

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
    );
}

function PaletteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}

// Generating Card Component (shows during generation)
function GeneratingCard({ prompt, progress, status, estimatedTime }: { prompt: string; progress: number; status: string; estimatedTime?: string }) {
    const statusText = status === 'queued' ? 'Starting...' : status === 'processing' ? 'Generating...' : 'Processing...';

    return (
        <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden border-2 border-purple-500/40 shadow-lg shadow-purple-500/10">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 animate-pulse" />

            {/* Spinner */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-purple-400 font-medium">{statusText}</span>
                    <div className="flex items-center gap-2">
                        {estimatedTime && <span className="text-gray-500 text-xs">{estimatedTime}</span>}
                        <span className="text-gray-400">{progress}%</span>
                    </div>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 line-clamp-1">{prompt}</p>
            </div>
        </div>
    );
}

// Video Card Component
function VideoCard({ video, onPlay, onDelete }: {
    video: AIVideo;
    onPlay: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300">
            {video.thumbnail_url ? (
                <img
                    src={video.thumbnail_url}
                    alt={video.prompt}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <VideoIcon className="w-12 h-12 text-gray-600" />
                </div>
            )}

            {/* Play button overlay */}
            <button
                onClick={onPlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                    <PlayIcon className="w-6 h-6 text-black ml-1" />
                </div>
            </button>

            {/* Bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{MODEL_INFO[video.model]?.icon}</span>
                        <span className="text-xs text-gray-300">{video.duration}s</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                            href={video.url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download"
                        >
                            <DownloadIcon className="w-4 h-4 text-gray-300" />
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 bg-gray-800/80 hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <TrashIcon className="w-4 h-4 text-gray-300 hover:text-red-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-20 h-20 mb-6 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700">
                <VideoIcon className="w-9 h-9 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No videos yet</h3>
            <p className="text-gray-500 text-center max-w-sm">
                Start by creating your first AI video with Sora 2, Veo 3, Kling 2.5, or LTX-2
            </p>
        </div>
    );
}

// Dropdown Component
function Dropdown({
    value,
    options,
    onChange,
    icon,
    label,
    disabled
}: {
    value: string;
    options: { value: string; label: string; icon?: string }[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    label?: string;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    disabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white'
                }`}
            >
                {icon}
                <span>{selected?.icon && <span className="mr-1">{selected.icon}</span>}{selected?.label || label}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                value === option.value
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            {option.icon && <span className="mr-2">{option.icon}</span>}
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Toggle Switch Component
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <div
                onClick={() => onChange(!checked)}
                className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
                <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}
                />
            </div>
            <span className="text-sm text-gray-400">{label}</span>
        </label>
    );
}

// Model Selector Cards
function ModelSelector({
    selectedModel,
    onSelect,
    modelConfigs,
}: {
    selectedModel: AIVideoModel;
    onSelect: (model: AIVideoModel) => void;
    modelConfigs: Record<string, AIVideoModelConfig> | undefined;
}) {
    const models: AIVideoModel[] = ['sora2', 'veo3', 'kling25', 'ltx2'];

    return (
        <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-2 pb-2 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
            {models.map((modelId) => {
                const info = MODEL_INFO[modelId];
                const config = modelConfigs?.[modelId];
                const isSelected = selectedModel === modelId;

                return (
                    <button
                        key={modelId}
                        onClick={() => onSelect(modelId)}
                        className={`flex-shrink-0 w-36 md:w-auto p-3 rounded-xl border transition-all text-left ${
                            isSelected
                                ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{info.icon}</span>
                            <span className="font-medium text-sm">{config?.name || modelId}</span>
                        </div>
                        <p className="text-xs text-gray-500">{info.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs">
                            <div className="flex items-center gap-1">
                                <CreditIcon className="w-3 h-3" />
                                <span className={isSelected ? 'text-purple-400' : 'text-gray-500'}>{info.creditCost}</span>
                            </div>
                            <span className="text-gray-600">{info.estimatedTime}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// Advanced Options Panel (model-specific)
function AdvancedOptions({
    model,
    config,
    options,
    onChange,
}: {
    model: AIVideoModel;
    config: AIVideoModelConfig | undefined;
    options: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    if (!config) return null;

    return (
        <div className="space-y-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Advanced Options
            </h4>

            <div className="grid grid-cols-2 gap-4">
                {/* Audio toggle (Veo 3, LTX-2) */}
                {config.supports_audio && (
                    <Toggle
                        checked={options.generate_audio ?? false}
                        onChange={(v) => onChange('generate_audio', v)}
                        label="Generate Audio"
                    />
                )}

                {/* Auto-fix prompt (Veo 3) */}
                {config.supports_auto_fix_prompt && (
                    <Toggle
                        checked={options.auto_fix_prompt ?? true}
                        onChange={(v) => onChange('auto_fix_prompt', v)}
                        label="Auto-fix Prompt"
                    />
                )}

                {/* Prompt expansion (LTX-2) */}
                {config.supports_prompt_expansion && (
                    <Toggle
                        checked={options.enable_prompt_expansion ?? true}
                        onChange={(v) => onChange('enable_prompt_expansion', v)}
                        label="Prompt Expansion"
                    />
                )}

                {/* Safety checker (LTX-2) */}
                {config.supports_safety_checker && (
                    <Toggle
                        checked={options.enable_safety_checker ?? true}
                        onChange={(v) => onChange('enable_safety_checker', v)}
                        label="Safety Checker"
                    />
                )}

                {/* Multiscale (LTX-2) */}
                {config.supports_multiscale && (
                    <Toggle
                        checked={options.multiscale ?? false}
                        onChange={(v) => onChange('multiscale', v)}
                        label="Multiscale"
                    />
                )}
            </div>

            {/* CFG Scale slider (Kling 2.5) */}
            {config.supports_cfg_scale && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">CFG Scale</span>
                        <span className="text-white">{(options.cfg_scale ?? config.cfg_scale_default ?? 0.5).toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={options.cfg_scale ?? config.cfg_scale_default ?? 0.5}
                        onChange={(e) => onChange('cfg_scale', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            )}

            {/* Video quality (LTX-2) */}
            {config.supports_video_quality && config.video_quality_options && (
                <div className="space-y-2">
                    <span className="text-sm text-gray-400">Video Quality</span>
                    <div className="flex gap-2">
                        {config.video_quality_options.map((quality) => (
                            <button
                                key={quality}
                                onClick={() => onChange('video_quality', quality)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    (options.video_quality ?? 'high') === quality
                                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
                                }`}
                            >
                                {quality.charAt(0).toUpperCase() + quality.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Seed input (Veo 3, LTX-2) */}
            {config.supports_seed && (
                <div className="space-y-2">
                    <span className="text-sm text-gray-400">Seed (optional)</span>
                    <input
                        type="number"
                        placeholder="Random"
                        value={options.seed ?? ''}
                        onChange={(e) => onChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                </div>
            )}
        </div>
    );
}

// Main Page Component
export default function VideoGeneratorPage() {
    const { user } = useUserStore();
    const addToast = useToastStore((s) => s.addToast);
    const { downloadMedia, shareMedia, isDownloading } = useDropShare();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Form state
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState<AIVideoModel>('kling25');
    const [duration, setDuration] = useState(5);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('1080p');
    const [advancedOptions, setAdvancedOptions] = useState<Record<string, any>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Reference image state (persists across model changes)
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Preset state (persists across model changes)
    const [selectedPreset, setSelectedPreset] = useState<AIPreset | null>(null);
    const [showPresetModal, setShowPresetModal] = useState(false);

    // Enhance prompt toggle (uses LLM to expand short prompts)
    const [enhancePrompt, setEnhancePrompt] = useState(false);

    // Prompt preview state
    const [previewResult, setPreviewResult] = useState<{ enhanced_prompt: string; was_expanded: boolean } | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Active job state
    interface ActiveJob {
        jobId: string;
        prompt: string;
        model: AIVideoModel;
    }
    const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

    // UI state
    const [selectedVideo, setSelectedVideo] = useState<AIVideo | null>(null);

    // API hooks
    const { data: modelConfigs } = useAIVideoModels();
    const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useAIVideos();
    const { data: presets = [], isLoading: presetsLoading } = useAIPresets();
    const generateVideo = useGenerateAIVideo();
    const deleteVideo = useDeleteAIVideo();
    const previewPrompt = usePreviewPrompt();
    const { data: jobStatus } = useAIVideoJob(activeJob?.jobId || null, !!activeJob);

    // Get current model config
    const currentConfig = useMemo(() => modelConfigs?.[selectedModel], [modelConfigs, selectedModel]);

    // Reset form when model changes (but preserve reference image)
    useEffect(() => {
        if (currentConfig) {
            setDuration(currentConfig.default_duration);
            setAspectRatio(currentConfig.default_aspect_ratio);
            if (currentConfig.default_resolution) {
                setResolution(currentConfig.default_resolution);
            }
            setAdvancedOptions({});
            setNegativePrompt('');
            // NOTE: referenceImage and imagePreview are NOT reset - they persist across model changes
        }
    }, [selectedModel, currentConfig]);

    // Handle image selection
    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                addToast({ type: 'warning', title: 'Invalid file type', message: 'Please select a JPG, PNG, or WEBP image.' });
                return;
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                addToast({ type: 'warning', title: 'File too large', message: 'Image must be less than 10MB.' });
                return;
            }
            setReferenceImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, [addToast]);

    // Handle image removal
    const handleRemoveImage = useCallback(() => {
        setReferenceImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Handle job completion
    useEffect(() => {
        if (jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
            if (jobStatus.status === 'completed') {
                refetchVideos();
                addToast({ type: 'success', title: 'Video ready', message: 'Your video has been generated successfully.' });
            } else {
                addToast({ type: 'error', title: 'Generation failed', message: jobStatus.error_message || 'An unexpected error occurred.', duration: 6000 });
            }
            // Clear job after a short delay to show completion state
            setTimeout(() => setActiveJob(null), 1500);
        }
    }, [jobStatus?.status, refetchVideos, addToast, jobStatus?.error_message]);

    // Auto-preview when enhance is toggled on (debounced 500ms)
    useEffect(() => {
        if (!enhancePrompt || !prompt.trim()) {
            setPreviewResult(null);
            setShowPreview(false);
            return;
        }

        if (previewDebounceRef.current) {
            clearTimeout(previewDebounceRef.current);
        }

        previewDebounceRef.current = setTimeout(() => {
            previewPrompt.mutate(
                { prompt: prompt.trim(), model: selectedModel, preset_id: selectedPreset?.id, enhance_prompt: true },
                {
                    onSuccess: (data) => {
                        setPreviewResult({ enhanced_prompt: data.enhanced_prompt, was_expanded: data.was_expanded });
                        setShowPreview(true);
                    },
                }
            );
        }, 500);

        return () => {
            if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enhancePrompt, prompt, selectedModel, selectedPreset?.id]);

    // Build duration options from config
    const durationOptions = useMemo(() => {
        if (!currentConfig?.durations) return [];
        return currentConfig.durations.map(d => ({ value: d.toString(), label: `${d}s` }));
    }, [currentConfig]);

    // Build aspect ratio options from config
    const aspectRatioOptions = useMemo(() => {
        if (!currentConfig?.aspect_ratios) return [];
        return currentConfig.aspect_ratios.map(ar => ({
            value: ar,
            label: ar.includes('_') ? ar.replace(/_/g, ' ').replace('landscape', '').replace('portrait', '').trim() : ar,
        }));
    }, [currentConfig]);

    // Build resolution options from config
    const resolutionOptions = useMemo(() => {
        if (!currentConfig?.resolutions) return [];
        return currentConfig.resolutions.map(r => ({ value: r, label: r }));
    }, [currentConfig]);

    const creditCost = MODEL_INFO[selectedModel]?.creditCost || 10;

    const handleAdvancedOptionChange = (key: string, value: any) => {
        setAdvancedOptions(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        if ((user?.credits ?? 0) < creditCost) {
            addToast({ type: 'error', title: 'Insufficient credits', message: `You need ${creditCost} credits but only have ${user?.credits ?? 0}. Please upgrade your plan.` });
            return;
        }

        try {
            const result = await generateVideo.mutateAsync({
                prompt: prompt.trim(),
                model: selectedModel,
                duration,
                aspect_ratio: aspectRatio,
                resolution: currentConfig?.resolutions ? resolution : undefined,
                negative_prompt: currentConfig?.supports_negative_prompt && negativePrompt.trim() ? negativePrompt.trim() : undefined,
                options: Object.keys(advancedOptions).length > 0 ? advancedOptions : undefined,
                reference_image: imagePreview || undefined,
                preset_id: selectedPreset?.id,
                enhance_prompt: enhancePrompt,
            });

            setActiveJob({
                jobId: result.job_id,
                prompt: prompt.trim(),
                model: selectedModel,
            });
            setPrompt('');
            setNegativePrompt('');
            setPreviewResult(null);
            setShowPreview(false);
            handleRemoveImage();
        } catch (error: any) {
            const message = error?.response?.data?.detail?.error || error?.response?.data?.detail || error?.message || 'Generation failed';
            addToast({ type: 'error', title: 'Generation failed', message: typeof message === 'string' ? message : JSON.stringify(message), duration: 6000 });
        }
    }, [prompt, negativePrompt, selectedModel, duration, aspectRatio, resolution, advancedOptions, selectedPreset, enhancePrompt, user?.credits, creditCost, generateVideo, currentConfig, imagePreview, handleRemoveImage, addToast]);

    const handleDeleteVideo = useCallback(async (videoId: string) => {
        try {
            await deleteVideo.mutateAsync(videoId);
            refetchVideos();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    }, [deleteVideo, refetchVideos]);

    const isGenerating = generateVideo.isPending || !!activeJob;

    return (
        <AppLayout>
            <div className="flex flex-col min-h-full bg-[#0F1115] pb-20 md:pb-0">
                {/* Page Header */}
                <header className="flex-shrink-0 px-4 md:px-6 xl:px-8 py-5">
                    <h1 className="text-xl font-semibold text-white">AI Video Generator</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Create stunning AI videos with Sora 2, Veo 3, Kling 2.5, and LTX-2</p>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 px-4 md:px-6 xl:px-8 pb-4">


                    {videosLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : videos.length === 0 && !activeJob ? (
                        <EmptyState />
                    ) : (
                        <div className={`gap-4 pb-8 ${videos.length === 0 ? 'flex flex-col h-full' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                            {/* Show generating card first if there's an active job */}
                            {activeJob && jobStatus && (
                                <div className="max-w-md w-full">
                                    <GeneratingCard
                                        prompt={activeJob.prompt}
                                        progress={jobStatus.progress || 0}
                                        status={jobStatus.status}
                                        estimatedTime={MODEL_INFO[activeJob.model]?.estimatedTime}
                                    />
                                </div>
                            )}
                            {videos.map((video: AIVideo) => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onPlay={() => setSelectedVideo(video)}
                                    onDelete={() => handleDeleteVideo(video.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Generation Panel - STICKY at Bottom */}
                <div className="sticky bottom-[68px] md:bottom-0 z-20 bg-[#0F1115] shadow-[0_-10px_40px_rgba(15,17,21,0.8)] px-2 sm:px-4 md:px-6 xl:px-8 pb-3 pt-2 md:pb-6 md:pt-4 border-t border-gray-800/50">
                    <div className="max-w-4xl mx-auto space-y-2 md:space-y-4">
                        {/* Model Selector */}
                        <ModelSelector
                            selectedModel={selectedModel}
                            onSelect={setSelectedModel}
                            modelConfigs={modelConfigs}
                        />

                        {/* Selected Preset Chip & Reference Image Preview (above prompt box) */}
                        {(selectedPreset || imagePreview) && (
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                {/* Preset Chip */}
                                {selectedPreset && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                                        <PaletteIcon className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm text-purple-300">Preset: {selectedPreset.display_name}</span>
                                        <button
                                            onClick={() => setSelectedPreset(null)}
                                            className="ml-1 w-5 h-5 flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-500/30 rounded-full transition-colors"
                                        >
                                            <span className="text-xs">×</span>
                                        </button>
                                    </div>
                                )}

                                {/* Reference Image Preview */}
                                {imagePreview && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                                        <div className="relative">
                                            <img
                                                src={imagePreview}
                                                alt="Reference"
                                                className="w-12 h-12 object-cover rounded-lg border border-gray-700"
                                            />
                                            <button
                                                onClick={handleRemoveImage}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-900/50 transition-colors"
                                            >
                                                <span className="text-xs">×</span>
                                            </button>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-white font-medium">Reference image</p>
                                            <p className="text-xs text-gray-500">Used for all models</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Prompt Suggestion Chips (shown when prompt is empty) */}
                        {!prompt.trim() && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {PROMPT_SUGGESTIONS[selectedModel]?.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPrompt(suggestion)}
                                        className="flex-shrink-0 px-3 py-1.5 text-xs text-gray-400 bg-gray-900/50 border border-gray-800 rounded-full hover:border-purple-500/50 hover:text-purple-300 transition-colors"
                                    >
                                        {suggestion.length > 60 ? suggestion.slice(0, 60) + '...' : suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Enhanced Prompt Preview (shown when enhance is on) */}
                        {showPreview && previewResult && (
                            <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-purple-400">Enhanced prompt preview</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setPrompt(previewResult.enhanced_prompt);
                                                setPreviewResult(null);
                                                setShowPreview(false);
                                                setEnhancePrompt(false);
                                            }}
                                            className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/30 transition-colors"
                                        >
                                            Use this prompt
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(false)}
                                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{previewResult.enhanced_prompt}</p>
                            </div>
                        )}

                        {/* Prompt Input Box */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-w-0">
                            {/* Text Input Row */}
                            <div className="flex items-end gap-2 pr-2 sm:pr-3 bg-transparent w-full">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={`Describe your ${currentConfig?.name || 'AI'} video...`}
                                    className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm sm:text-[15px] leading-relaxed min-h-[44px] sm:min-h-[56px] max-h-[140px] px-4 py-3 sm:px-5 sm:py-4"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isGenerating) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <div className="pb-2 sm:pb-3 flex-shrink-0">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim() || isGenerating || (user?.credits ?? 0) < creditCost}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                                            prompt.trim() && !isGenerating && (user?.credits ?? 0) >= creditCost
                                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-600'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {isGenerating ? (
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
                                        ) : (
                                            <ArrowUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Negative Prompt (if supported) */}
                            {currentConfig?.supports_negative_prompt && (
                                <div className="px-5 pb-2">
                                    <input
                                        value={negativePrompt}
                                        onChange={(e) => setNegativePrompt(e.target.value)}
                                        placeholder="Negative prompt (optional) - what to avoid..."
                                        className="w-full px-3 py-2 bg-gray-800/50 text-white placeholder-gray-600 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                            )}

                            {/* Controls Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-t border-gray-800/50 gap-y-2">
                                {/* Left Controls - scrollable on mobile */}
                                <div className="flex items-center gap-x-1 overflow-x-auto scrollbar-hide flex-1 min-w-0 -mx-1 px-1">
                                    {/* Duration */}
                                    <Dropdown
                                        value={duration.toString()}
                                        options={durationOptions}
                                        onChange={(v) => setDuration(parseInt(v))}
                                        label="Duration"
                                    />

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Aspect Ratio */}
                                    <Dropdown
                                        value={aspectRatio}
                                        options={aspectRatioOptions}
                                        onChange={setAspectRatio}
                                        label="Aspect"
                                    />

                                    {/* Resolution (if supported) */}
                                    {currentConfig?.resolutions && currentConfig.resolutions.length > 0 && (
                                        <>
                                            <div className="w-px h-5 bg-gray-800 mx-1" />
                                            <Dropdown
                                                value={resolution}
                                                options={resolutionOptions}
                                                onChange={setResolution}
                                                label="Resolution"
                                            />
                                        </>
                                    )}

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Add Image - ALWAYS VISIBLE for all models */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            imagePreview ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{imagePreview ? 'Change image' : 'Add image'}</span>
                                    </button>

                                    {/* Presets Button - Next to Add Image */}
                                    <button
                                        onClick={() => setShowPresetModal(true)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            selectedPreset ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <PaletteIcon className="w-4 h-4" />
                                        <span className="hidden md:inline">Presets</span>
                                    </button>

                                    {/* Enhance Prompt Toggle */}
                                    <button
                                        onClick={() => setEnhancePrompt(!enhancePrompt)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            enhancePrompt ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                        title="Expand short prompts with AI for better results"
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Enhance</span>
                                    </button>

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Advanced Options Toggle */}
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            showAdvanced ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Advanced</span>
                                    </button>
                                </div>

                                <div className="flex items-center justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t border-gray-800/50 sm:border-0 text-right shrink-0">
                                    {/* Credits cost */}
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800">
                                        <CreditIcon className="w-4 h-4 text-purple-400" />
                                        <span className="text-gray-300">{creditCost} credits</span>
                                        <span className="mx-1 opacity-40">|</span>
                                        <span className={((user?.credits ?? 0) >= creditCost) ? 'text-green-400/80' : 'text-red-400/80'}>
                                            {user?.credits ?? 0} bal.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Options Panel */}
                        {showAdvanced && (
                            <AdvancedOptions
                                model={selectedModel}
                                config={currentConfig}
                                options={advancedOptions}
                                onChange={handleAdvancedOptionChange}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Video Preview Modal */}
            <Modal
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                size="lg"
            >
                {selectedVideo && (
                    <div className="space-y-4">
                        <video
                            src={selectedVideo.url}
                            controls
                            autoPlay
                            className="w-full rounded-lg"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-gray-300 line-clamp-2">{selectedVideo.prompt}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {MODEL_INFO[selectedVideo.model]?.icon} {modelConfigs?.[selectedVideo.model]?.name || selectedVideo.model} • {selectedVideo.duration}s • {selectedVideo.aspect_ratio}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => shareMedia(selectedVideo.url, 'Check out this AI Video from Reelr!')}
                                >
                                    <ShareIcon className="w-4 h-4 mr-1" />
                                    Share
                                </Button>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => downloadMedia(selectedVideo.url, `video-${selectedVideo.id}.mp4`)}
                                    disabled={isDownloading}
                                >
                                    <DownloadIcon className="w-4 h-4 mr-1" />
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Preset Selector Modal */}
            <PresetSelectorModal
                isOpen={showPresetModal}
                onClose={() => setShowPresetModal(false)}
                presets={presets}
                selectedPresetId={selectedPreset?.id || null}
                onSelectPreset={setSelectedPreset}
                isLoading={presetsLoading}
            />
        </AppLayout>
    );
}
