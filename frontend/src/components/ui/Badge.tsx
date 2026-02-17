import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
    const variants = {
        default: 'bg-gray-800 text-gray-300',
        success: 'bg-accent/20 text-accent border border-accent/30',
        warning: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-500 border border-red-500/30',
        info: 'bg-accent/20 text-accent border border-accent/30',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full',
                variants[variant],
                sizes[size]
            )}
        >
            {children}
        </span>
    );
}
