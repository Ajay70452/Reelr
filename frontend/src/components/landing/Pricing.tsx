'use client'

import { useState } from 'react'

const plans = [
  {
    name: 'Launch',
    potentialIncome: '$50 - $200/month',
    monthlyPrice: 19,
    yearlyPrice: 15,
    features: {
      series: '1 Series',
      videos: '12 Videos',
      autoPost: 'Auto-Post Videos',
    },
    additionalFeatures: [
      { name: 'Edit & Preview Videos', included: true },
      { name: 'Auto-Post To Channel', included: true },
      { name: 'HD Video Resolution', included: true },
      { name: 'Background Music', included: true },
      { name: 'No Watermark', included: false },
      { name: 'Download Videos', included: false },
    ],
    highlighted: false,
  },
  {
    name: 'Grow',
    potentialIncome: '$200 - $500/month',
    monthlyPrice: 39,
    yearlyPrice: 31,
    features: {
      series: '1 Series',
      videos: '30 Videos',
      autoPost: 'Auto-Post Videos',
    },
    additionalFeatures: [
      { name: 'Edit & Preview Videos', included: true },
      { name: 'Auto-Post To Channel', included: true },
      { name: 'HD Video Resolution', included: true },
      { name: 'Background Music', included: true },
      { name: 'No Watermark', included: true },
      { name: 'Download Videos', included: false },
    ],
    highlighted: true,
  },
  {
    name: 'Scale',
    potentialIncome: '$500 - $2300/month',
    monthlyPrice: 69,
    yearlyPrice: 55,
    features: {
      series: '1 Series',
      videos: '60 Videos',
      autoPost: 'Auto-Post Videos',
    },
    additionalFeatures: [
      { name: 'Edit & Preview Videos', included: true },
      { name: 'Auto-Post To Channel', included: true },
      { name: 'HD Video Resolution', included: true },
      { name: 'Background Music', included: true },
      { name: 'No Watermark', included: true },
      { name: 'Download Videos', included: true },
    ],
    highlighted: false,
  },
]

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="py-20 bg-dark-surface1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
          Lets start generate<br />
          passive income
        </h2>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !isYearly ? 'bg-primary text-dark-bg' : 'text-text-secondary hover:text-primary'
            }`}
          >
            Pay Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isYearly ? 'bg-primary text-dark-bg' : 'text-text-secondary hover:text-primary'
            }`}
          >
            Pay Yearly save 20%
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-6 border ${
                plan.highlighted
                  ? 'border-primary bg-dark-surface2 shadow-lg'
                  : 'border-dark-surface3 bg-dark-surface2'
              }`}
            >
              <h3 className="text-xl font-bold text-text-primary mb-1">{plan.name}</h3>
              <p className="text-primary text-sm mb-4">
                Potential Income — {plan.potentialIncome}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-text-primary">
                  ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}.00
                </span>
                <span className="text-text-muted"> / month</span>
              </div>

              {/* Main features */}
              <div className="space-y-3 mb-6 pb-6 border-b border-dark-surface3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary font-medium">{plan.features.series}</span>
                  <div className="flex gap-1 ml-auto">
                    <button className="w-6 h-6 rounded-full bg-dark-surface3 flex items-center justify-center text-text-muted hover:bg-dark-surface1">
                      +
                    </button>
                    <button className="w-6 h-6 rounded-full bg-dark-surface3 flex items-center justify-center text-text-muted hover:bg-dark-surface1">
                      -
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary font-medium">{plan.features.videos}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary font-medium">{plan.features.autoPost}</span>
                </div>
              </div>

              {/* Additional features */}
              <div className="space-y-3 mb-6">
                {plan.additionalFeatures.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    {feature.included ? (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={feature.included ? 'text-text-primary' : 'text-text-muted'}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-3 rounded-full font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-primary text-dark-bg hover:bg-primary-hover'
                    : 'bg-dark-surface3 text-text-primary hover:bg-dark-surface1'
                }`}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
