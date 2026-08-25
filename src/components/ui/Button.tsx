import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed touch-manipulation cursor-pointer';

  const normalizedVariant = variant === 'danger' ? 'destructive' : variant;

  const variants = {
    primary: 'bg-[#00a854] hover:bg-[#008f47] text-white shadow-xs hover:shadow-md focus:ring-[#00a854]/40 font-bold',
    secondary: 'bg-[#ffa454]/15 hover:bg-[#ffa454]/25 text-[#904d00] focus:ring-[#ffa454]/40 font-semibold',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-400 focus:ring-[#00a854]/30',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus:ring-gray-300',
    destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/40 font-bold',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 gap-1.5 min-h-[38px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px] font-bold',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[normalizedVariant], sizes[size], fullWidth && 'w-full', className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
