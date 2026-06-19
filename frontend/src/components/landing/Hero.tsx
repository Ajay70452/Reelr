import Link from 'next/link'

export default function Hero() {
  return (
    <section className="bg-dark-bg">
      <div className="min-h-[calc(100vh-64px)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex items-end">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-16 items-end w-full">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-surface2 border border-dark-surface3 rounded-full text-sm font-semibold text-primary mb-8">
              <span className="w-2 h-2 rounded-full bg-primary" />
              AI trend video generator
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-text-primary leading-[0.98] mb-6">
              Put Yourself Inside Any{' '}
              <span className="text-primary">Viral Trend</span>
            </h1>

            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mb-8 leading-relaxed">
              Upload a photo, pick a viral format, and Reelr generates a short video that follows the motion, pacing, and style of the trend.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link href="/trending">
                <button className="w-full sm:w-auto px-9 py-4 bg-primary text-dark-bg font-bold rounded-none hover:bg-primary-hover transition-colors text-lg">
                  Try Now
                </button>
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-9 py-4 border border-dark-surface3 text-text-primary font-bold rounded-none hover:border-primary transition-colors text-lg text-center"
              >
                See How
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
              <span>9:16 shorts</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Theme mode</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Custom motion</span>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/5] bg-dark-surface2 overflow-hidden border border-dark-surface3">
                <video
                  src="/videos/hero-2.mp4"
                  aria-label="Reference trend video"
                  autoPlay
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
                  src="/videos/hero-1.mp4"
                  aria-label="Generated trend video"
                  autoPlay
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

            <div className="mt-4 bg-dark-surface2 border border-dark-surface3 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted mb-1">Selected template</p>
                  <p className="text-text-primary font-bold">Cinematic Walk</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted mb-1">Output</p>
                  <p className="text-primary font-bold">8s / 9:16</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-dark-surface3 bg-dark-surface1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
            <span>Viral templates</span>
            <span className="text-primary">Image to video</span>
            <span>Motion matching</span>
            <span>Fast exports</span>
            <span className="text-primary">Trend-ready shorts</span>
          </div>
        </div>
      </div>
    </section>
  )
}
