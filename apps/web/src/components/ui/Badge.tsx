import React, { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'info'
    | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors select-none';

    const variants = {
      default: 'bg-surface-muted text-foreground border border-border/60',
      primary: 'bg-primary-soft text-primary-soft-foreground border border-primary/20',
      secondary: 'bg-surface text-foreground border border-border/70',
      success: 'bg-success-soft text-success border border-success/25',
      warning: 'bg-warning-soft text-warning border border-warning/25',
      destructive: 'bg-destructive-soft text-destructive border border-destructive/25',
      info: 'bg-info-soft text-info border border-info/25',
      outline: 'border border-border text-foreground bg-card',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
