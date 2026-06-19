'use client'

import { useEffect, useRef } from 'react'

export default function SyncedHeroVideos() {
  const leftVideoRef = useRef<HTMLVideoElement>(null)
  const rightVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const leftVideo = leftVideoRef.current
    const rightVideo = rightVideoRef.current

    if (!leftVideo || !rightVideo) return

    let started = false
    let syncTimer: ReturnType<typeof setInterval> | undefined

    const startTogether = async () => {
      if (started || leftVideo.readyState < 3 || rightVideo.readyState < 3) return

      started = true
      leftVideo.pause()
      rightVideo.pause()
      leftVideo.currentTime = 0
      rightVideo.currentTime = 0

      await Promise.allSettled([leftVideo.play(), rightVideo.play()])

      syncTimer = setInterval(() => {
        const drift = Math.abs(leftVideo.currentTime - rightVideo.currentTime)

        if (drift > 0.08) {
          rightVideo.currentTime = leftVideo.currentTime
        }

        if (!leftVideo.paused && rightVideo.paused) {
          void rightVideo.play()
        }
      }, 250)
    }

    leftVideo.addEventListener('canplay', startTogether)
    rightVideo.addEventListener('canplay', startTogether)
    void startTogether()

    return () => {
      leftVideo.removeEventListener('canplay', startTogether)
      rightVideo.removeEventListener('canplay', startTogether)
      if (syncTimer) clearInterval(syncTimer)
    }
  }, [])

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="relative aspect-[4/5] bg-dark-surface2 overflow-hidden border border-dark-surface3">
        <video
          ref={leftVideoRef}
          src="/videos/hero-2.mp4"
          aria-label="Reference trend video"
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 px-3 py-1 bg-dark-bg/80 text-xs font-bold text-primary uppercase tracking-wider">
          Trend
        </div>
      </div>
      <div className="relative aspect-[4/5] bg-dark-surface2 overflow-hidden border border-primary shadow-glow-lime">
        <video
          ref={rightVideoRef}
          src="/videos/hero-1.mp4"
          aria-label="Generated trend video"
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 px-3 py-1 bg-primary text-xs font-bold text-dark-bg uppercase tracking-wider">
          Yours
        </div>
      </div>
    </div>
  )
}
