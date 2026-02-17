'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useVideoJob } from '@/hooks/useApi';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function JobStatusPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.jobId as string;

    const { data: job, error, isError } = useVideoJob(jobId);
    const [dots, setDots] = useState('');

    // Animated dots for "Processing..."
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Redirect on completion
    useEffect(() => {
        if (job?.status === 'completed' && job.video_id) {
            // Optional: Delay slightly for effect
            setTimeout(() => {
                router.push(`/video/${job.video_id}`);
            }, 1000);
        }
    }, [job, router]);

    if (isError) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 md:px-6 xl:px-8 pb-20 md:pb-0">
                <Card className="max-w-md w-full text-center p-8 border-red-900/50 bg-red-900/10">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Job</h2>
                    <p className="text-gray-400 mb-6">{error instanceof Error ? error.message : 'Something went wrong finding this job.'}</p>
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    // Calculate current step based on progress or stage string
    const getStepStatus = (stepName: string) => {
        const stage = job?.current_stage || 'queued';

        // Simple logic: if progress is high enough, previous steps are done
        // Real logic would depend on explicit stage names from backend
        if (!job) return 'pending';

        const stages = ['script', 'scenes', 'visuals', 'audio', 'render', 'finalize'];
        const currentIdx = stages.indexOf(stage) !== -1 ? stages.indexOf(stage) : 0;
        const stepIdx = stages.indexOf(stepName);

        if (job.status === 'completed') return 'completed';
        if (currentIdx > stepIdx) return 'completed';
        if (currentIdx === stepIdx) return 'active';
        return 'pending';
    };

    const steps = [
        { id: 'script', label: 'Generating Script' },
        { id: 'visuals', label: 'Creating Visuals' }, // combining scenes + visuals
        { id: 'audio', label: 'Synthesizing Audio' },
        { id: 'render', label: 'Rendering Video' }
    ];

    return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center px-4 md:px-6 xl:px-8 pb-20 md:pb-0">
            <div className="max-w-xl w-full">
                {/* Status Card */}
                <Card className="p-8 border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 mb-6 relative">
                            {/* Spinning border if processing */}
                            {(job?.status === 'processing' || job?.status === 'queued') && (
                                <div className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin"></div>
                            )}

                            <span className="text-3xl">
                                {job?.status === 'completed' ? '✅' :
                                    job?.status === 'failed' ? '❌' :
                                        '⚡'}
                            </span>
                        </div>

                        <h1 className="text-xl md:text-2xl xl:text-3xl font-bold text-white mb-2">
                            {job?.status === 'queued' ? 'In Queue' :
                                job?.status === 'processing' ? `Generating Video${dots}` :
                                    job?.status === 'completed' ? 'Video Ready!' :
                                        job?.status === 'failed' ? 'Generation Failed' :
                                            'Loading...'}
                        </h1>

                        {job?.status === 'failed' ? (
                            <p className="text-red-400">{job.error_message || 'An unexpected error occurred.'}</p>
                        ) : (
                            <p className="text-gray-400">
                                Job ID: <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">{jobId}</span>
                            </p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {job?.status !== 'failed' && (
                        <div className="mb-6 md:mb-8 xl:mb-12">
                            <ProgressBar
                                progress={job?.progress || 0}
                                size="lg"
                                color={job?.status === 'completed' ? 'green' : 'blue'}
                            />
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>Started</span>
                                <span>{job?.progress || 0}% Complete</span>
                            </div>
                        </div>
                    )}

                    {/* Steps Visualizer */}
                    {job?.status !== 'failed' && (
                        <div className="space-y-4 mb-8">
                            {steps.map((step) => {
                                const status = getStepStatus(step.id);
                                return (
                                    <div key={step.id} className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 transition-colors ${status === 'completed' ? 'bg-accent text-white' :
                                                status === 'active' ? 'bg-accent text-white animate-pulse' :
                                                    'bg-gray-800 text-gray-500'
                                            }`}>
                                            {status === 'completed' ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span className="text-xs font-bold">{steps.indexOf(step) + 1}</span>
                                            )}
                                        </div>
                                        <div className={`font-medium ${status === 'completed' ? 'text-gray-300' :
                                                status === 'active' ? 'text-white' :
                                                    'text-gray-600'
                                            }`}>
                                            {step.label}
                                        </div>
                                        {status === 'active' && (
                                            <div className="ml-auto text-xs text-accent animate-pulse">Processing...</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push('/dashboard')}
                        >
                            Return to Dashboard
                        </Button>

                        {job?.status === 'failed' && (
                            <Button variant="primary" className="w-full" onClick={() => window.location.reload()}>
                                Retry Job
                            </Button>
                        )}

                        {job?.status === 'completed' && (
                            <Button variant="primary" className="w-full" onClick={() => router.push(`/video/${job.video_id}`)}>
                                Watch Video
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Support Link */}
                <p className="text-center mt-8 text-gray-500 text-sm">
                    Taking longer than expected? <a href="#" className="underline hover:text-white">Contact Support</a>
                </p>
            </div>
        </div>
    );
}
