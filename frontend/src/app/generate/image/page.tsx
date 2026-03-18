'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useUserStore } from '@/store/userStore';
import { useGenerateImage, useUserImages, useDeleteImage, useImageJob, useUserCredits, useAIPresets } from '@/hooks/useApi';
import PresetSelectorModal from '@/components/generator/PresetSelectorModal';
import { useToastStore } from '@/store/toastStore';
import type { AIPreset } from '@/types';
import { useDropShare } from '@/hooks/useDropShare';

// Model options (from docs/image_gen.md)
const MODELS = [
    { id: 'flux-2-pro', name: 'Flux Pro', icon: '✦' },
    { id: 'flux-2-max', name: 'Flux Max', icon: '◈' },
    { id: 'z-turbo', name: 'Z-Turbo', icon: '⚡' },
    { id: 'nano-banana', name: 'Nano Banana', icon: '◉' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', icon: '★' },
];

// Image size options (Fal.ai enum values)
const IMAGE_SIZES = [
    { value: 'square_hd', label: 'Square HD' },
    { value: 'square', label: 'Square' },
    { value: 'portrait_4_3', label: 'Portrait 4:3' },
    { value: 'portrait_16_9', label: 'Portrait 16:9' },
    { value: 'landscape_4_3', label: 'Landscape 4:3' },
    { value: 'landscape_16_9', label: 'Landscape 16:9' },
];

// Output format options
const OUTPUT_FORMATS = [
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
];

// Icons
function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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

function ShareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function SquareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
        </svg>
    );
}

function AdjustmentsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
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

interface GeneratedImage {
    id: string;
    url: string;
    thumbnail_url?: string;
    prompt: string;
    model: string;
    image_size: string;
    created_at: string;
}

// Dropdown Component - Vertical list, all items visible
function Dropdown({
    value,
    options,
    onChange,
    icon,
}: {
    value: string;
    options: { value: string; label: string; icon?: string }[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
                {icon}
                <span>{selected?.icon} {selected?.label}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 min-w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm whitespace-nowrap transition-colors first:rounded-t-xl last:rounded-b-xl ${
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

// Image Card Component
function ImageCard({ image, onPreview, onDelete, onReusePrompt }: {
    image: GeneratedImage;
    onPreview: () => void;
    onDelete: () => void;
    onReusePrompt: () => void;
}) {
    const { downloadMedia, shareMedia } = useDropShare();

    return (
        <div className="group relative aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300">
            <img
                src={image.thumbnail_url || image.url}
                alt={image.prompt}
                className="w-full h-full object-cover cursor-pointer"
                onClick={onPreview}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs text-gray-300 line-clamp-2 mb-2">{image.prompt}</p>
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onReusePrompt(); }}
                            className="p-1.5 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Reuse prompt"
                        >
                            <RefreshIcon className="w-4 h-4 text-gray-300" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); downloadMedia(image.url, `image-${image.id}.jpg`); }}
                            className="p-1.5 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download"
                        >
                            <DownloadIcon className="w-4 h-4 text-gray-300" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); shareMedia(image.url, 'Check out this AI Image from Reelr!'); }}
                            className="p-1.5 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Share"
                        >
                            <ShareIcon className="w-4 h-4 text-gray-300" />
                        </button>
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

// Generating Card Component - Shows while image is being generated
function GeneratingCard({ prompt, progress, status }: { prompt: string; progress: number; status: string }) {
    const statusText = status === 'queued' ? 'Starting...' : status === 'processing' ? 'Generating...' : 'Processing...';

    return (
        <div className="relative aspect-square bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden border-2 border-accent/40 shadow-lg shadow-accent/10">
            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                {/* Spinner */}
                <div className="relative w-14 h-14 mb-4">
                    <div className="absolute inset-0 border-2 border-gray-700 rounded-full" />
                    <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <SparklesIcon className="absolute inset-0 m-auto w-6 h-6 text-accent animate-pulse" />
                </div>

                {/* Status */}
                <p className="text-sm font-semibold text-accent mb-2">{statusText}</p>

                {/* Progress bar */}
                <div className="w-full max-w-[140px] h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(progress, 5)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400">{progress}%</p>

                {/* Prompt preview */}
                <p className="text-xs text-gray-500 mt-3 line-clamp-2 text-center px-2">{prompt}</p>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-20 h-20 mb-6 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700">
                <SparklesIcon className="w-9 h-9 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No images yet</h3>
            <p className="text-gray-500 text-center max-w-sm">
                Generate your first AI image below
            </p>
        </div>
    );
}

// Active job type
interface ActiveJob {
    jobId: string;
    prompt: string;
    status: string;
    progress: number;
}

// Main Page Component
export default function ImageGeneratorPage() {
    const { user, updateCredits } = useUserStore();
    const addToast = useToastStore((s) => s.addToast);
    const { downloadMedia, shareMedia, isDownloading } = useDropShare();

    // Form state
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flux-2-pro');
    const [imageSize, setImageSize] = useState('square_hd');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [seed, setSeed] = useState('');
    const [safetyTolerance, setSafetyTolerance] = useState(2);
    const [outputFormat, setOutputFormat] = useState('jpeg');

    // UI state
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

    // Preset state
    const [selectedPreset, setSelectedPreset] = useState<AIPreset | null>(null);
    const [showPresetModal, setShowPresetModal] = useState(false);

    // Enhance prompt toggle (uses LLM to expand short prompts)
    const [enhancePrompt, setEnhancePrompt] = useState(false);

    // API hooks
    const generateImage = useGenerateImage();
    const { data: images = [], isLoading: imagesLoading, refetch: refetchImages } = useUserImages();
    const { data: presets = [], isLoading: presetsLoading } = useAIPresets();
    const deleteImage = useDeleteImage();
    const { refetch: refetchCredits } = useUserCredits();

    // Poll active job status
    const { data: jobStatus } = useImageJob(activeJob?.jobId || null, !!activeJob);

    // Update active job status when polling returns new data
    useEffect(() => {
        if (jobStatus && activeJob) {
            setActiveJob(prev => prev ? {
                ...prev,
                status: jobStatus.status,
                progress: jobStatus.progress || 0,
            } : null);

            // Job completed or failed - clear active job and refresh
            if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
                setTimeout(() => {
                    setActiveJob(null);
                    refetchImages();
                    refetchCredits();
                }, 500); // Small delay to show 100% progress
            }
        }
    }, [jobStatus, activeJob, refetchImages, refetchCredits]);

    const CREDIT_COST = 1;
    const MAX_PROMPT_LENGTH = 1000;

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        if ((user?.credits ?? 0) < CREDIT_COST) {
            addToast({ type: 'error', title: 'Insufficient credits', message: 'Please upgrade your plan to continue generating.' });
            return;
        }

        const currentPrompt = prompt.trim();

        try {
            const result = await generateImage.mutateAsync({
                prompt: currentPrompt,
                model: selectedModel,
                image_size: imageSize,
                seed: seed ? parseInt(seed) : undefined,
                safety_tolerance: safetyTolerance,
                enable_safety_checker: true,
                output_format: outputFormat,
                // Style preset - optional
                preset_id: selectedPreset?.id,
                // Prompt enhancement - expands short prompts with LLM
                enhance_prompt: enhancePrompt,
            });

            // Set active job to start polling
            setActiveJob({
                jobId: result.job_id,
                prompt: currentPrompt,
                status: 'queued',
                progress: 0,
            });

            // Clear prompt and update credits immediately
            setPrompt('');
            if (user) {
                updateCredits(user.credits - CREDIT_COST);
            }
        } catch (error: any) {
            const message = error?.response?.data?.detail || error?.message || 'Please try again.';
            addToast({ type: 'error', title: 'Image generation failed', message: typeof message === 'string' ? message : JSON.stringify(message), duration: 6000 });
        }
    }, [prompt, selectedModel, imageSize, seed, safetyTolerance, outputFormat, selectedPreset, enhancePrompt, user, generateImage, updateCredits, addToast]);

    const handleReusePrompt = useCallback((imagePrompt: string) => {
        setPrompt(imagePrompt);
    }, []);

    const handleDeleteImage = useCallback(async (imageId: string) => {
        try {
            await deleteImage.mutateAsync(imageId);
            refetchImages();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    }, [deleteImage, refetchImages]);

    return (
        <AppLayout>
            <div className="flex flex-col min-h-full bg-[#0F1115] pb-20 md:pb-0">
                {/* Page Header */}
                <header className="flex-shrink-0 px-4 md:px-6 xl:px-8 py-5">
                    <h1 className="text-xl font-semibold text-white">AI Image Generator</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Create stunning AI images with Flux Pro, Flux Max, and Nano Banana</p>
                </header>

                {/* Main Content Area - Gallery */}
                <div className="flex-1 px-4 md:px-6 xl:px-8 pb-4">
                    {imagesLoading && !activeJob ? (
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : images.length === 0 && !activeJob ? (
                        <EmptyState />
                    ) : (
                        <div className={`gap-4 pb-8 ${images.length === 0 ? 'flex flex-col h-full' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                            {/* Show generating card first if there's an active job */}
                            {activeJob && (
                                <GeneratingCard
                                    prompt={activeJob.prompt}
                                    progress={activeJob.progress}
                                    status={activeJob.status}
                                />
                            )}
                            {images.map((image) => (
                                <ImageCard
                                    key={image.id}
                                    image={image}
                                    onPreview={() => setSelectedImage(image)}
                                    onDelete={() => handleDeleteImage(image.id)}
                                    onReusePrompt={() => handleReusePrompt(image.prompt)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Prompt Input Box - Sticky at Bottom */}
                <div className="sticky bottom-[68px] md:bottom-0 z-20 bg-[#0F1115] shadow-[0_-10px_40px_rgba(15,17,21,0.8)] px-2 sm:px-4 md:px-6 xl:px-8 pb-3 pt-2 md:pb-8 md:pt-4 border-t border-gray-800/50">
                    <div className="max-w-4xl mx-auto">
                        {/* Selected Preset Chip (above prompt box) */}
                        {selectedPreset && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border border-accent/30 rounded-xl">
                                    <PaletteIcon className="w-4 h-4 text-accent" />
                                    <span className="text-sm text-accent/90">Preset: {selectedPreset.display_name}</span>
                                    <button
                                        onClick={() => setSelectedPreset(null)}
                                        className="ml-1 w-5 h-5 flex items-center justify-center text-accent hover:text-white hover:bg-accent/30 rounded-full transition-colors"
                                    >
                                        <span className="text-xs">×</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl">
                            {/* Text Input Row */}
                            <div className="flex items-end gap-2 pr-2 sm:pr-3 bg-transparent">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the image you want to create..."
                                    className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm sm:text-[15px] leading-relaxed min-h-[44px] sm:min-h-[56px] max-h-[140px] px-4 py-3 sm:px-5 sm:py-4"
                                    rows={1}
                                    maxLength={MAX_PROMPT_LENGTH}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <div className="pb-2 sm:pb-3 flex-shrink-0">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim() || !!activeJob || generateImage.isPending}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                                            prompt.trim() && !activeJob && !generateImage.isPending
                                                ? 'bg-white text-black shadow-lg shadow-white/20 hover:bg-gray-200'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {activeJob || generateImage.isPending ? (
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
                                        ) : (
                                            <ArrowUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Controls Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-t border-gray-800/50 gap-y-2">
                                {/* Left Controls - scrollable on mobile */}
                                <div className="flex items-center gap-x-1 overflow-x-auto scrollbar-hide flex-1 min-w-0 -mx-1 px-1">
                                    {/* Model Selector */}
                                    <Dropdown
                                        value={selectedModel}
                                        options={MODELS.map(m => ({ value: m.id, label: m.name, icon: m.icon }))}
                                        onChange={setSelectedModel}
                                        icon={<span className="text-gray-500">{MODELS.find(m => m.id === selectedModel)?.icon}</span>}
                                    />

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Size Selector */}
                                    <Dropdown
                                        value={imageSize}
                                        options={IMAGE_SIZES}
                                        onChange={setImageSize}
                                        icon={<SquareIcon className="w-4 h-4 text-gray-500" />}
                                    />

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Presets Button */}
                                    <button
                                        onClick={() => setShowPresetModal(true)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            selectedPreset ? 'text-accent' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <PaletteIcon className="w-4 h-4" />
                                        <span>Presets</span>
                                    </button>

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Enhance Prompt Toggle */}
                                    <button
                                        onClick={() => setEnhancePrompt(!enhancePrompt)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            enhancePrompt ? 'text-accent' : 'text-gray-400 hover:text-white'
                                        }`}
                                        title="Expand short prompts with AI for better results"
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                        <span>Enhance</span>
                                    </button>

                                    <div className="w-px h-5 bg-gray-800 mx-1" />

                                    {/* Advanced Toggle */}
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            showAdvanced ? 'text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <AdjustmentsIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Advanced</span>
                                    </button>
                                </div>

                                {/* Right Controls */}
                                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-gray-800/50 sm:border-0 text-right">
                                    {/* Credits cost */}
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800">
                                        <span className="text-gray-400">{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                                        <span className="mx-1 opacity-40">|</span>
                                        <CreditIcon className="w-4 h-4 text-accent" />
                                        <span className="text-green-400/80">{user?.credits ?? 0} bal.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Options Panel */}
                            {showAdvanced && (
                                <div className="px-5 py-4 border-t border-gray-800/50 bg-gray-900/50">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Seed */}
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1.5">Seed (optional)</label>
                                            <input
                                                type="number"
                                                value={seed}
                                                onChange={(e) => setSeed(e.target.value)}
                                                placeholder="Random"
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-all"
                                            />
                                        </div>

                                        {/* Safety Tolerance */}
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1.5">Safety Tolerance (1-5)</label>
                                            <input
                                                type="number"
                                                value={safetyTolerance}
                                                onChange={(e) => setSafetyTolerance(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                                                min={1}
                                                max={5}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-all"
                                            />
                                        </div>

                                        {/* Output Format */}
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1.5">Output Format</label>
                                            <select
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-gray-600 transition-all"
                                            >
                                                {OUTPUT_FORMATS.map((format) => (
                                                    <option key={format.value} value={format.value}>
                                                        {format.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Preview Modal */}
            <Modal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                size="xl"
            >
                {selectedImage && (
                    <div className="space-y-4">
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.prompt}
                            className="w-full rounded-lg"
                        />
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-sm text-gray-300">{selectedImage.prompt}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {MODELS.find(m => m.id === selectedImage.model)?.name || selectedImage.model} • {selectedImage.image_size}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        handleReusePrompt(selectedImage.prompt);
                                        setSelectedImage(null);
                                    }}
                                >
                                    <RefreshIcon className="w-4 h-4 mr-1" />
                                    Reuse
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => shareMedia(selectedImage.url, 'Check out this AI Image from Reelr!')}
                                >
                                    <ShareIcon className="w-4 h-4 mr-1" />
                                    Share
                                </Button>
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    onClick={() => downloadMedia(selectedImage.url, `image-${selectedImage.id}.jpg`)}
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
