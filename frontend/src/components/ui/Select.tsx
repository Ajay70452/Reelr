import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {label}
                    </label>
                )}
                <select
                    className={cn(
                        'w-full px-4 py-3 rounded-[14px] text-white',
                        'bg-gradient-to-b from-[#161b30] to-[#121624]',
                        'shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]',
                        'focus:outline-none focus:shadow-[0_0_0_2px_rgba(124,92,255,0.25),inset_0_2px_6px_rgba(0,0,0,0.4)]',
                        'transition-all duration-150 cursor-pointer',
                        error ? 'ring-1 ring-red-500' : '',
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="bg-gray-900">
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1 text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
