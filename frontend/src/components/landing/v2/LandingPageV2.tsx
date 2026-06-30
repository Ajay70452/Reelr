'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SyncedHeroVideos from '@/components/landing/SyncedHeroVideos'

const SIGNUP_PATH = '/auth/signup'

const templateVideos = [
  {
    id: 1,
    title: 'Shakira',
    label: 'shakira',
    image: '/landing/1.png',
  },
  {
    id: 2,
    title: 'Match-Day Walk',
    label: 'match-day walk',
    image: '/landing/2.png',
  },
  {
    id: 3,
    title: 'Fan Reaction',
    label: 'fan reaction',
    image: '/landing/3.png',
  },
  {
    id: 4,
    title: 'Victory Edit',
    label: 'victory edit',
    image: '/landing/4.png',
  },
  {
    id: 5,
    title: 'Country Colors',
    label: 'country colors',
    image: '/landing/5.png',
  },
  {
    id: 6,
    title: 'Football Fit Check',
    label: 'football fit check',
    image: '/landing/6.png',
  },
]

const paidPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For trying Reelr with a few trend videos.',
    price: '$9',
    interval: 'week',
    credits: 100,
    highlighted: false,
    features: ['Create AI trend videos', '9:16 exports', 'Standard generation'],
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'For creators posting more often.',
    price: '$19',
    interval: 'month',
    credits: 300,
    highlighted: true,
    features: ['Everything in Starter', 'More monthly credits', 'Priority access to new templates'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For heavier short-form creation.',
    price: '$49',
    interval: 'month',
    credits: 900,
    highlighted: false,
    features: ['Everything in Creator', 'Higher volume creation', 'Best for client or brand work'],
  },
]

const howItWorksSteps = [
  {
    step: 'Step 1',
    title: 'Pick a viral format',
    description:
      'Start with a trending theme or paste a public short-form video link as your motion source.',
    image: '/images/dance-1.png',
  },
  {
    step: 'Step 2',
    title: 'Upload your photo',
    description:
      'Add the person, product, or character you want to place inside the trend.',
    image: '/images/dance-2.png',
  },
  {
    step: 'Step 3',
    title: 'Generate the video',
    description:
      'Reelr creates a downloadable short video with matched motion, camera feel, and timing.',
    image: '/images/dance-3.png',
  },
]

const focusVideos = [
  {
    title: 'Shakira Dai Dai',
    src: '/videos/hero-1.mp4',
  },
  {
    title: 'Fan Cam',
    src: '/videos/hero-2.mp4',
  },
]

const whyChooseFeatures = [
  {
    title: 'Built for viral moments',
    description:
      'Create content while the trend is still hot, from match reactions to celebration edits.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'One-photo creation',
    description:
      'No camera setup, no choreography, no editing timeline. Start with a photo and generate a short video.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
  },
  {
    title: 'Flexible for creators',
    description:
      'Use football-inspired templates now, then switch back to broader viral trends whenever you want.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
]

const videoStats = [
  { value: '5s / 8s / 10s', label: 'short trend formats' },
  { value: '9:16 first', label: 'made for Reels, Shorts, and TikTok' },
  { value: '2 flows', label: 'pick a theme or bring your own clip' },
]

const tools = [
  {
    title: 'Trend Templates',
    description: 'Start from ready-made viral formats and generate with one image.',
  },
  {
    title: 'Image to Video',
    description: 'Turn a static photo into a moving short-form clip.',
  },
  {
    title: 'Motion Control',
    description: 'Use a reference clip or URL to guide the movement.',
  },
  {
    title: 'Custom Prompt',
    description: 'Describe the trend video you want when presets are not enough.',
  },
  {
    title: 'Product Shorts',
    description: 'Create trend-style clips for products, offers, and UGC ideas.',
  },
  {
    title: 'Download & Share',
    description: 'Export your generated short and post it wherever you want.',
  },
]

const faqTabs = ['General', 'Pricing', 'Application', 'Other']

const faqData: Record<string, { question: string; answer: string }[]> = {
  General: [
    {
      question: 'What is Reelr?',
      answer:
        'Reelr is an AI trend video generator. It helps you recreate short-form video trends using your own image, a selected theme, or a reference clip.',
    },
    {
      question: 'How do trending themes work?',
      answer:
        'Pick a preset trend, upload your image, choose intensity, duration, and aspect ratio, then generate. The theme already contains the motion and camera direction.',
    },
    {
      question: 'Can I create my own trend?',
      answer:
        'Yes. Create Your Own mode lets you upload a reference image and a motion reference video, or paste a supported public short-form video link.',
    },
    {
      question: 'How long does generation take?',
      answer:
        'Most generations depend on the external video model and can take around 30 to 90 seconds. The app shows progress while your video is being prepared.',
    },
    {
      question: 'What formats can I export?',
      answer:
        'Reelr focuses on short-form formats first, especially 9:16 for TikTok, Instagram Reels, and YouTube Shorts. Square and landscape options are also supported in the generator.',
    },
    {
      question: 'Am I the owner of the videos?',
      answer:
        'You can download the generated videos and use them for your own social channels or client work, subject to the rights of any reference media you provide.',
    },
    {
      question: 'Do I need to write prompts?',
      answer:
        'No prompt is required for trending themes. Custom mode is available when you want more control over the motion or style.',
    },
    {
      question: 'Is Reelr only for football videos right now?',
      answer:
        'No. Reelr is an AI viral video creator for many types of short-form trends. Right now, we are putting extra focus on football and World Cup-inspired trends because they are dominating social media.',
    },
    {
      question: 'Can I create World Cup-inspired fan videos?',
      answer:
        'Yes. You can create football-inspired fan videos, celebration edits, reactions, and match-day content using your own photo.',
    },
    {
      question: 'Is Reelr affiliated with FIFA?',
      answer:
        'No. Reelr is an independent AI video creation tool and is not affiliated with FIFA or any official tournament organization.',
    },
    {
      question: 'Can I cancel my subscription at any time?',
      answer: 'Yes, you can cancel at any time.',
    },
    {
      question: 'Can I get my refund?',
      answer:
        'Yes, you will get your refund. We will count how many credits you have used, and you will get a refund for all unused credits.',
    },
  ],
  Pricing: [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and cryptocurrency payments.',
    },
    {
      question: 'Can I cancel my subscription at any time?',
      answer: 'Yes, you can cancel at any time.',
    },
    {
      question: 'Can I get my refund?',
      answer:
        'Yes, you will get your refund. We will count how many credits you have used, and you will get a refund for all unused credits.',
    },
  ],
  Application: [
    {
      question: 'How do I get started?',
      answer: 'Open Trending Video, select a theme, upload a reference image, and click Generate Video.',
    },
    {
      question: 'Can I edit videos after generation?',
      answer: 'Yes, you can preview, regenerate, download, and adjust the inputs before creating another version.',
    },
  ],
  Other: [
    {
      question: 'Do you offer customer support?',
      answer: 'Yes, we offer customer support via email and live chat.',
    },
    {
      question: 'Can I use Reelr for client work?',
      answer: 'Yes. Many users create videos for clients. Make sure any uploaded reference assets are yours to use.',
    },
  ],
}

const featuredTemplates = templateVideos.slice(0, 3)
const videoCategories = templateVideos.slice(3)

function useSignupHref() {
  const searchParams = useSearchParams()

  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lp_variant', 'v2')
    const query = params.toString()

    return query ? `${SIGNUP_PATH}?${query}` : `${SIGNUP_PATH}?lp_variant=v2`
  }, [searchParams])
}

function trackLandingEvent(eventName: string) {
  // TODO: Send this event to the active analytics provider once one is configured.
  // Suggested event names for this page: lp_v2_viewed, lp_v2_cta_clicked, lp_v2_signup_started.
  void eventName
}

function SignupCta({
  href,
  className = '',
  location,
  variant = 'primary',
}: {
  href: string
  className?: string
  location: string
  variant?: 'primary' | 'dark'
}) {
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-dark-bg hover:bg-primary-hover'
      : 'bg-dark-surface3 text-text-primary hover:bg-dark-surface1'

  return (
    <Link
      href={href}
      onClick={() => {
        trackLandingEvent('lp_v2_cta_clicked')
        trackLandingEvent('lp_v2_signup_started')
      }}
      data-analytics-event="lp_v2_cta_clicked"
      data-analytics-location={location}
      className={`inline-flex items-center justify-center font-bold transition-colors ${variantClass} ${className}`}
    >
      Get Started for Free
    </Link>
  )
}

function TemplatePreviewCard({ category }: { category: (typeof templateVideos)[number] }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden border border-dark-surface3 bg-dark-surface2">
      <Image
        src={category.image}
        alt={`${category.title} trend preview`}
        fill
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 via-dark-bg/10 to-transparent" />
      <div className="absolute left-3 top-3 bg-primary px-2 py-1 text-xs font-bold uppercase tracking-wider text-dark-bg">
        Trending
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <span className="mb-2 inline-block bg-white px-3 py-1 text-sm font-bold text-dark-bg">
          {category.label}
        </span>
        <div className="flex items-center gap-1 text-sm font-bold text-white">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
          {category.title}
        </div>
      </div>
    </div>
  )
}

function HeroV2({ signupHref }: { signupHref: string }) {
  return (
    <section className="bg-dark-bg">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-end px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid w-full items-end gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-dark-surface3 bg-dark-surface2 px-4 py-2 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Free to start AI reel maker
            </div>

            <h1 className="mb-6 text-5xl font-black leading-[0.98] text-text-primary md:text-6xl lg:text-7xl">
              Create Viral AI Dance Reels From Your Photo
            </h1>

            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
              Upload your photo, pick a trending dance style, and generate a ready-to-post reel for Instagram, TikTok, or Facebook in minutes. Start for free, no camera, no editing, and no dancing skills needed.
            </p>

            <div className="mb-3 flex flex-col gap-3 sm:flex-row">
              <SignupCta href={signupHref} location="hero" className="w-full px-9 py-4 text-lg sm:w-auto" />
              <a
                href="#how-it-works"
                className="w-full border border-dark-surface3 px-9 py-4 text-center text-lg font-bold text-text-primary transition-colors hover:border-primary sm:w-auto"
              >
                See How It Works
              </a>
            </div>

            <p className="mb-8 text-sm font-semibold text-text-muted">
              Free to try - no camera or editing skills needed.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
              <span>Upload a photo</span>
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Pick a dance style</span>
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Ready-to-post reel</span>
            </div>
          </div>

          <div className="relative">
            <SyncedHeroVideos />

            <div className="mt-4 border border-dark-surface3 bg-dark-surface2 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-text-muted">Selected template</p>
                  <p className="font-bold text-text-primary">Cinematic Walk</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-text-muted">Output</p>
                  <p className="font-bold text-primary">8s / 9:16</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-dark-surface3 bg-dark-surface1">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
            <span>Football templates</span>
            <span className="text-primary">Image to video</span>
            <span>Match-day edits</span>
            <span>Fast exports</span>
            <span className="text-primary">Free to start</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function FootballFocusSection({ signupHref }: { signupHref: string }) {
  return (
    <section id="football-trends" className="bg-dark-bg py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-primary">
              Heavy focus right now
            </div>
            <h2 className="mb-5 text-4xl font-black text-text-primary md:text-5xl">
              World Cup-inspired trends, made for fans
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary">
              Reelr helps you turn your photo into short-form videos inspired by the biggest football moments, fan reactions, celebrations, and match-day energy happening right now.
            </p>

            <div className="mt-10">
              <SignupCta href={signupHref} location="football_focus" className="px-9 py-4" />
            </div>

            <p className="mt-6 text-xs leading-relaxed text-text-muted">
              Reelr is an independent AI video creation tool and is not affiliated with FIFA or any official tournament organization.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:max-w-2xl">
            {focusVideos.map((video) => (
              <div
                key={video.src}
                className="group relative aspect-[9/16] overflow-hidden border border-dark-surface3 bg-dark-surface2 transition-colors hover:border-primary"
              >
                <video
                  src={video.src}
                  aria-label={`${video.title} preview`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 via-dark-bg/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-dark-bg">
                    {video.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection({ signupHref }: { signupHref: string }) {
  return (
    <section id="how-it-works" className="bg-dark-surface1 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-4xl text-center">
          <h2 className="mb-5 text-4xl font-black text-text-primary md:text-5xl">
            How to make an AI trend video with Reelr
          </h2>
          <p className="text-lg leading-relaxed text-text-secondary">
            Creating a trend video is simple: choose the movement, upload your image, and let AI turn it into a short-form clip built for TikTok, Reels, and Shorts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {howItWorksSteps.map((item) => (
            <div key={item.step} className="border border-dark-surface3 bg-dark-bg p-6">
              <div className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-primary">
                {item.step}
              </div>
              <div className="relative mb-6 aspect-[4/3] overflow-hidden bg-dark-surface2">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <h3 className="mb-3 text-2xl font-black text-text-primary">
                {item.title}
              </h3>
              <p className="leading-relaxed text-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <SignupCta href={signupHref} location="how_it_works" className="px-9 py-4 text-lg" />
        </div>
      </div>
    </section>
  )
}

function FeaturedTemplatesSection() {
  return (
    <section className="bg-dark-surface1 pb-24 pt-2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-black text-text-primary md:text-5xl">
            Football trends fans are recreating right now
          </h2>
          <p className="mx-auto max-w-2xl text-text-secondary">
            Start with viral formats inspired by celebrations, walkouts, fan edits, reactions, and match-day hype.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {featuredTemplates.map((category) => (
            <TemplatePreviewCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyChooseSection({ signupHref }: { signupHref: string }) {
  return (
    <section id="features" className="bg-dark-surface1 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="mb-5 text-4xl font-black text-text-primary md:text-5xl">
              Join football trends without filming from scratch
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary">
              Reelr is built for fast trend participation. Upload one photo, choose a format, and create videos around the football moments everyone is already talking about.
            </p>

            <div className="mt-10">
              <SignupCta href={signupHref} location="why_choose" className="px-9 py-4" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {whyChooseFeatures.map((feature) => (
              <div
                key={feature.title}
                className="border border-dark-surface3 bg-dark-bg p-6 transition-colors hover:border-primary"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center bg-primary">
                  <div className="text-dark-bg">{feature.icon}</div>
                </div>
                <h3 className="mb-4 text-xl font-black text-text-primary">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function VideoGridSection() {
  return (
    <section className="bg-dark-bg py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-black text-text-primary md:text-5xl">
            Find viral trend templates
          </h2>
          <p className="mx-auto max-w-2xl text-text-secondary">
            Start from a recognizable trend format, then make it yours with your own image and motion settings.
          </p>
        </div>

        <div className="mb-16 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {videoCategories.map((category) => (
            <TemplatePreviewCard key={category.id} category={category} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 border-t border-dark-surface3 pt-12 md:grid-cols-3">
          {videoStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mb-2 text-3xl font-black text-primary md:text-4xl">
                {stat.value}
              </div>
              <div className="font-medium text-text-secondary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AIToolsSection() {
  return (
    <section className="bg-dark-surface1 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mb-5 text-4xl font-black text-text-primary md:text-5xl">
            More AI video tools inside Reelr
          </h2>
          <p className="text-lg text-text-secondary">
            The trend generator is the main flow today, with more creation modes ready as the product expands.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <div
              key={tool.title}
              className="group border border-dark-surface3 bg-dark-bg p-6 transition-colors hover:border-primary"
            >
              <div className="mb-12 text-xs font-black uppercase tracking-[0.2em] text-primary">
                Tool {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="mb-3 text-2xl font-black text-text-primary">
                {tool.title}
              </h3>
              <p className="leading-relaxed text-text-secondary">
                {tool.description}
              </p>
              <div className="mt-6 text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Try it
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ signupHref }: { signupHref: string }) {
  return (
    <section id="pricing" className="bg-dark-surface1 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center text-3xl font-bold text-text-primary md:text-4xl">
          Start creating<br />
          trend videos
        </h2>
        <p className="mb-12 mt-4 text-center text-text-secondary">
          Choose the access period that fits how often you create.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {paidPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 ${
                plan.highlighted
                  ? 'border-primary bg-dark-surface2 shadow-lg'
                  : 'border-dark-surface3 bg-dark-surface2'
              }`}
            >
              <h3 className="mb-1 text-xl font-bold text-text-primary">{plan.name}</h3>
              <p className="mb-4 text-sm text-primary">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-text-primary">
                  {plan.price}
                </span>
                <span className="text-text-muted"> / {plan.interval}</span>
              </div>

              <div className="mb-6 space-y-3 border-b border-dark-surface3 pb-6">
                <PricingCheck>{plan.credits.toLocaleString('en-US')} credits included</PricingCheck>
                <PricingCheck>Trending Theme Library</PricingCheck>
                <PricingCheck>Download Videos</PricingCheck>
              </div>

              <div className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <PricingCheck key={feature} compact>
                    {feature}
                  </PricingCheck>
                ))}
              </div>

              <SignupCta
                href={signupHref}
                location={`pricing_${plan.id}`}
                variant={plan.highlighted ? 'primary' : 'dark'}
                className="w-full rounded-full py-3 text-center font-medium"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCheck({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-primary`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      <span className={compact ? 'text-text-primary' : 'font-medium text-text-primary'}>{children}</span>
    </div>
  )
}

function FAQSection() {
  const [activeTab, setActiveTab] = useState('General')

  return (
    <section className="bg-dark-bg py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between">
          <h2 className="mb-4 text-3xl font-bold text-text-primary md:mb-0 md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-text-secondary">
            Can&apos;t find the answer you&apos;re looking for? Reach out to our{' '}
            <a href="#" className="text-primary hover:underline">
              customer support
            </a>{' '}
            team.
          </p>
        </div>

        <div className="mb-8 flex gap-8 overflow-x-auto border-b border-dark-surface2">
          {faqTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative whitespace-nowrap pb-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {faqData[activeTab]?.map((faq) => (
            <div
              key={faq.question}
              className="rounded-2xl bg-dark-surface2 p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-3 text-lg font-bold text-text-primary">
                {faq.question}
              </h3>
              <p className="whitespace-pre-line leading-relaxed text-text-secondary">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingPageV2() {
  const signupHref = useSignupHref()

  useEffect(() => {
    trackLandingEvent('lp_v2_viewed')
  }, [])

  return (
    <main className="min-h-screen bg-dark-bg pb-20 text-text-primary md:pb-0">
      <HeroV2 signupHref={signupHref} />
      <FootballFocusSection signupHref={signupHref} />
      <HowItWorksSection signupHref={signupHref} />
      <FeaturedTemplatesSection />
      <WhyChooseSection signupHref={signupHref} />
      <VideoGridSection />
      <AIToolsSection />
      <PricingSection signupHref={signupHref} />
      <FAQSection />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-dark-surface3 bg-dark-bg/95 p-3 backdrop-blur md:hidden">
        <SignupCta href={signupHref} location="mobile_sticky" className="w-full px-8 py-3 text-base" />
      </div>
    </main>
  )
}
