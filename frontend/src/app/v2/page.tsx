import type { Metadata } from 'next'
import { Suspense } from 'react'
import LandingPageV2 from '@/components/landing/v2/LandingPageV2'

export const metadata: Metadata = {
  title: 'Create Viral AI Dance Reels From Your Photo | Reelr',
  description:
    'Upload your photo, choose a trending dance style, and generate a ready-to-post AI reel for Instagram, TikTok, or Facebook in minutes. Start for free.',
}

export default function LandingV2Page() {
  return (
    <Suspense>
      <LandingPageV2 />
    </Suspense>
  )
}
