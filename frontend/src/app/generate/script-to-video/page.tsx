'use client';

import { useState, useCallback, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useUserStore } from '@/store/userStore';
import {
    useGenerateScriptToVideo,
    useScriptToVideos,
    useScriptToVideoJob,
    useDeleteScriptToVideo,
    useAIPresets,
    useDeepgramVoices,
    useMusic,
    ScriptToVideo,
    SceneBreakdown,
    DeepgramVoice,
} from '@/hooks/useApi';
import PresetSelectorModal from '@/components/generator/PresetSelectorModal';
import MusicCard from '@/components/wizard/MusicCard';
import type { AIPreset, Music } from '@/types';
import { resolveMediaUrl } from '@/lib/api';

// Image model info
const IMAGE_MODELS = {
    'flux-2-pro': { name: 'Flux 2 Pro', description: 'High quality, balanced speed', credits: 1 },
    'flux-2-max': { name: 'Flux 2 Max', description: 'Maximum quality', credits: 2 },
    'z-turbo': { name: 'Z-Turbo', description: 'Fast turbo generation', credits: 0.5 },
    'nano-banana': { name: 'Nano Banana', description: 'Fast generation', credits: 0.5 },
    'nano-banana-pro': { name: 'Nano Banana Pro', description: 'Fast + better quality', credits: 1 },
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

function LockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    );
}

function PhotoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
    );
}

function FilmIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
        </svg>
    );
}

function MusicalNoteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
        </svg>
    );
}

function MicrophoneIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    );
}

// Section Header Component
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
    );
}

// Media Type Card
function MediaTypeCard({ id, name, icon, isSelected, isLocked, onSelect }: {
    id: string;
    name: string;
    icon: React.ReactNode;
    isSelected: boolean;
    isLocked: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={() => !isLocked && onSelect()}
            disabled={isLocked}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isSelected
                ? 'bg-accent/10 border-accent text-white'
                : isLocked
                    ? 'bg-gray-900/30 border-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                }`}
        >
            {isLocked && (
                <div className="absolute top-2 right-2">
                    <LockIcon className="w-3.5 h-3.5 text-gray-600" />
                </div>
            )}
            {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                </div>
            )}
            <div className={`w-10 h-10 mb-2 flex items-center justify-center rounded-lg ${isSelected ? 'bg-accent/20' : 'bg-gray-800'
                }`}>
                {icon}
            </div>
            <span className="text-sm font-medium">{name}</span>
            {isLocked && <span className="text-[10px] text-gray-600 mt-1">Coming soon</span>}
        </button>
    );
}

// Preset Card
function PresetCard({ preset, isSelected, onSelect }: {
    preset: AIPreset;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={`relative overflow-hidden rounded-xl border transition-all ${isSelected
                ? 'border-accent ring-2 ring-accent/30'
                : 'border-gray-800 hover:border-gray-700'
                }`}
        >
            {preset.thumbnail_url ? (
                <img
                    src={preset.thumbnail_url}
                    alt={preset.display_name}
                    className="w-full aspect-square object-cover"
                />
            ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-gray-600" />
                </div>
            )}
            {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <span className="text-xs font-medium text-white">{preset.display_name}</span>
            </div>
        </button>
    );
}

// Voice Card (Deepgram)
function VoiceCard({ voice, isSelected, onSelect }: {
    voice: DeepgramVoice | { id: string; display_name: string; gender?: string; accent?: string };
    isSelected: boolean;
    onSelect: () => void;
}) {
    const isNoVoice = voice.id === 'none';
    const genderIcon = voice.gender === 'female' ? '♀' : voice.gender === 'male' ? '♂' : '';

    return (
        <button
            onClick={onSelect}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                ? 'bg-accent/10 border-accent'
                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                }`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-accent/20' : 'bg-gray-800'
                }`}>
                {isNoVoice ? (
                    <span className="text-gray-500 text-lg">🔇</span>
                ) : (
                    <MicrophoneIcon className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-gray-400'}`} />
                )}
            </div>
            <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {genderIcon} {voice.display_name}
                </p>
                <p className="text-xs text-gray-500">
                    {isNoVoice ? 'No narration' : voice.accent || 'Deepgram'}
                </p>
            </div>
            {isSelected && (
                <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                </div>
            )}
        </button>
    );
}


// Aspect Ratio Button
function AspectRatioButton({ ratio, isSelected, onSelect }: {
    ratio: string;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const labels: Record<string, string> = {
        '9:16': '9:16',
        '16:9': '16:9',
        '1:1': '1:1',
    };
    const descriptions: Record<string, string> = {
        '9:16': 'Portrait',
        '16:9': 'Landscape',
        '1:1': 'Square',
    };

    return (
        <button
            onClick={onSelect}
            className={`flex-1 p-3 rounded-xl border transition-all ${isSelected
                ? 'bg-accent/10 border-accent text-white'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                }`}
        >
            <div className="text-sm font-semibold">{labels[ratio]}</div>
            <div className="text-xs text-gray-500">{descriptions[ratio]}</div>
        </button>
    );
}

// Generating Overlay
function GeneratingOverlay({ progress, status, currentStep, totalScenes, completedScenes, scenes }: {
    progress: number;
    status: string;
    currentStep?: string;
    totalScenes?: number;
    completedScenes?: number;
    scenes?: SceneBreakdown[];
}) {
    const [showScenes, setShowScenes] = useState(false);

    const getStatusText = () => {
        switch (status) {
            case 'queued': return 'Queued...';
            case 'normalizing': return 'Analyzing script...';
            case 'segmenting': return 'Creating scenes...';
            case 'generating_images': return `Generating images (${completedScenes || 0}/${totalScenes || '?'})`;
            case 'applying_motion': return 'Applying motion effects...';
            case 'stitching': return 'Stitching final video...';
            case 'completed': return 'Complete!';
            default: return currentStep || 'Processing...';
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl overflow-y-auto">
            <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                    <div className="absolute inset-0 border-4 border-accent/20 rounded-full" />
                    <div
                        className="absolute inset-0 border-4 border-transparent border-t-accent rounded-full animate-spin"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{progress}%</span>
                    </div>
                </div>
                <p className="text-lg font-medium text-white mb-2">{getStatusText()}</p>
                <p className="text-sm text-gray-400">This may take a few moments...</p>

                {scenes && scenes.length > 0 && (
                    <button
                        onClick={() => setShowScenes(!showScenes)}
                        className="mt-4 text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                        {showScenes ? 'Hide' : 'Show'} Scene Breakdown ({scenes.length} scenes)
                    </button>
                )}
            </div>

            {showScenes && scenes && scenes.length > 0 && (
                <div className="w-full max-w-lg px-6 pb-6 space-y-3 max-h-60 overflow-y-auto">
                    {scenes.map((scene, i) => (
                        <div key={i} className="bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-accent">Scene {scene.scene_id}</span>
                                <span className="text-xs text-gray-500">{scene.duration.toFixed(1)}s</span>
                            </div>
                            <p className="text-xs text-gray-300 mb-2">
                                <span className="text-gray-500 font-medium">Narration: </span>
                                {scene.narration}
                            </p>
                            <p className="text-xs text-gray-400">
                                <span className="text-gray-500 font-medium">Image prompt: </span>
                                {scene.visual_description}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Video Card for gallery
function VideoCard({ video, onPlay, onDelete }: {
    video: ScriptToVideo;
    onPlay: () => void;
    onDelete: () => void;
}) {
    const thumbnailUrl = resolveMediaUrl(video.thumbnail_url);
    const videoUrl = resolveMediaUrl(video.video_url);

    return (
        <div className="group relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all">
            {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <VideoIcon className="w-10 h-10 text-gray-600" />
                </div>
            )}
            <button
                onClick={onPlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                </div>
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{video.scene_count || 0} scenes</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                            href={videoUrl}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 bg-gray-800/80 hover:bg-gray-700 rounded transition-colors"
                        >
                            <DownloadIcon className="w-3.5 h-3.5 text-gray-300" />
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1 bg-gray-800/80 hover:bg-red-900/50 rounded transition-colors"
                        >
                            <TrashIcon className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main Page Component
export default function ScriptToVideoPage() {
    const { user } = useUserStore();

    // Form state
    const [script, setScript] = useState('');
    const [mediaType, setMediaType] = useState('moving_images');
    const [imageModel, setImageModel] = useState('flux-2-pro');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [duration, setDuration] = useState<number>(30);
    const [consistentCharacter, setConsistentCharacter] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<AIPreset | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Active job state
    interface ActiveJob {
        jobId: string;
        script: string;
    }
    const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

    // UI state
    const [selectedVideo, setSelectedVideo] = useState<ScriptToVideo | null>(null);

    // API hooks
    const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useScriptToVideos();
    const { data: presets = [], isLoading: presetsLoading } = useAIPresets();
    const { data: voices = [] } = useDeepgramVoices();
    const { data: musicList = [] } = useMusic();
    const generateVideo = useGenerateScriptToVideo();
    const deleteVideo = useDeleteScriptToVideo();
    const { data: jobStatus } = useScriptToVideoJob(activeJob?.jobId || null, !!activeJob);

    // Handle job completion
    useEffect(() => {
        if (jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
            if (jobStatus.status === 'completed') {
                refetchVideos();
            }
            if (jobStatus.status === 'failed') {
                setGenerationError(jobStatus.error_message || 'Video generation failed.');
            }
            setTimeout(() => setActiveJob(null), 1500);
        }
    }, [jobStatus?.status, jobStatus?.error_message, refetchVideos]);

    // Estimate scenes and credits
    const scenesForDuration: Record<number, number> = { 30: 4, 45: 5, 60: 6 };
    const sceneCount = scenesForDuration[duration] || 4;
    const creditCost = 5 + sceneCount; // Base cost + per scene
    const charCount = script.length;
    const maxChars = 2000;

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) return;
        setGenerationError(null);

        if ((user?.credits ?? 0) < creditCost) {
            setGenerationError('Insufficient credits. Please upgrade your plan.');
            return;
        }

        try {
            const result = await generateVideo.mutateAsync({
                script: script.trim(),
                media_type: mediaType,
                preset_id: selectedPreset?.id,
                image_model: imageModel,
                aspect_ratio: aspectRatio,
                duration: duration,
                consistent_character: consistentCharacter,
                voice_id: selectedVoice || undefined,
                bgm_id: selectedMusic || undefined,
            });

            setActiveJob({
                jobId: result.job_id,
                script: script.trim(),
            });
        } catch (error: any) {
            console.error('Generation failed:', error);
            const msg = error?.response?.data?.detail
                || error?.response?.data?.message
                || error?.message
                || 'Generation failed. Please try again.';
            setGenerationError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
    }, [script, mediaType, selectedPreset, imageModel, aspectRatio, duration, consistentCharacter, selectedVoice, selectedMusic, user?.credits, creditCost, generateVideo]);

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
            <div className="flex flex-col md:flex-row h-screen bg-[#0F1115] overflow-hidden pb-20 md:pb-0">
                {/* LEFT PANEL: Creation Workspace (Scrollable) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-32 space-y-8">

                            {/* Section 1: Header */}
                            <div className="pt-2">
                                <h1 className="text-xl md:text-2xl font-bold text-white">Script to Video</h1>
                                <p className="text-gray-400 mt-1">
                                    Turn a script into a fully edited video using moving AI images
                                </p>
                            </div>

                            {/* Section 2: Script Input (PRIMARY FOCUS) */}
                            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                                    <span className="text-sm font-medium text-white">Your Script</span>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors">
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        AI Script Writer
                                    </button>
                                </div>
                                <textarea
                                    value={script}
                                    onChange={(e) => setScript(e.target.value.slice(0, maxChars))}
                                    placeholder={`Enter your script here...

Example:
Cleopatra was not just a queen.
She ruled Egypt with intelligence and charm.
Rome feared her influence.
Her story changed the ancient world forever.`}
                                    className="w-full h-56 px-4 py-4 bg-transparent text-white placeholder-gray-600 resize-none focus:outline-none text-[15px] leading-relaxed"
                                />
                                <div className="flex items-center justify-end px-4 py-2 border-t border-gray-800">
                                    <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-amber-400' : 'text-gray-500'}`}>
                                        {charCount} / {maxChars}
                                    </span>
                                </div>
                            </div>

                            {/* Section 3: Story Controls */}
                            <div className="space-y-6">
                                {/* Consistent Character */}
                                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">Consistent Character</p>
                                                <p className="text-xs text-gray-500">Use the same character across all scenes</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConsistentCharacter(!consistentCharacter)}
                                            className={`relative w-12 h-7 rounded-full transition-colors ${consistentCharacter ? 'bg-accent' : 'bg-gray-700'
                                                }`}
                                        >
                                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${consistentCharacter ? 'translate-x-5' : ''
                                                }`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Media Type Selection */}
                                <div>
                                    <SectionHeader title="Choose Media Type" />
                                    <div className="grid grid-cols-3 gap-3">
                                        <MediaTypeCard
                                            id="moving_images"
                                            name="Moving Images"
                                            icon={<PhotoIcon className={`w-5 h-5 ${mediaType === 'moving_images' ? 'text-accent' : 'text-gray-400'}`} />}
                                            isSelected={mediaType === 'moving_images'}
                                            isLocked={false}
                                            onSelect={() => setMediaType('moving_images')}
                                        />
                                        <MediaTypeCard
                                            id="ai_video"
                                            name="AI Video"
                                            icon={<FilmIcon className="w-5 h-5 text-gray-500" />}
                                            isSelected={false}
                                            isLocked={true}
                                            onSelect={() => { }}
                                        />
                                        <MediaTypeCard
                                            id="stock_video"
                                            name="Stock Videos"
                                            icon={<VideoIcon className="w-5 h-5 text-gray-500" />}
                                            isSelected={false}
                                            isLocked={true}
                                            onSelect={() => { }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Visual Style (Presets) */}
                            <div>
                                <SectionHeader title="Visual Style" subtitle="Choose a style for your video" />
                                {presetsLoading ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {[...Array(12)].map((_, i) => (
                                            <div key={i} className="aspect-square bg-gray-800 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {presets.map((preset) => (
                                            <PresetCard
                                                key={preset.id}
                                                preset={preset}
                                                isSelected={selectedPreset?.id === preset.id}
                                                onSelect={() => setSelectedPreset(selectedPreset?.id === preset.id ? null : preset)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 5: Quality & Model */}
                            <div>
                                <SectionHeader title="Image Quality" />
                                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                                    <div className="flex items-center justify-between">
                                        <select
                                            value={imageModel}
                                            onChange={(e) => setImageModel(e.target.value)}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-accent/50"
                                        >
                                            {Object.entries(IMAGE_MODELS).map(([id, info]) => (
                                                <option key={id} value={id}>{info.name} - {info.description}</option>
                                            ))}
                                        </select>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">
                                                Scenes: <span className="text-white font-medium">{sceneCount}</span>
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Credits: <span className="text-accent font-medium">{creditCost}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 6: Audio */}
                            <div className="space-y-6">
                                {/* Background Music */}
                                <div>
                                    <SectionHeader title="Background Music" subtitle="Select background music (optional)" />
                                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                                        <MusicCard
                                            music={{ id: 'none', display_name: 'No Music', category: 'none', genre: 'none', mood: 'none' } as Music}
                                            isSelected={selectedMusic === null || selectedMusic === 'none'}
                                            onClick={() => setSelectedMusic(null)}
                                        />
                                        {musicList.filter(m => m.id !== 'none').map((music) => (
                                            <MusicCard
                                                key={music.id}
                                                music={music}
                                                isSelected={selectedMusic === music.id}
                                                onClick={() => setSelectedMusic(music.id)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Voice Selection (Deepgram) */}
                                <div>
                                    <SectionHeader title="Voice" subtitle="Choose a Deepgram voice for narration" />
                                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                                        <VoiceCard
                                            voice={{ id: 'none', display_name: 'No Voice' }}
                                            isSelected={selectedVoice === null || selectedVoice === 'none'}
                                            onSelect={() => setSelectedVoice(null)}
                                        />
                                        {voices.map((voice) => (
                                            <VoiceCard
                                                key={voice.id}
                                                voice={voice}
                                                isSelected={selectedVoice === voice.id}
                                                onSelect={() => setSelectedVoice(voice.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 7: Output Settings */}
                            <div>
                                <SectionHeader title="Aspect Ratio" />
                                <div className="flex gap-3">
                                    <AspectRatioButton ratio="9:16" isSelected={aspectRatio === '9:16'} onSelect={() => setAspectRatio('9:16')} />
                                    <AspectRatioButton ratio="16:9" isSelected={aspectRatio === '16:9'} onSelect={() => setAspectRatio('16:9')} />
                                    <AspectRatioButton ratio="1:1" isSelected={aspectRatio === '1:1'} onSelect={() => setAspectRatio('1:1')} />
                                </div>
                            </div>

                            {/* Section 8: Duration */}
                            <div>
                                <SectionHeader title="Duration" />
                                <div className="flex gap-3">
                                    {([30, 45, 60] as const).map((d) => {
                                        const scenes = { 30: 4, 45: 5, 60: 6 }[d];
                                        return (
                                            <button
                                                key={d}
                                                onClick={() => setDuration(d)}
                                                className={`flex-1 p-3 rounded-xl border transition-all ${duration === d
                                                    ? 'bg-accent/10 border-accent text-white'
                                                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                                                    }`}
                                            >
                                                <div className="text-sm font-semibold">{d}s</div>
                                                <div className="text-xs text-gray-500">{scenes} scenes</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Sticky Bottom Action Bar */}
                    <div className="sticky bottom-0 bg-black/95 backdrop-blur border-t border-gray-800 p-4">
                        {generationError && (
                            <div className="max-w-2xl mx-auto mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
                                <p className="text-red-400 text-sm">{generationError}</p>
                                <button onClick={() => setGenerationError(null)} className="text-red-400 hover:text-red-300 ml-3 text-sm">✕</button>
                            </div>
                        )}
                        <div className="max-w-2xl mx-auto flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-gray-400">Estimated cost: </span>
                                <span className="text-white font-semibold">{creditCost} credits</span>
                                <span className="text-gray-600 mx-2">|</span>
                                <span className="text-gray-400">{user?.credits ?? 0} available</span>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!script.trim() || isGenerating || (user?.credits ?? 0) < creditCost}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${script.trim() && !isGenerating && (user?.credits ?? 0) >= creditCost
                                    ? 'bg-accent text-white hover:bg-accent/90'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Video
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Static Preview (Sticky) */}
                <div className="hidden md:flex w-80 xl:w-96 border-l border-gray-800 bg-gray-950 flex-col">
                    <div className="sticky top-0 h-screen flex flex-col">
                        {/* Preview Header */}
                        <div className="p-4 border-b border-gray-800">
                            <h3 className="text-sm font-medium text-gray-400">Output Preview (Example)</h3>
                        </div>

                        {/* Preview Video */}
                        <div className="flex-1 p-4 flex flex-col">
                            <div className="relative flex-1 bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                                {/* Example Video Placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                            <VideoIcon className="w-8 h-8 text-gray-600" />
                                        </div>
                                        <p className="text-sm text-gray-500">Example preview</p>
                                        <p className="text-xs text-gray-600 mt-1">Your video will appear here</p>
                                    </div>
                                </div>

                                {/* Generation Overlay */}
                                {isGenerating && jobStatus && (
                                    <GeneratingOverlay
                                        progress={jobStatus.progress || 0}
                                        status={jobStatus.status}
                                        currentStep={jobStatus.current_step}
                                        totalScenes={jobStatus.total_scenes}
                                        completedScenes={jobStatus.completed_scenes}
                                        scenes={jobStatus.scenes}
                                    />
                                )}
                            </div>

                            {/* Generated Videos Gallery */}
                            {videos.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-medium text-gray-500 mb-3">Recent Videos</h4>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                        {videos.slice(0, 4).map((video) => (
                                            <VideoCard
                                                key={video.id}
                                                video={video}
                                                onPlay={() => setSelectedVideo(video)}
                                                onDelete={() => handleDeleteVideo(video.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Preview Modal */}
            <Modal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} size="lg">
                {selectedVideo && (
                    <div className="space-y-4">
                        <video
                            src={resolveMediaUrl(selectedVideo.video_url)}
                            controls
                            autoPlay
                            className="w-full rounded-lg"
                        />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-300 line-clamp-2">{selectedVideo.script_preview}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedVideo.scene_count} scenes - {selectedVideo.duration}s - {selectedVideo.aspect_ratio}
                                </p>
                            </div>
                            <a href={resolveMediaUrl(selectedVideo.video_url)} download>
                                <Button variant="primary" size="sm">
                                    <DownloadIcon className="w-4 h-4 mr-1" />
                                    Download
                                </Button>
                            </a>
                        </div>
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
