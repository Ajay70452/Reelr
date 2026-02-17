import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-120 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';

    const variants = {
      primary: 'bg-gradient-to-br from-[#7C5CFF] to-[#b79cff] text-white hover:brightness-110 hover:shadow-[0_10px_40px_rgba(124,92,255,0.45)]',
      secondary: 'bg-[#14172a] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3),0_10px_30px_rgba(124,92,255,0.15)]',
      outline: 'border-2 border-accent text-accent hover:bg-accent/10',
      ghost: 'text-gray-300 hover:bg-[#14172a] hover:text-white',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
