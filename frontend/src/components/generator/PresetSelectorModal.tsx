'use client';

import { useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AIPreset } from '@/types';

interface PresetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: AIPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: AIPreset | null) => void;
  isLoading?: boolean;
}

// Fallback thumbnail URLs (used when preset.thumbnail_url is not set)
const PRESET_THUMBNAILS: Record<string, string> = {
  cinematic: '/presets/cinematic.jpg',
  digital_art: '/presets/digital_art.jpg',
  neon_futuristic: '/presets/neon_futuristic.jpg',
  realistic_4k: '/presets/4k-realisitc.jpg',
  comic_book: '/presets/comic_book.jpg',
  anime: '/presets/anime.jpg',
  cartoon: '/presets/cartoon.jpg',
  soft_aesthetic: '/presets/soft_aesthetic.jpg',
  collage: '/presets/collage.jpg',
  line_art: '/presets/line_art.jpg',
  sumi_e: '/presets/japenese_ink.jpg',
  kawaii: '/presets/kawaii.jpg',
};

// Fallback icons (used when thumbnail fails to load)
const PRESET_ICONS: Record<string, string> = {
  cinematic: '🎬',
  digital_art: '🎨',
  neon_futuristic: '💫',
  realistic_4k: '📷',
  comic_book: '💥',
  anime: '🎌',
  cartoon: '🎪',
  soft_aesthetic: '✨',
  collage: '📰',
  line_art: '✏️',
  sumi_e: '🖌️',
  kawaii: '🌸',
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

// Thumbnail component with fallback
function PresetThumbnail({ preset }: { preset: AIPreset }) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = preset.thumbnail_url || PRESET_THUMBNAILS[preset.id];

  if (imageError || !thumbnailUrl) {
    // Fallback to icon
    return (
      <div className="w-full aspect-[4/3] bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-4xl">{PRESET_ICONS[preset.id] || '🎨'}</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-800">
      <img
        src={thumbnailUrl}
        alt={preset.display_name}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export default function PresetSelectorModal({
  isOpen,
  onClose,
  presets,
  selectedPresetId,
  onSelectPreset,
  isLoading = false,
}: PresetSelectorModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleSelectPreset = (preset: AIPreset) => {
    onSelectPreset(preset);
    onClose();
  };

  const handleClearPreset = () => {
    onSelectPreset(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#161A21] border border-[#1D222B] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[#161A21] border-b border-[#1D222B]">
          <div>
            <h2 className="text-xl font-bold text-white">Style Presets</h2>
            <p className="text-sm text-gray-400 mt-1">
              Select a style to enhance your prompt
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Clear button if preset selected */}
          {selectedPresetId && (
            <button
              onClick={handleClearPreset}
              className="mb-4 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Clear preset selection
            </button>
          )}

          {/* Presets Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200',
                    'hover:scale-[1.02] hover:shadow-lg',
                    selectedPresetId === preset.id
                      ? 'border-accent shadow-[0_0_20px_rgba(124,92,255,0.2)]'
                      : 'border-[#262C37] hover:border-accent/50'
                  )}
                >
                  {/* Thumbnail */}
                  <PresetThumbnail preset={preset} />

                  {/* Info overlay */}
                  <div className="p-3 bg-gray-800/90">
                    <h4
                      className={cn(
                        'font-semibold text-sm text-center',
                        selectedPresetId === preset.id
                          ? 'text-accent'
                          : 'text-white group-hover:text-accent'
                      )}
                    >
                      {preset.display_name}
                    </h4>
                  </div>

                  {/* Selected indicator */}
                  {selectedPresetId === preset.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                </button>
              ))}
            </div>
          )}

          {/* No presets message */}
          {!isLoading && presets.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No presets available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
