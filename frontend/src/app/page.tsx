import Hero from '@/components/landing/Hero'
import VideoGrid from '@/components/landing/VideoGrid'
import HowItWorks from '@/components/landing/HowItWorks'
import WhyChoose from '@/components/landing/WhyChoose'
import EasyVideos from '@/components/landing/EasyVideos'
import AITools from '@/components/landing/AITools'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-bg text-text-primary">
      <Hero />
      <VideoGrid />
      <HowItWorks />
      <WhyChoose />
      <EasyVideos />
      <AITools />
      <Pricing />
      <FAQ />
    </main>
  )
}

