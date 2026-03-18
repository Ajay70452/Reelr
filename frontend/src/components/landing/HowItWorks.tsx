const features = [
  {
    title: 'Automated Content Creation',
    description:
      'Our AI creates engaging short-form videos on autopilot, maximizing your earning potential without requiring constant effort',
  },
  {
    title: 'Multi-Platform Distribution',
    description:
      'Automatically publish your videos every day across YouTube Shorts, TikTok, and Instagram Reels to reach a wider audience and increase your passive income streams',
  },
  {
    title: 'Monetization Optimization',
    description:
      'Reelr helps you optimize your videos for monetization, maximizing your passive income from social media platforms',
  },
]

import Link from 'next/link'

export default function HowItWorks() {
  return (
    <section className="py-20 bg-dark-surface1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Phone mockups */}
          <div className="relative">
            <div className="relative bg-primary rounded-3xl p-8 aspect-square max-w-lg mx-auto">
              {/* Topic tags */}
              <div className="absolute top-8 right-8 flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-dark-bg shadow-lg">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Bedtime stories
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-dark-bg shadow-lg ml-8">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Urban legends
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-dark-bg shadow-lg ml-16">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Fun facts
                </span>
              </div>

              {/* Phone mockups */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-4 items-end">
                {/* Left phone */}
                <div className="w-32 h-56 bg-dark-bg rounded-2xl overflow-hidden shadow-2xl border-4 border-dark-surface3">
                  <div className="w-full h-full bg-gradient-to-b from-green-400 to-blue-400 flex items-center justify-center">
                    <div className="text-white text-xs text-center p-2">
                      <div className="text-2xl mb-1">9:41</div>
                      <div className="w-8 h-8 mx-auto rounded-full bg-white/20" />
                    </div>
                  </div>
                </div>

                {/* Center phone (larger) */}
                <div className="w-40 h-72 bg-dark-bg rounded-2xl overflow-hidden shadow-2xl border-4 border-dark-surface3 -mb-4">
                  <div className="w-full h-full bg-gradient-to-b from-cyan-300 to-green-300 flex flex-col items-center justify-end p-4">
                    <div className="w-16 h-16 rounded-full bg-white/30 mb-4" />
                    <div className="flex gap-2">
                      <div className="px-2 py-1 bg-white/20 rounded text-xs text-white">250.5k</div>
                      <div className="px-2 py-1 bg-white/20 rounded text-xs text-white">100k</div>
                      <div className="px-2 py-1 bg-white/20 rounded text-xs text-white">89k</div>
                    </div>
                  </div>
                </div>

                {/* Right phone */}
                <div className="w-32 h-56 bg-dark-bg rounded-2xl overflow-hidden shadow-2xl border-4 border-dark-surface3">
                  <div className="w-full h-full bg-gradient-to-b from-emerald-400 to-teal-500 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Features */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-12">
              How Reelr Generates<br />
              Your Passive Income
            </h2>

            <div className="space-y-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 bg-dark-surface2 rounded-2xl border-l-4 border-transparent hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-bold text-text-primary mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/pricing">
              <button className="mt-10 px-8 py-4 bg-primary text-dark-bg font-semibold rounded-full hover:bg-primary-hover transition-colors">
                Start Earning Now
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
