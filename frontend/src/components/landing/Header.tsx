'use client'

import { useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-surface1 border-b border-dark-surface2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-dark-bg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-text-primary">Clip King</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <div className="relative group">
              <button className="flex items-center gap-1 text-text-primary hover:text-primary transition-colors">
                Tools
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1 text-dark-bg hover:text-text-muted transition-colors">
                Resources
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <a href="#pricing" className="text-dark-bg hover:text-text-muted transition-colors">
              Pricing
            </a>
            <div className="flex items-center gap-1 text-text-primary">
              <span className="w-5 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs">
              </span>
              EN
            </div>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button className="px-4 py-2 text-text-primary border border-dark-surface3 rounded-full hover:border-primary transition-colors">
              Log in
            </button>
            <button className="px-4 py-2 bg-primary text-dark-bg font-medium rounded-full hover:bg-primary-hover transition-colors">
              Start Earning Now
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-surface2">
            <nav className="flex flex-col gap-4">
              <a href="#" className="text-text-primary hover:text-primary transition-colors">Tools</a>
              <a href="#" className="text-text-primary hover:text-primary transition-colors">Resources</a>
              <a href="#pricing" className="text-text-primary hover:text-primary transition-colors">Pricing</a>
              <div className="flex flex-col gap-3 pt-4 border-t border-dark-surface2">
                <button className="px-4 py-2 text-text-primary border border-dark-surface3 rounded-full hover:border-primary transition-colors">
                  Log in
                </button>
                <button className="px-4 py-2 bg-primary text-dark-bg font-medium rounded-full hover:bg-primary-hover transition-colors">
                  Start Earning Now
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
