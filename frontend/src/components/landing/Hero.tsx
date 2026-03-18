import Link from 'next/link'

export default function Hero() {
  return (
    <section className="pt-32 pb-16 bg-dark-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Stars decoration */}
        <div className="flex justify-center gap-2 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>

        {/* Chart illustration */}
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-24">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="180" height="80" x="10" y="10" fill="url(#grid)" />

              {/* Chart line */}
              <path
                d="M 20 70 L 40 65 L 60 60 L 80 55 L 100 45 L 120 50 L 140 35 L 160 40 L 180 25"
                fill="none"
                stroke="#C8FF4D"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots on line */}
              <circle cx="180" cy="25" r="4" fill="#C8FF4D" />
            </svg>

            {/* Dollar sign at end */}
            <div className="absolute -right-2 top-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-dark-bg text-sm font-bold">
              $
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
          Generate Passive Income<br />
          with AI-generated<br />
          Shorts on Autopilot
        </h1>

        {/* Description */}
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
          Build a consistent income stream with automated short-form videos. Reelr handles everything from creation to publishing, so you can earn while you sleep
        </p>

        {/* CTA Button */}
        <Link href="/pricing">
          <button className="px-8 py-4 bg-primary text-dark-bg font-semibold rounded-full hover:bg-primary-hover transition-colors text-lg mb-12">
            Start Earning Now
          </button>
        </Link>

        {/* Social Proof - Platforms */}
        <div className="mb-4">
          <p className="text-text-muted text-sm mb-4">Powering top creators on</p>
          <div className="flex items-center justify-center gap-6">
            {/* TikTok */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
              <span className="text-text-primary font-medium">TikTok</span>
            </div>

            {/* YouTube Shorts */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
              </svg>
              <span className="text-text-primary font-medium">Shorts</span>
            </div>

            {/* Instagram */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
              </svg>
              <span className="text-text-primary font-medium">Instagram</span>
            </div>
          </div>
        </div>

        {/* Trusted Users */}
        <div className="mt-8">
          <p className="text-text-muted text-sm mb-3">Trusted by Over 100k happy users</p>
          <div className="flex justify-center -space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-dark-bg bg-gradient-to-br from-primary to-accent"
                style={{
                  backgroundImage: `linear-gradient(${45 + i * 30}deg, #C8FF4D, #A4F35C)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
