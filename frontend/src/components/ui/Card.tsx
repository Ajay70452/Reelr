import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    hover?: boolean;
    glow?: boolean;
}

export default function Card({ children, className, hover = false, glow = false, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'bg-[#14172a] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)]',
                hover && 'transition-all duration-150 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(124,92,255,0.18)] cursor-pointer',
                glow && 'shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(124,92,255,0.12)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('mb-4', className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn('text-xl font-semibold text-white', className)} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn('text-sm text-gray-400', className)} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('', className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]', className)} {...props}>
            {children}
        </div>
    );
}
