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
        'bg-primary/12 text-primary  border border-primary/25',
      warning: 'bg-warning/12 text-warning  border border-warning/25',
      destructive: 'bg-destructive/12 text-destructive  border border-destructive/25',
      info: 'bg-interactive/12 text-interactive  border border-interactive/25',
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
