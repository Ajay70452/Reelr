'use client';

import { useRef, useEffect } from 'react';

interface VideoPlayerProps {
    src: string;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
}

export default function VideoPlayer({
    src,
    autoplay = false,
    controls = true,
    loop = false,
    muted = false,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (autoplay && videoRef.current) {
            videoRef.current.play().catch((error) => {
                console.error('Autoplay failed:', error);
            });
        }
    }, [autoplay, src]);

    return (
        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl">
            <video
                ref={videoRef}
                src={src}
                controls={controls}
                loop={loop}
                muted={muted}
                className="w-full h-auto"
                playsInline
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
