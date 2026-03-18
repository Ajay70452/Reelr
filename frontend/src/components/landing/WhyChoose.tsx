const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Stop Wasting Time on Manual Work',
    description:
      'Unlike other platforms that require manual uploading and scheduling for each social network, Reelr automates posting to YouTube Shorts, TikTok, and Instagram Reels, freeing up your time to focus on strategy and audience engagement.',
    bgColor: 'bg-primary',
    iconColor: 'text-dark-bg',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    title: 'Real-Time Algorithm Adaptation',
    description:
      "Reelr uses advanced algorithms that monitor changes in each platform's rules and automatically optimize your content for maximum reach. You don't need to constantly track updates and manually adjust your strategy.",
    bgColor: 'bg-primary',
    iconColor: 'text-dark-bg',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Sustainable Short-Form Video Business',
    description:
      "Reelr is more than just a posting tool. It's a comprehensive solution for building a long-term, profitable short-form video business. We provide the tools you need to create, distribute, and monetize your content effectively.",
    bgColor: 'bg-primary',
    iconColor: 'text-dark-bg',
  },
]

import Link from 'next/link'

export default function WhyChoose() {
  return (
    <section className="py-20 bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-16">
          Why Choose Reelr?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 bg-dark-surface2 border border-dark-surface3 rounded-2xl hover:shadow-lg transition-shadow"
            >
              <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                <div className={feature.iconColor}>{feature.icon}</div>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-4">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/pricing">
            <button className="px-8 py-4 bg-primary text-dark-bg font-semibold rounded-full hover:bg-primary-hover transition-colors">
              Start Earning Now
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
