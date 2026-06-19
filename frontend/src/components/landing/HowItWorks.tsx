import Image from 'next/image'
import Link from 'next/link'

const steps = [
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

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-dark-surface1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-14">
          <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-5">
            How to make an AI trend video with Reelr
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Creating a trend video is simple: choose the movement, upload your image, and let AI turn it into a short-form clip built for TikTok, Reels, and Shorts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((item) => (
            <div key={item.step} className="bg-dark-bg border border-dark-surface3 p-6">
              <div className="text-primary text-xs font-black uppercase tracking-[0.2em] mb-4">
                {item.step}
              </div>
              <div className="relative aspect-[4/3] bg-dark-surface2 overflow-hidden mb-6">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <h3 className="text-2xl font-black text-text-primary mb-3">
                {item.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/trending">
            <button className="px-9 py-4 bg-primary text-dark-bg font-bold rounded-none hover:bg-primary-hover transition-colors text-lg">
              Try Now
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
