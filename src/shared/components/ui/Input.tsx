'use client';
import React, { useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  /** @deprecated use leftIcon */
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, leftIcon, icon, id, type = 'text', ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const iconNode = leftIcon ?? icon;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {label}
            {props.required && <span className="text-rose-500"> *</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {iconNode && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">{iconNode}</div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400',
              iconNode ? 'pl-9 pr-3' : 'px-3',
              className
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';
