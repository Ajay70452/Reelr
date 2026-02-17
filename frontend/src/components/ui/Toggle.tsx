import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
    label?: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

export default function Toggle({ label, enabled, onChange, disabled = false }: ToggleProps) {
    return (
        <div className="flex items-center justify-between">
            {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
            <button
                type="button"
                onClick={() => !disabled && onChange(!enabled)}
                disabled={disabled}
                className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                    enabled ? 'bg-accent' : 'bg-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <span
                    className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                />
            </button>
        </div>
    );
}
