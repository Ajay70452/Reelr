import { cn } from '@/lib/utils';

interface ProgressBarProps {
    progress: number; // 0-100
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    color?: 'green' | 'blue';
}

export default function ProgressBar({
    progress,
    showLabel = true,
    size = 'md',
    color = 'green'
}: ProgressBarProps) {
    const heights = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
    };

    const colors = {
        green: 'bg-accent',
        blue: 'bg-accent',
    };

    const glows = {
        green: 'shadow-[0_0_10px_rgba(124,92,255,0.5)]',
        blue: 'shadow-[0_0_10px_rgba(124,92,255,0.5)]',
    };

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Progress</span>
                    <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
                </div>
            )}
            <div className={cn('w-full bg-gray-800 rounded-full overflow-hidden', heights[size])}>
                <div
                    className={cn(
                        'h-full transition-all duration-500 ease-out rounded-full',
                        colors[color],
                        progress > 0 && glows[color]
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
        </div>
    );
}
