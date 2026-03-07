'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WelcomeModal from '@/components/dashboard/WelcomeModal';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useUserStore();

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            router.push('/auth/login');
        }
    }, [user, router]);

    if (!user) {
        return null;
    }

    // Mock data for demo
    const recentVideos = [];

    return (
        <div className="min-h-screen bg-[#0F1115] py-6 md:py-8 xl:py-12 pb-20 md:pb-0">
            <div className="container mx-auto px-4 md:px-6 xl:px-8">
                {/* Welcome Modal */}
                <WelcomeModal />

                {/* Header */}
                <div className="mb-6 md:mb-8 xl:mb-12">
                    <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold text-white mb-2">
                        Welcome back, {user.name}!
                    </h1>
                    <p className="text-gray-400">Ready to create your next viral video?</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 md:mb-8 xl:mb-12">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Credits Remaining</p>
                                <p className="text-3xl font-bold text-accent">{user.credits}</p>
                            </div>
                            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <Link href="/pricing" className="mt-4 block">
                            <Button variant="outline" size="sm" className="w-full">
                                Buy More Credits
                            </Button>
                        </Link>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Videos Created</p>
                                <p className="text-3xl font-bold text-white">{recentVideos.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                                <p className="text-3xl font-bold text-white">Free</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <Link href="/pricing" className="mt-4 block">
                            <Button variant="primary" size="sm" className="w-full">
                                Upgrade Plan
                            </Button>
                        </Link>
                    </Card>
                </div>

                {/* Create New Video CTA */}
                <Card glow className="mb-6 md:mb-8 xl:mb-12">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="mb-6 md:mb-0">
                            <h2 className="text-2xl font-bold text-white mb-2">Create Your Next Video</h2>
                            <p className="text-gray-400">
                                Choose from 12+ presets and let AI handle the rest
                            </p>
                        </div>
                        <Link href="/trending">
                            <Button variant="primary" size="lg">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Create New Video
                            </Button>
                        </Link>
                    </div>
                </Card>

                {/* Recent Videos */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Your Videos</h2>
                        <Link href="/library">
                            <Button variant="ghost" size="sm">
                                View All
                            </Button>
                        </Link>
                    </div>

                    {recentVideos.length === 0 ? (
                        <Card>
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No videos yet</h3>
                                <p className="text-gray-400 mb-6">
                                    Create your first AI-powered video to get started
                                </p>
                                <Link href="/trending">
                                    <Button variant="primary">
                                        Create Your First Video
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {/* Video cards will be rendered here */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
