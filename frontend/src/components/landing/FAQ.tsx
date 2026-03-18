'use client'

import { useState } from 'react'

const tabs = ['General', 'Pricing', 'Application', 'Other']

const faqData: Record<string, { question: string; answer: string }[]> = {
  General: [
    {
      question: 'What is a faceless AI video generator?',
      answer:
        "A faceless AI video generator creates videos without showing a person's face, using AI tools to generate visuals, captions, voiceovers, and music. Reelr automates the entire process, allowing users to create unique videos quickly and efficiently.",
    },
    {
      question: 'What is the best AI faceless video creator?',
      answer:
        'Reelr shines as a top choice for creating faceless videos with AI, thanks to:\n\n• A fully automated process: from script to final edit.\n• Smart use of cutting-edge AI, including ElevenLabs for natural-sounding voices.\n• Affordable pricing plans that deliver great value.',
    },
    {
      question: 'What is a series?',
      answer:
        'A series is a collection of related videos centered around a specific topic. For example, you could create a series called "Fun facts," where Reelr automatically creates and posts a new video three times a week, or even daily, depending on your plan.',
    },
    {
      question: 'How to create a video?',
      answer:
        "First, you'll need to set up a series. Once you've done that, a video will be automatically lined up for production. Each series has only one video available at a time, and a new video will be generated once the previous one has been published",
    },
    {
      question: 'What topics does Reelr support?',
      answer:
        'Reelr is ideal for a variety of content, including motivational videos, interesting history, crypto topic and more.',
    },
    {
      question: 'Am I the owner of the videos?',
      answer:
        'You own the videos outright, so you can use them however you want. You can download them for use on other platforms or even sell them to clients.',
    },
    {
      question: 'Can I generate in other languages?',
      answer:
        "Yes! We support most languages. If you need a language that isn't listed, feel free to reach out to our support team.",
    },
  ],
  Pricing: [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and cryptocurrency payments.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'We offer a 7-day free trial for new users to test all features before committing to a plan.',
    },
  ],
  Application: [
    {
      question: 'How do I get started?',
      answer: 'Simply sign up, choose your plan, and start creating your first series. Our intuitive interface will guide you through the process.',
    },
    {
      question: 'Can I edit videos after generation?',
      answer: 'Yes, you can preview and edit your videos before publishing. Make adjustments to scripts, visuals, and audio as needed.',
    },
  ],
  Other: [
    {
      question: 'Do you offer customer support?',
      answer: 'Yes, we offer 24/7 customer support via email and live chat. Our team is always ready to help.',
    },
    {
      question: 'Can I use Reelr for client work?',
      answer: 'Absolutely! Many of our users create videos for clients. You own all content you create.',
    },
  ],
}

export default function FAQ() {
  const [activeTab, setActiveTab] = useState('General')

  return (
    <section className="py-20 bg-dark-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 md:mb-0">
            Frequently Asked Questions
          </h2>
          <p className="text-text-secondary">
            Can&apos;t find the answer you&apos;re looking for? Reach out to our{' '}
            <a href="#" className="text-primary hover:underline">
              customer support
            </a>{' '}
            team.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-dark-surface2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* FAQ Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {faqData[activeTab]?.map((faq, index) => (
            <div
              key={index}
              className="bg-dark-surface2 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-bold text-text-primary mb-3">
                {faq.question}
              </h3>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
