import { Preset } from '@/types';
import { cn } from '@/lib/utils';

interface PresetCardProps {
    preset: Preset;
    isSelected: boolean;
    onClick: () => void;
}

export default function PresetCard({ preset, isSelected, onClick }: PresetCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'relative group overflow-hidden rounded-xl border-2 transition-all duration-300',
                'hover:scale-105',
                isSelected
                    ? 'border-accent shadow-[0_0_20px_rgba(124,92,255,0.3)]'
                    : 'border-[#1D222B] hover:border-accent/50'
            )}
        >
            {/* Preview placeholder - in production, this would be a video loop */}
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-4xl">{getPresetIcon(preset.id)}</div>
            </div>

            {/* Overlay */}
            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent',
                    'flex flex-col justify-end p-4'
                )}
            >
                <h4 className={cn('text-lg font-semibold mb-1', isSelected ? 'text-accent' : 'text-white')}>
                    {preset.display_name}
                </h4>
                {preset.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{preset.description}</p>
                )}
            </div>

            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Hover play indicator */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 bg-accent/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                </div>
            </div>
        </button>
    );
}

function getPresetIcon(presetId: string): string {
    const icons: Record<string, string> = {
        // Moving Images presets
        cinematic_mi: '🎬',
        aesthetic_mi: '✨',
        anime_mi: '🎌',
        neon_mi: '💫',
        minimal_mi: '⚪',
        dark_mi: '🌑',
        vaporwave_mi: '🌊',
        nature_mi: '🌿',
        // Cinematic Video presets
        cinematic_cv: '🎬',
        pov_cv: '👁️',
        hyperreal_cv: '🔮',
        dreamy_cv: '💭',
        action_cv: '💥',
        nature_cv: '🌍',
    };
    return icons[presetId] || '🎥';
}
