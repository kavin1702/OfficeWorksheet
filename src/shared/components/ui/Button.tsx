'use client';
import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', glow = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none gap-1.5 whitespace-nowrap cursor-pointer';

    const variants = {
      primary: 'bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/30 shadow-sm',
      outline: 'bg-white/5 dark:bg-dark-elevated hover:bg-white/10 dark:hover:bg-dark-surface border border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-200',
      ghost: 'bg-transparent hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-transparent',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700',
      danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 shadow-sm'
    };

    const sizes = {
      xs: 'px-2.5 py-1 text-xs h-7',
      sm: 'px-3.5 py-1.5 text-xs h-9',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-2.5 text-base h-12'
    };

    const glowStyle = glow ? 'shadow-glow hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]' : '';

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], glowStyle, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';