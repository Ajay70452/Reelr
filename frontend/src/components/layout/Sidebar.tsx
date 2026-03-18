'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useUserCredits } from '@/hooks/useApi';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Icons as components
function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    );
}

function VideoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
        </svg>
    );
}

function SeriesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
    );
}

function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    );
}

function LibraryIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
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

function CreditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
    );
}

function ChevronIcon({ className, direction = 'down' }: { className?: string; direction?: 'up' | 'down' }) {
    return (
        <svg className={`${className} transition-transform ${direction === 'up' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

function DocumentTextIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
    );
}

function FireIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    );
}

interface NavItemProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isLocked?: boolean;
    onLockedClick?: () => void;
}

function NavItem({ href, icon, label, isActive, isLocked, onLockedClick }: NavItemProps) {
    if (isLocked) {
        return (
            <button
                onClick={onLockedClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-[#222631]/50 transition-all duration-200 group"
            >
                <span className="w-5 h-5">{icon}</span>
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                <LockIcon className="w-4 h-4 text-gray-600" />
            </button>
        );
    }

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                ? 'sidebar-active-glow text-[#C8FF4D]'
                : 'text-gray-300 hover:text-white hover:bg-[#222631]'
                }`}
        >
            <span className={`w-5 h-5 ${isActive ? 'text-[#C8FF4D]' : 'text-gray-400 group-hover:text-white'}`}>
                {icon}
            </span>
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout, updateCredits } = useUserStore();
    const [seriesModalOpen, setSeriesModalOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    // Fetch credits from backend API
    const { data: creditsData } = useUserCredits();

    // Update store when credits are fetched
    useEffect(() => {
        if (creditsData?.credits !== undefined) {
            updateCredits(creditsData.credits);
        }
    }, [creditsData, updateCredits]);

    // Close sidebar on route change (for mobile/tablet)
    useEffect(() => {
        onClose?.();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    const sidebarContent = (
        <aside className="h-full w-64 bg-[#1C1F26] border-r border-[rgba(255,255,255,0.04)] flex flex-col">
            {/* Brand Header */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
                <Link href="/generate/video" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C8FF4D] rounded-xl flex items-center justify-center shadow-lg shadow-[rgba(200,255,77,0.2)]">
                        <span className="text-[#1C1F26] font-bold text-xl">C</span>
                    </div>
                    <span className="text-xl font-bold text-white">Reelr</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                {/* Generate Section */}
                <div>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-[#6E7685] tracking-wider">
                        Generate
                    </h3>
                    <div className="space-y-1">
                        <NavItem
                            href="/generate/image"
                            icon={<ImageIcon className="w-5 h-5" />}
                            label="AI Image Generator"
                            isActive={isActive('/generate/image')}
                        />
                        <NavItem
                            href="/generate/video"
                            icon={<VideoIcon className="w-5 h-5" />}
                            label="AI Video Generator"
                            isActive={isActive('/generate/video')}
                        />
                        <NavItem
                            href="/generate/script-to-video"
                            icon={<DocumentTextIcon className="w-5 h-5" />}
                            label="Script to Video"
                            isActive={isActive('/generate/script-to-video')}
                        />
                    </div>
                </div>

                {/* Trending Section */}
                <div>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-[#6E7685] tracking-wider">
                        Trending
                    </h3>
                    <div className="space-y-1">
                        <NavItem
                            href="/trending"
                            icon={<FireIcon className="w-5 h-5" />}
                            label="Trending Video"
                            isActive={isActive('/trending')}
                        />
                    </div>
                </div>

                {/* My Stuff Section */}
                <div>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-[#6E7685] tracking-wider">
                        My Stuff
                    </h3>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard"
                            icon={<HomeIcon className="w-5 h-5" />}
                            label="Dashboard"
                            isActive={isActive('/dashboard')}
                        />
                        <NavItem
                            href="/library"
                            icon={<LibraryIcon className="w-5 h-5" />}
                            label="Library"
                            isActive={isActive('/library')}
                        />
                    </div>
                </div>

                {/* Automations Section */}
                <div>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-[#6E7685] tracking-wider">
                        Automations
                    </h3>
                    <div className="space-y-1">
                        <NavItem
                            href="/automations/series"
                            icon={<SeriesIcon className="w-5 h-5" />}
                            label="Series"
                            isActive={false}
                            isLocked={true}
                            onLockedClick={() => setSeriesModalOpen(true)}
                        />
                    </div>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.04)] space-y-3">
                {/* Credits */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#222631] rounded-lg">
                    <div className="flex items-center gap-2">
                        <CreditIcon className="w-5 h-5 text-accent" />
                        <span className="text-sm text-gray-300">Credits</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{user?.credits ?? 0}</span>
                </div>

                {/* Upgrade CTA */}
                {user?.plan === 'free' && (
                    <Link href="/pricing">
                        <Button variant="outline" size="sm" className="w-full">
                            Upgrade Plan
                        </Button>
                    </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#222631] transition-all duration-200"
                    >
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium truncate">{user?.name || user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.plan || 'Free'} Plan</p>
                        </div>
                        <ChevronIcon className="w-4 h-4" direction={profileDropdownOpen ? 'up' : 'down'} />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-[#222631] border border-[#2F3442] rounded-lg shadow-xl overflow-hidden">
                            <Link
                                href="/settings"
                                className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#262B38] transition-colors"
                                onClick={() => setProfileDropdownOpen(false)}
                            >
                                Settings
                            </Link>
                            <Link
                                href="/billing"
                                className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#262B38] transition-colors"
                                onClick={() => setProfileDropdownOpen(false)}
                            >
                                Billing
                            </Link>
                            <button
                                onClick={() => {
                                    setProfileDropdownOpen(false);
                                    logout();
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[#262B38] transition-colors border-t border-[#2F3442]"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );

    return (
        <>
            {/* Desktop: always visible fixed sidebar */}
            <div className="hidden xl:block fixed left-0 top-0 h-screen z-40">
                {sidebarContent}
            </div>

            {/* Tablet/Mobile: overlay drawer */}
            <div className="xl:hidden">
                {/* Backdrop */}
                {isOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
                        onClick={onClose}
                    />
                )}
                {/* Drawer */}
                <div
                    className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    {/* Close button */}
                    {isOpen && (
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-[-44px] w-9 h-9 bg-[#1C1F26] border border-[rgba(255,255,255,0.08)] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-50"
                            aria-label="Close sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {sidebarContent}
                </div>
            </div>

            {/* Series Coming Soon Modal */}
            <Modal
                isOpen={seriesModalOpen}
                onClose={() => setSeriesModalOpen(false)}
                title="Series Automation"
                size="sm"
            >
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                        <SeriesIcon className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
                    <p className="text-gray-400 mb-6">
                        Series automation is coming soon. Start by generating content and we&apos;ll notify you when this feature is ready.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => setSeriesModalOpen(false)}
                        >
                            Close
                        </Button>
                        <Link href="/generate/video" className="flex-1">
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => setSeriesModalOpen(false)}
                            >
                                Generate Video
                            </Button>
                        </Link>
                    </div>
                </div>
            </Modal>
        </>
    );
}
