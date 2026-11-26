'use client';
import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  leftIcon?: React.ReactNode;
}

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/30 shadow-sm',
  outline:
    'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent',
  secondary:
    'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 shadow-sm'
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs h-7',
  sm: 'px-3.5 py-1.5 text-xs h-9',
  md: 'px-4 py-2 text-sm h-10',
  lg: 'px-6 py-2.5 text-base h-12'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', glow = false, leftIcon, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:pointer-events-none gap-1.5 whitespace-nowrap cursor-pointer',
        variants[variant],
        sizes[size],
        glow && 'shadow-glow',
        className
      )}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
