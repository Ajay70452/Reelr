'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if user has seen the welcome modal
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setIsOpen(true);
        }
    }, []);

    const handleGetStarted = () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        setIsOpen(false);
        router.push('/create');
    };

    const handleClose = () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Welcome to ClipKing! 🎬">
            <div className="space-y-4">
                <p className="text-gray-300">
                    You're all set to create amazing AI-powered videos! Here's what you can do:
                </p>

                <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-lg">1</span>
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Choose Your Genre</h4>
                            <p className="text-sm text-gray-400">Pick from motivation, business, psychology, and more</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-lg">2</span>
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Select Visual Style</h4>
                            <p className="text-sm text-gray-400">Moving images or cinematic AI video with multiple presets</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-lg">3</span>
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Customize & Generate</h4>
                            <p className="text-sm text-gray-400">Add voice, music, and settings - then let AI do the magic!</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex space-x-3">
                    <Button variant="primary" onClick={handleGetStarted} className="flex-1">
                        Create My First Video
                    </Button>
                    <Button variant="ghost" onClick={handleClose}>
                        Maybe Later
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
