import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    className={cn(
                        'w-full px-4 py-3 rounded-[14px] text-white placeholder-[#A1A8B8]',
                        'bg-gradient-to-b from-[#262b38] to-[#222631]',
                        'shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]',
                        'focus:outline-none focus:shadow-[0_0_0_1px_rgba(200,255,77,0.4),0_0_18px_rgba(200,255,77,0.25),inset_0_2px_6px_rgba(0,0,0,0.4)]',
                        'transition-all duration-150',
                        error ? 'ring-1 ring-red-500' : '',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-red-500">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-400">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
