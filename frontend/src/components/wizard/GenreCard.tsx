import { Genre } from '@/types';
import { cn } from '@/lib/utils';

interface GenreCardProps {
    genre: Genre;
    isSelected: boolean;
    onClick: () => void;
}

export default function GenreCard({ genre, isSelected, onClick }: GenreCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'relative p-6 rounded-xl border-2 transition-all duration-300 text-left',
                'hover:scale-105 hover:shadow-lg',
                isSelected
                    ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(124,92,255,0.3)]'
                    : 'border-[#1D222B] bg-[#161A21] hover:border-accent/50'
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    'w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-2xl transition-colors',
                    isSelected ? 'bg-accent text-white' : 'bg-[#1D222B] text-gray-400'
                )}
            >
                {getGenreIcon(genre.id)}
            </div>

            {/* Title */}
            <h3 className={cn('text-lg font-semibold mb-2', isSelected ? 'text-accent' : 'text-white')}>
                {genre.display_name}
            </h3>

            {/* Description */}
            {genre.description && (
                <p className="text-sm text-gray-400 line-clamp-2">{genre.description}</p>
            )}

            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            )}
        </button>
    );
}

function getGenreIcon(genreId: string): string {
    const icons: Record<string, string> = {
        motivation: '💪',
        business: '💼',
        psychology: '🧠',
        philosophy: '🤔',
        horror: '👻',
        animals: '🦁',
        history: '📜',
        relationships: '❤️',
        facts: '💡',
        funny: '😂',
    };
    return icons[genreId] || '🎬';
}
