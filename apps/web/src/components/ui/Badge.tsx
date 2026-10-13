import React, { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors';

    const variants = {
      default: 'bg-surface-muted text-foreground border border-border/80',
      primary: 'bg-primary-soft text-primary-soft-foreground border border-primary/25',
      success:
        'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
      warning:
        'bg-amber-500/12 text-amber-800 dark:text-amber-300 border border-amber-500/25',
      destructive:
        'bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/25',
      info: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25',
      outline: 'border border-border text-foreground bg-card/60 backdrop-blur-xs',
    };

    return (
      <span
        ref={ref}
        className={twMerge(clsx(baseStyles, variants[variant], className))}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
