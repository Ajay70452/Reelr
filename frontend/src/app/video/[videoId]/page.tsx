'use client';

import { useParams, useRouter } from 'next/navigation';
import { useVideo } from '@/hooks/useApi';
import VideoPlayer from '@/components/video/VideoPlayer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDuration, formatFileSize } from '@/lib/utils';
import { useState } from 'react';

export default function VideoCompletePage() {
    const router = useRouter();
    const params = useParams();
    const videoId = params.videoId as string;
    const { data: video, isLoading, isError } = useVideo(videoId);
    const [copied, setCopied] = useState(false);

    // Mock related actions
    const handleCopyLink = () => {
        // In production: `${window.location.origin}/share/${videoId}`
        const link = window.location.href;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (isError || !video) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 md:px-6 xl:px-8 pb-20 md:pb-0">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Video Not Found</h1>
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F1115] pb-20 md:pb-0">
            <div className="container mx-auto px-4 md:px-6 xl:px-8 py-6 md:py-8 max-w-6xl">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl xl:text-3xl font-bold text-white mb-2">{video.title || 'Untitled Video'}</h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {formatDuration(video.duration)}
                            </span>
                            <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                {video.resolution}
                            </span>
                            <Badge variant="success" size="sm">Completed</Badge>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="outline" onClick={handleCopyLink}>
                            {copied ? 'Copied!' : 'Share Link'}
                        </Button>
                        <a href={video.video_url} download target="_blank" rel="noopener noreferrer">
                            <Button variant="primary">
                                Download MP4
                            </Button>
                        </a>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Main Video Player */}
                    <div className="lg:col-span-2 space-y-6">
                        <VideoPlayer src={video.video_url} autoplay controls />

                        {/* Script / Details */}
                        <Card>
                            <h3 className="text-xl font-bold text-white mb-4">Prompt & Details</h3>
                            <div className="space-y-4">
                                <div className="bg-gray-800 p-4 rounded-lg">
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Video URL</label>
                                    <div className="flex items-center justify-between mt-1">
                                        <code className="text-accent text-sm truncate mr-4">{video.video_url}</code>
                                        <button onClick={handleCopyLink} className="text-gray-400 hover:text-white">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-semibold">File Size</label>
                                        <p className="text-white">{formatFileSize(video.file_size)}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-semibold">Created At</label>
                                        <p className="text-white">{new Date(video.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar / Upsell */}
                    <div className="space-y-6">
                        <Card glow className="bg-gradient-to-br from-gray-900 to-[#0F1115] border-accent/30">
                            <h3 className="text-xl font-bold text-white mb-2">Create Next Video</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Ready to make another viral hit? Try a different style or topic.
                            </p>
                            <Button variant="primary" className="w-full" onClick={() => router.push('/create')}>
                                Start New Project
                            </Button>
                        </Card>

                        <Card>
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-accent/20 rounded-lg">
                                    <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white">Go Pro?</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                Upgrade to get 200 credits, HD 4K rendering, and priority queue skipping.
                            </p>
                            <Button variant="outline" className="w-full" onClick={() => router.push('/pricing')}>
                                View Upgrade Options
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
