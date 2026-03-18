import Link from 'next/link'

export default function EasyVideos() {
  return (
    <section className="py-20 bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="bg-primary rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-bg mb-6">
              Making Videos That<br />
              Earn Just Got Easier
            </h2>
            <p className="text-dark-bg/80 text-lg mb-8">
              Forget complex tools. We have simple buttons and forms.
              All you do is choose topics and click &apos;Generate&apos;.
            </p>
            <Link href="/pricing">
              <button className="px-8 py-4 bg-dark-bg text-white font-semibold rounded-full hover:bg-dark-surface3 transition-colors">
                Start Earning Now
              </button>
            </Link>
          </div>

          {/* Right side - App mockup */}
          <div className="relative">
            <div className="bg-dark-surface2 rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
              {/* App header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-dark-bg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-text-primary">Reelr</span>
              </div>

              {/* Welcome message */}
              <div className="mb-6">
                <p className="text-text-muted text-sm">Hi FirstName</p>
                <h3 className="text-xl font-bold text-text-primary">
                  Lets create your first pack of videos
                </h3>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-bg mb-2">
                    What topic of video?
                  </label>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-primary text-dark-bg rounded-full text-sm">
                      Popular Topics
                    </button>
                    <button className="px-3 py-1 bg-dark-surface3 text-text-primary rounded-full text-sm">
                      Custom prompt
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Subsection
                  </label>
                  <select className="w-full p-3 border border-dark-surface3 bg-dark-surface1 rounded-lg text-text-primary">
                    <option>Motivational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    How many videos do you want?
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-dark-surface3 bg-dark-surface1 rounded-lg text-text-primary"
                    placeholder="Enter number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What language is for video?
                  </label>
                  <select className="w-full p-3 border border-dark-surface3 bg-dark-surface1 rounded-lg text-text-primary">
                    <option>English</option>
                  </select>
                </div>

                <button className="w-full py-4 bg-primary text-dark-bg font-semibold rounded-full hover:bg-primary-hover transition-colors">
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
