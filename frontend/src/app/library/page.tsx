'use client';

import { useRouter } from 'next/navigation';
import { useLibraryVideos } from '@/hooks/useApi';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import { useState, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import type { LibraryVideo } from '@/types';

// Source badge colors
const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    script_to_video: { label: 'Script', color: 'text-cyan-300', bg: 'bg-cyan-500/15' },
    ai_video: { label: 'AI Video', color: 'text-purple-300', bg: 'bg-purple-500/15' },
    trending_video: { label: 'Trending', color: 'text-[#C8FF4D]', bg: 'bg-[#C8FF4D]/15' },
    classic: { label: 'Classic', color: 'text-blue-300', bg: 'bg-blue-500/15' },
};

type FilterType = 'all' | 'script_to_video' | 'ai_video' | 'trending_video' | 'classic';

function LibraryVideoCard({ video }: { video: LibraryVideo }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const source = SOURCE_CONFIG[video.source] || SOURCE_CONFIG.classic;

    const handleMouseEnter = () => {
        setIsHovering(true);
        videoRef.current?.play().catch(() => { });
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div
            className="group relative bg-[#161A21] border border-[#1D222B] rounded-2xl overflow-hidden hover:border-[#C8FF4D]/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_20px_rgba(200,255,77,0.08)]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Video Preview */}
            <div className={`relative ${video.aspect_ratio === '9:16' ? 'aspect-[9/16]' : video.aspect_ratio === '1:1' ? 'aspect-square' : 'aspect-video'} bg-gradient-to-br from-[#1C1F26] to-[#0F1115] cursor-pointer max-h-[340px]`}>
                {video.video_url ? (
                    <>
                        {video.thumbnail_url && !isHovering && (
                            <img
                                src={video.thumbnail_url}
                                alt="Thumbnail"
                                className="w-full h-full object-cover absolute inset-0"
                            />
                        )}
                        <video
                            ref={videoRef}
                            src={video.video_url}
                            className={`w-full h-full object-cover ${!isHovering && video.thumbnail_url ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                            loop
                            muted
                            playsInline
                            preload="metadata"
                        />
                        {/* Play overlay */}
                        {!isHovering && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-[#2A2F3A]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                    </div>
                )}

                {/* Source Badge */}
                <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${source.bg} ${source.color} backdrop-blur-sm`}>
                    {source.label}
                </div>

                {/* Duration badge */}
                {video.duration && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[11px] font-medium text-white tabular-nums">
                        {video.duration}s
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4">
                <p className="text-sm font-medium text-white truncate mb-1.5" title={video.title}>
                    {video.title}
                </p>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[#6F7688]">
                        {video.created_at ? formatRelativeTime(video.created_at) : ''}
                    </p>
                    <span className="text-[10px] text-[#6F7688] uppercase tracking-wider">
                        {video.aspect_ratio} • {video.resolution}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                    <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#C8FF4D] text-[#1C1F26] text-sm font-semibold rounded-xl hover:bg-[#D8FF75] shadow-[0_2px_10px_rgba(200,255,77,0.25)] hover:shadow-[0_4px_16px_rgba(200,255,77,0.4)] transition-all duration-150"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function LibraryPage() {
    const router = useRouter();
    const { data: videos, isLoading, isError } = useLibraryVideos();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredVideos = (videos || []).filter(v => {
        const matchSearch = !search || v.title?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || v.source === filter;
        return matchSearch && matchFilter;
    });

    // Count sources for filter badges
    const counts = {
        all: videos?.length || 0,
        script_to_video: videos?.filter(v => v.source === 'script_to_video').length || 0,
        ai_video: videos?.filter(v => v.source === 'ai_video').length || 0,
        trending_video: videos?.filter(v => v.source === 'trending_video').length || 0,
        classic: videos?.filter(v => v.source === 'classic').length || 0,
    };

    const FILTERS: { value: FilterType; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'trending_video', label: 'Trending' },
        { value: 'ai_video', label: 'AI Video' },
        { value: 'script_to_video', label: 'Script' },
        { value: 'classic', label: 'Classic' },
    ].filter(f => f.value === 'all' || counts[f.value] > 0);

    return (
        <AppLayout>
            <div className="min-h-screen bg-[#0B0D12] py-6 md:py-8 xl:py-10 pb-20 md:pb-8">
                <div className="container mx-auto px-4 md:px-6 xl:px-8 max-w-7xl">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-[28px] xl:text-[32px] font-bold text-white tracking-tight">Video Library</h1>
                            <p className="text-[#A1A8B8] text-sm mt-1">All your generated videos in one place</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 md:w-64">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7688]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    placeholder="Search videos..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#161A21] border border-[#1D222B] rounded-xl text-sm text-white placeholder-[#6F7688] focus:outline-none focus:border-[#C8FF4D]/40 focus:shadow-[0_0_0_1px_rgba(200,255,77,0.2)] transition-all"
                                />
                            </div>
                            <Button variant="primary" onClick={() => router.push('/trending')}>
                                Create New
                            </Button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    {FILTERS.length > 1 && (
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                            {FILTERS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${filter === f.value
                                        ? 'bg-[#C8FF4D] text-[#1C1F26] shadow-[0_0_12px_rgba(200,255,77,0.3)]'
                                        : 'bg-[#161A21] text-[#A1A8B8] hover:text-white border border-[#1D222B] hover:border-[#C8FF4D]/30'
                                        }`}
                                >
                                    {f.label}
                                    <span className={`ml-1.5 ${filter === f.value ? 'text-[#1C1F26]/60' : 'text-[#6F7688]'}`}>
                                        {counts[f.value]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="rounded-2xl overflow-hidden bg-[#161A21] border border-[#1D222B]">
                                    <div className="aspect-[9/16] max-h-[340px] bg-[#1C1F26] animate-pulse" />
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 bg-[#1C1F26] rounded animate-pulse w-3/4" />
                                        <div className="h-3 bg-[#1C1F26] rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="text-center py-16 px-6 bg-[#161A21] border border-red-900/30 rounded-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">Failed to load videos</h3>
                            <p className="text-[#A1A8B8] mb-6">Please try again later.</p>
                            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-20 h-20 bg-gradient-to-b from-[#262b38] to-[#222631] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(200,255,77,0.08)]">
                                <svg className="w-10 h-10 text-[#C8FF4D]/50" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {search ? 'No videos match your search' : 'No videos yet'}
                            </h3>
                            <p className="text-[#A1A8B8] mb-8 text-sm max-w-sm mx-auto">
                                {search ? 'Try a different keyword' : 'Create your first AI video now — it only takes a few seconds!'}
                            </p>
                            {!search && (
                                <Button variant="primary" onClick={() => router.push('/trending')}>
                                    Create Your First Video
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            {filteredVideos.map((video) => (
                                <LibraryVideoCard key={video.id} video={video} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
