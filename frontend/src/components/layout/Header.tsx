'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import Button from '@/components/ui/Button';

export default function Header() {
    const pathname = usePathname();
    const { user, logout } = useUserStore();

    const isActive = (path: string) => pathname === path;
    const isLandingV2 = pathname === '/v2';
    const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/library') || pathname.startsWith('/trending') || pathname.startsWith('/generate') || pathname.startsWith('/automations');

    return (
        <header className={`sticky top-0 z-40 w-full border-b border-[#1D222B] bg-[#0F1115]/95 backdrop-blur-sm ${user && isDashboardRoute ? 'hidden xl:block' : ''}`}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-hover rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">C</span>
                    </div>
                    <span className="text-xl font-bold text-white">Reelr</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                    {user ? (
                        <>
                            <Link
                                href="/dashboard"
                                className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-accent' : 'text-gray-300 hover:text-white'
                                    }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/library"
                                className={`text-sm font-medium transition-colors ${isActive('/library') ? 'text-accent' : 'text-gray-300 hover:text-white'
                                    }`}
                            >
                                Library
                            </Link>
                            <Link
                                href="/trending"
                                className={`text-sm font-medium transition-colors ${pathname.startsWith('/trending') || pathname.startsWith('/generate') ? 'text-accent' : 'text-gray-300 hover:text-white'
                                    }`}
                            >
                                Create
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Features
                            </Link>
                            <Link href="/#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Pricing
                            </Link>
                        </>
                    )}
                </nav>

                {/* Right side */}
                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            {/* Credits */}
                            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-[#161A21] rounded-lg">
                                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-white">{user.credits}</span>
                            </div>

                            {/* Right side items */}                        </>
                    ) : (
                        <>
                            <Link href="/auth/login">
                                <Button variant="ghost" size="sm">
                                    Login
                                </Button>
                            </Link>
                            <Link href="/auth/signup">
                                <Button variant="primary" size="sm">
                                    {isLandingV2 ? 'Get Started for Free' : 'Get Started'}
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
