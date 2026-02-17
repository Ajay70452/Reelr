import { Voice } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface VoiceCardProps {
    voice: Voice;
    isSelected: boolean;
    onClick: () => void;
}

export default function VoiceCard({ voice, isSelected, onClick }: VoiceCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPreview = (e: React.MouseEvent) => {
        e.stopPropagation();
        // In production, this would play a voice sample
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 2000);
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative p-4 rounded-xl border-2 transition-all duration-300',
                'hover:scale-105',
                isSelected
                    ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(124,92,255,0.3)]'
                    : 'border-[#1D222B] bg-[#161A21] hover:border-accent/50'
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {/* Voice icon */}
                    <div
                        className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                            isSelected ? 'bg-accent text-white' : 'bg-[#1D222B] text-gray-400'
                        )}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {/* Voice info */}
                    <div className="text-left">
                        <div className="flex items-center space-x-2">
                            <h4 className={cn('text-sm font-semibold', isSelected ? 'text-accent' : 'text-white')}>
                                {voice.display_name}
                            </h4>
                            {voice.is_premium && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full border border-accent/30">
                                    Premium
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400">{voice.provider}</p>
                    </div>
                </div>

                {/* Play button */}
                <button
                    onClick={handlePlayPreview}
                    disabled={voice.is_premium}
                    className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        voice.is_premium
                            ? 'bg-[#1D222B] text-gray-600 cursor-not-allowed'
                            : 'bg-[#1D222B] text-accent hover:bg-accent hover:text-white'
                    )}
                >
                    {isPlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            )}
        </button>
    );
}
