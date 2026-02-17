'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useUserStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password');

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (data.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email || email,
                    name: data.user.user_metadata?.name || email.split('@')[0],
                    credits: 0,
                    plan: 'free',
                });
                router.push('/generate/video');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { error: authError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            setMagicLinkSent(true);
        } catch (err) {
            setError('Failed to send magic link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (authError) {
            setError(authError.message);
        }
    };

    if (magicLinkSent) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
                    <p className="text-gray-400 mb-8">
                        We&apos;ve sent a magic link to <span className="text-accent">{email}</span>.
                        Click the link to log in.
                    </p>
                    <button
                        onClick={() => setMagicLinkSent(false)}
                        className="text-sm text-gray-500 hover:text-gray-300"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Log in to continue creating amazing videos</p>
                </div>

                {/* Login Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
                    <form
                        onSubmit={loginMode === 'password' ? handlePasswordLogin : handleMagicLink}
                        className="space-y-4"
                    >
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        {loginMode === 'password' && (
                            <Input
                                label="Password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        )}

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            {loginMode === 'password' ? 'Log In' : 'Send Magic Link'}
                        </Button>
                    </form>

                    {/* Toggle login mode */}
                    <button
                        type="button"
                        onClick={() => {
                            setLoginMode(loginMode === 'password' ? 'magic' : 'password');
                            setError('');
                        }}
                        className="w-full mt-3 text-sm text-gray-400 hover:text-accent transition-colors"
                    >
                        {loginMode === 'password'
                            ? 'Use magic link instead'
                            : 'Use password instead'}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Google</span>
                    </button>

                    {/* Sign up link */}
                    <p className="mt-6 text-center text-sm text-gray-400">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/signup" className="text-accent hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
