'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';

function SeriesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
    );
}

function LockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    );
}

function RocketIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
    );
}

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}

const FEATURES = [
    {
        icon: CalendarIcon,
        title: 'Scheduled Publishing',
        description: 'Schedule your videos to post automatically at optimal times',
    },
    {
        icon: RocketIcon,
        title: 'Batch Generation',
        description: 'Create multiple videos at once with consistent branding',
    },
    {
        icon: ChartIcon,
        title: 'Analytics Dashboard',
        description: 'Track performance across all your content series',
    },
];

export default function SeriesPage() {
    return (
        <AppLayout>
            <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 xl:px-8 py-6 md:py-8 xl:py-12 pb-20 md:pb-0">
                {/* Main Card */}
                <div className="max-w-2xl w-full text-center">
                    {/* Icon */}
                    <div className="relative inline-block mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent/20 to-accent-hover/20 rounded-3xl flex items-center justify-center">
                            <SeriesIcon className="w-12 h-12 text-accent" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center">
                            <LockIcon className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-xl md:text-2xl xl:text-3xl font-bold text-white mb-3">
                        Series Automation
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full mb-6">
                        <span className="text-sm font-medium text-accent">Coming Soon</span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
                        Automate your content creation workflow. Generate entire video series, schedule posts, and grow your audience on autopilot.
                    </p>

                    {/* Features Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6 md:mb-8 xl:mb-10">
                        {FEATURES.map((feature, index) => (
                            <div
                                key={index}
                                className="p-5 bg-gray-900/50 border border-gray-800 rounded-xl text-left"
                            >
                                <feature.icon className="w-8 h-8 text-gray-500 mb-3" />
                                <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                                <p className="text-sm text-gray-500">{feature.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Waitlist / CTA */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Get Early Access
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Be the first to know when Series automation launches. We&apos;ll notify you via email.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-all"
                            />
                            <Button variant="secondary">
                                Notify Me
                            </Button>
                        </div>
                    </div>

                    {/* Alternative CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <p className="text-gray-500 text-sm">In the meantime, start generating content:</p>
                        <div className="flex gap-3">
                            <Link href="/generate/video">
                                <Button variant="primary" size="sm">
                                    Generate Video
                                </Button>
                            </Link>
                            <Link href="/generate/image">
                                <Button variant="outline" size="sm">
                                    Generate Image
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Preview Screenshot (placeholder) */}
                <div className="mt-16 max-w-4xl w-full">
                    <div className="aspect-video bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                    <SeriesIcon className="w-8 h-8 text-gray-600" />
                                </div>
                                <p className="text-gray-600 text-sm">Series Dashboard Preview</p>
                            </div>
                        </div>
                        {/* Blur overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
