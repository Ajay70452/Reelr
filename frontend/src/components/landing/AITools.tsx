const tools = [
  {
    title: 'Create Organic Ads Video',
    description: 'Automate TikToks to boost your website traffic.',
    bgColor: 'bg-primary',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 p-2">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            <div className="bg-gradient-to-br from-purple-300 to-pink-300 rounded-lg" />
            <div className="bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg" />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'AI Video Generator',
    description: 'Create professional videos from scratch using AI',
    bgColor: 'bg-purple-100',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-purple-50 p-4">
        <div className="text-xs text-text-muted mb-2">What a topic of video?</div>
        <div className="flex gap-2 mb-3">
          <span className="px-2 py-1 bg-dark-bg text-white text-xs rounded">Popular Topics</span>
          <span className="px-2 py-1 bg-gray-200 text-xs rounded">Custom prompt</span>
        </div>
        <div className="h-12 bg-dark-surface1 rounded border border-dark-surface3 mb-2" />
        <button className="w-full py-2 bg-gray-100 rounded text-xs">Next Step</button>
      </div>
    ),
  },
  {
    title: 'AI Image to Video',
    description: 'Transform your static images into dynamic videos',
    bgColor: 'bg-green-100',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 p-4 flex items-center justify-center">
        <div className="w-24 h-32 bg-gradient-to-b from-amber-200 to-orange-200 rounded-lg shadow-lg relative">
          <div className="absolute -right-2 -bottom-2 px-3 py-1 bg-primary text-dark-bg text-xs rounded-full font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Generate
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'AI Video Script Generator',
    description: 'Create compelling scripts for your videos',
    bgColor: 'bg-yellow-100',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-yellow-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-gray-200 text-xs rounded">2min</span>
          <span className="px-2 py-1 bg-gray-200 text-xs rounded">in</span>
        </div>
        <div className="font-bold text-sm text-dark-bg mb-2">Script generations</div>
        <div className="text-xs text-text-muted space-y-1">
          <p>[Opening shot: Bright morning, light streams in through...]</p>
          <p className="truncate">**Me** (smiling) &quot;Hey, TikTok! Got 5 minutes? Let&apos;s...</p>
        </div>
        <button className="mt-3 px-4 py-1 bg-primary text-dark-bg text-xs rounded font-medium">
          script
        </button>
      </div>
    ),
  },
  {
    title: 'AI UGC Hook + Demo',
    description: 'Create viral demo videos using AI avatars',
    bgColor: 'bg-green-100',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-green-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm text-dark-bg">Hook</span>
          <span className="text-xs text-text-muted">&lt; 1/10 &gt;</span>
        </div>
        <div className="h-8 bg-dark-surface1 rounded border border-dark-surface3 mb-3" />
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm text-dark-bg">AI Avatar</span>
          <span className="text-xs text-text-muted">&lt; 1/50 &gt;</span>
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full" />
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'AI Slideshow Generator',
    description: 'Drive traffic to your products',
    bgColor: 'bg-amber-100',
    preview: (
      <div className="relative h-40 overflow-hidden rounded-xl bg-amber-50 p-4">
        <div className="grid grid-cols-3 gap-2 h-full">
          <div className="bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg" />
          <div className="bg-gradient-to-br from-orange-200 to-red-200 rounded-lg" />
          <div className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-lg" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex gap-1">
            <span className="px-2 py-1 bg-dark-surface1 border border-dark-surface3 text-xs rounded shadow">Choose asset</span>
          </div>
          <button className="px-3 py-1 bg-primary text-dark-bg text-xs rounded font-medium">
            Generate slideshow
          </button>
        </div>
      </div>
    ),
  },
]

export default function AITools() {
  return (
    <section className="py-20 bg-dark-surface1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-16">
          AI Tools That Make Money
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <div
              key={index}
              className={`${tool.bgColor} rounded-3xl p-6 hover:shadow-lg transition-shadow cursor-pointer`}
            >
              {tool.preview}
              <h3 className="text-xl font-bold text-text-primary mt-4 mb-2">
                {tool.title}
              </h3>
              <p className="text-text-secondary">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
