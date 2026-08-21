import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShieldCheck, CheckCircle2, Clock, XCircle, Tag, Sparkles } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'verified'
    | 'available'
    | 'rented'
    | 'pending'
    | 'rejected'
    | 'free'
    | 'cheap'
    | 'primary'
    | 'outline';
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  showIcon = true,
  className,
  ...props
}) => {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    rented: 'bg-gray-100 text-gray-600 border-gray-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200/60',
    free: 'bg-emerald-500 text-white font-semibold shadow-xs',
    cheap: 'bg-amber-500 text-white font-semibold shadow-xs',
    primary: 'bg-[#006d37]/10 text-[#006d37] border-[#006d37]/20',
    outline: 'bg-white text-gray-700 border-gray-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    switch (variant) {
      case 'verified':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'available':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-amber-600 shrink-0" />;
      case 'rejected':
        return <XCircle className="w-3 h-3 text-rose-600 shrink-0" />;
      case 'free':
        return <Sparkles className="w-3 h-3 text-white shrink-0" />;
      case 'cheap':
        return <Tag className="w-3 h-3 text-white shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border transition-colors select-none',
          styles[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
};
