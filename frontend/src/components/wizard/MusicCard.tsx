'use client';

import { Music } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface MusicCardProps {
    music: Music;
    isSelected: boolean;
    onClick: () => void;
}

export default function MusicCard({ music, isSelected, onClick }: MusicCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Cleanup audio on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlayPreview = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        if (!music.preview_url) {
            console.warn('No preview URL for this music track');
            return;
        }

        // Stop any other music playing (globally would be better, but this handles this instance)
        if (!audioRef.current) {
            audioRef.current = new Audio(music.preview_url);
            audioRef.current.onended = () => setIsPlaying(false);
        }

        audioRef.current.play().catch(err => {
            console.error('Playback failed:', err);
            setIsPlaying(false);
        });
        setIsPlaying(true);
    };

    const isNoMusic = music.id === 'none';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
            className={cn(
                'relative p-4 rounded-xl border-2 transition-all duration-300 w-full text-left group cursor-pointer',
                isSelected
                    ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(124,92,255,0.3)]'
                    : 'border-[#1D222B] bg-[#161A21] hover:border-accent/50'
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                    {/* Music Icon / Thumbnail */}
                    <div
                        className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0',
                            isSelected ? 'bg-accent text-white' : 'bg-[#1D222B] text-gray-400'
                        )}
                    >
                        {isNoMusic ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.119-3 2.5S3.343 19 5 19s3-1.119 3-2.5V11l9-1.8V15a4.369 4.369 0 00-1 0.114c-1.657 0-3 1.119-3 2.5s1.343 2.5 3 2.5 3-1.119 3-2.5V4a1 1 0 00-.804-.98z" />
                            </svg>
                        )}
                    </div>

                    <div className="overflow-hidden">
                        <div className="flex items-center space-x-2">
                            <h4 className={cn('text-sm font-semibold truncate', isSelected ? 'text-accent' : 'text-white')}>
                                {music.display_name}
                            </h4>
                            {music.is_premium && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent/20 text-accent rounded uppercase tracking-wider shrink-0">
                                    PRO
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            {isNoMusic ? 'No background audio' : `${music.mood} • ${music.genre}`}
                        </p>
                    </div>
                </div>

                {!isNoMusic && (
                    <button
                        onClick={handlePlayPreview}
                        className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-2',
                            isPlaying
                                ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/20'
                                : 'bg-white/5 text-gray-400 hover:bg-accent/20 hover:text-accent'
                        )}
                        title={isPlaying ? 'Pause' : 'Play Preview'}
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
                )}
            </div>

            {isSelected && (
                <div className="absolute -top-1 -right-1">
                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
