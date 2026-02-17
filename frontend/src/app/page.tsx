import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F1115] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent" />

        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Create AI Videos in{' '}
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                Minutes
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-4">
              Motion, Sora, or Classic Faceless Videos
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Pick a genre → choose a style → auto-generate videos that go viral. Powered by cutting-edge AI models.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/auth/signup">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Get Started (Free)
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Demo video placeholder */}
            <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl shadow-accent/10">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-[#0F1115] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Demo Video Coming Soon</p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Powered by Sora-like AI</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Videos ready in minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Create{' '}
              <span className="text-accent">Viral Videos</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From script generation to final render, we handle it all
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400">Plans start from $19/mo</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-xl border-2 ${plan.featured
                    ? 'border-accent bg-accent/5 shadow-lg shadow-accent/20'
                    : 'border-gray-800 bg-gray-900'
                  }`}
              >
                {plan.featured && (
                  <div className="text-center mb-4">
                    <span className="px-3 py-1 bg-accent text-white text-xs font-bold rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button
                    variant={plan.featured ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Create Your First Video?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of creators using AI to make viral content
          </p>
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              Start Creating for Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '🎬',
    title: 'AI Script Generation',
    description: 'GPT-4 powered scripts tailored to your genre and topic',
  },
  {
    icon: '✨',
    title: 'Multiple Visual Styles',
    description: 'Choose from Moving Images, Cinematic AI, or Stock footage',
  },
  {
    icon: '🎨',
    title: '12+ Presets',
    description: 'Cinematic, Anime, Neon, Aesthetic, and more visual styles',
  },
  {
    icon: '🎤',
    title: 'AI Voice-Over',
    description: 'Natural-sounding TTS with multiple voice options',
  },
  {
    icon: '🎵',
    title: 'Background Music',
    description: 'Royalty-free music that matches your video mood',
  },
  {
    icon: '⚡',
    title: 'Fast Rendering',
    description: 'Videos ready in 2-5 minutes with GPU acceleration',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    featured: false,
    features: ['10 credits/month', 'Basic quality', 'Moving Images', 'Standard voices'],
  },
  {
    name: 'Pro',
    price: 49,
    featured: true,
    features: ['200 credits/month', 'Premium quality', 'Cinematic AI Video', 'All voices & music', 'Priority rendering'],
  },
  {
    name: 'Premium',
    price: 99,
    featured: false,
    features: ['500 credits/month', 'Ultra quality', 'Sora-style videos', 'Premium voices', 'Fastest rendering', 'API access'],
  },
];
