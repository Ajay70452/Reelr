'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
    const router = useRouter();
    const { setUser } = useUserStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        name: email.split('@')[0],
                    },
                },
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            // If email confirmation is disabled in Supabase, user is signed in immediately
            if (data.session) {
                setUser({
                    id: data.user!.id,
                    email: data.user!.email || email,
                    name: email.split('@')[0],
                    credits: 10,
                    plan: 'free',
                });
                setSuccess(true);
                setTimeout(() => router.push('/generate/video'), 2000);
            } else {
                // Email confirmation required
                setSuccess(true);
            }
        } catch (err) {
            setError('Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
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

    if (success) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
                    <p className="text-gray-400 mb-8">
                        Welcome to Reelr! You&apos;ve been given <span className="text-accent font-semibold">10 free credits</span> to get started.
                    </p>
                    <div className="animate-pulse text-sm text-gray-500">
                        Redirecting to generator...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Get Started Free</h1>
                    <p className="text-gray-400">Create your account and start making videos</p>
                </div>

                {/* Signup Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Repeat your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Create Account
                        </Button>
                    </form>

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
                        onClick={handleGoogleSignup}
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

                    {/* Terms */}
                    <p className="mt-6 text-xs text-center text-gray-500">
                        By signing up, you agree to our{' '}
                        <a href="#" className="text-accent hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-accent hover:underline">Privacy Policy</a>
                    </p>

                    {/* Login link */}
                    <p className="mt-4 text-center text-sm text-gray-400">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-accent hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-accent mb-1">10</div>
                        <div className="text-xs text-gray-400">Free Credits</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-accent mb-1">12+</div>
                        <div className="text-xs text-gray-400">Presets</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-accent mb-1">2min</div>
                        <div className="text-xs text-gray-400">Avg Render</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
