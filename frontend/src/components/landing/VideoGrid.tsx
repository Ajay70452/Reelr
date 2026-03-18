const videoCategories = [
  {
    id: 1,
    title: 'Conspiracy Theory',
    label: 'the theory',
    bgColor: 'from-pink-300 to-purple-400',
  },
  {
    id: 2,
    title: 'Games',
    label: 'LIMITED',
    bgColor: 'from-blue-400 to-purple-500',
  },
  {
    id: 3,
    title: 'Food',
    label: 'powder,',
    bgColor: 'from-green-300 to-yellow-300',
  },
  {
    id: 4,
    title: 'Book Review',
    label: 'HAVE LIVED',
    bgColor: 'from-amber-400 to-orange-500',
  },
  {
    id: 5,
    title: 'Meditation',
    label: 'BREATHE',
    bgColor: 'from-orange-300 to-pink-400',
  },
  {
    id: 6,
    title: 'Brand Story',
    label: 'AND IT STARTED',
    bgColor: 'from-yellow-200 to-orange-300',
    isLarge: true,
  },
  {
    id: 7,
    title: 'Horror',
    label: 'One night',
    bgColor: 'from-blue-800 to-purple-900',
  },
  {
    id: 8,
    title: 'Product',
    label: 'DEEPLY HYDRATES',
    bgColor: 'from-amber-100 to-yellow-200',
  },
]

const stats = [
  { value: '1.2M', label: 'videos created' },
  { value: '$2,300/month', label: 'average creator earnings' },
  { value: '15M+', label: 'combined views generated' },
]

export default function VideoGrid() {
  return (
    <section className="py-16 bg-dark-surface1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Video Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {/* First row */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-300 to-purple-400 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200/50 to-purple-300/50" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-dark-bg">
                the theory
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Conspiracy Theory
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 group cursor-pointer">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded font-bold">
              ROBLOX
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-yellow-400 rounded-full text-sm font-bold text-dark-bg">
                LIMITED
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Games
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-green-200 to-yellow-200 group cursor-pointer">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-white/80 rounded-full text-sm font-medium text-dark-bg">
                powder,
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Food
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-amber-600 to-orange-700 group cursor-pointer">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-red-500 rounded-full text-sm font-bold text-white">
                HAVE LIVED
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Book Review
            </div>
          </div>

          {/* Second row */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-orange-300 to-pink-300 group cursor-pointer mt-8">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-primary rounded-full text-sm font-bold text-dark-bg">
                BREATHE
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Meditation
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-200 to-orange-200 group cursor-pointer mt-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-dark-bg/80 text-center px-4">
                AND IT STARTED
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Brand Story
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 to-purple-900 group cursor-pointer mt-8">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-cyan-400/80 rounded-full text-sm font-medium text-dark-bg">
                One night
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Horror
            </div>
          </div>

          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-yellow-100 group cursor-pointer mt-8">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 bg-orange-400 rounded-full text-sm font-bold text-white">
                DEEPLY HYDRATES
              </span>
            </div>
            <div className="absolute -bottom-6 left-4 text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Product
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-dark-bg mb-2">
                {stat.value}
              </div>
              <div className="text-text-secondary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
