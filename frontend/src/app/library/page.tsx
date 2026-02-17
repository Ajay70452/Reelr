'use client';

import { useRouter } from 'next/navigation';
import { useVideos } from '@/hooks/useApi';
import VideoCard from '@/components/video/VideoCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useState } from 'react';

export default function LibraryPage() {
    const router = useRouter();
    const { data: videos, isLoading, isError } = useVideos();
    const [search, setSearch] = useState('');

    const filteredVideos = videos?.filter(v =>
        v.title?.toLowerCase().includes(search.toLowerCase()) ||
        v.resolution.includes(search)
    ) || [];

    const handleDelete = (id: string) => {
        // TODO: Implement delete mutation
        console.log('Delete video', id);
    };

    return (
        <div className="min-h-screen bg-[#0F1115] py-6 md:py-8 xl:py-12 pb-20 md:pb-0">
            <div className="container mx-auto px-4 md:px-6 xl:px-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl xl:text-3xl font-bold text-white mb-2">Video Library</h1>
                        <p className="text-gray-400">Manage all your generated videos</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-full md:w-64">
                            <Input
                                placeholder="Search videos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-gray-900 border-gray-800"
                            />
                        </div>
                        <Button variant="primary" onClick={() => router.push('/create')}>
                            Create New
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-video bg-gray-900 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : isError ? (
                    <Card className="text-center p-12 bg-red-900/10 border-red-900/30">
                        <h3 className="text-xl font-bold text-white mb-2">Failed to load videos</h3>
                        <p className="text-gray-400 mb-6">Please try again later.</p>
                        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                    </Card>
                ) : filteredVideos.length === 0 ? (
                    <Card className="text-center p-12">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {search ? 'No videos match your search' : 'No videos yet'}
                        </h3>
                        <p className="text-gray-400 mb-6">
                            {search ? 'Try a different keyword' : 'Create your first AI video now'}
                        </p>
                        {!search && (
                            <Button variant="primary" onClick={() => router.push('/create')}>
                                Create First Video
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map((video) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
