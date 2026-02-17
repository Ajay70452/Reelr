'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { setUser } = useUserStore();

    useEffect(() => {
        const handleCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Auth callback error:', error);
                router.push('/auth/login?error=auth_failed');
                return;
            }

            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
                    credits: 0,
                    plan: 'free',
                });
                router.push('/generate/video');
            } else {
                router.push('/auth/login');
            }
        };

        handleCallback();
    }, [router, setUser]);

    return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Signing you in...</p>
            </div>
        </div>
    );
}
