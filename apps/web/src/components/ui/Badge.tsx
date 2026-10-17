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
    | 'outline'
    | 'draft'
    | 'pending'
    | 'active'
    | 'completed'
    | 'cancelled'
    | 'suspended';
  size?: 'sm' | 'md' | 'lg' | string;
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center gap-1.5 rounded-full font-semibold select-none transition-colors duration-150 leading-none';

    const sizes: Record<string, string> = {
      sm: 'px-2.5 py-0.5 text-[10px]',
      md: 'px-3 py-1 text-xs',
      lg: 'px-3.5 py-1.5 text-sm',
    };

    const variants: Record<string, string> = {
      default: 'bg-surface-muted text-foreground border border-border/70',
      primary: 'bg-primary-soft text-primary-soft-foreground border border-primary/25',
      secondary: 'bg-surface text-foreground border border-border/70',
      success: 'bg-success-soft text-success border border-success/30',
      warning: 'bg-warning-soft text-warning-soft-foreground border border-warning/30', // Warm pastel peach/amber matching Image 2
      destructive: 'bg-destructive-soft text-destructive border border-destructive/30',
      info: 'bg-info-soft text-info border border-info/30',
      outline: 'border border-border text-foreground bg-card',
      draft: 'bg-warning-soft text-warning-soft-foreground border border-warning/30',
      pending: 'bg-warning-soft text-warning border border-warning/25',
      active: 'bg-success-soft text-success border border-success/30',
      completed: 'bg-primary-soft text-primary-soft-foreground border border-primary/25',
      cancelled: 'bg-destructive-soft text-destructive border border-destructive/30',
      suspended: 'bg-destructive-soft text-destructive border border-destructive/30',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, sizes[size] || sizes.md, variants[variant] || variants.default, className)}
        {...props}
      >
        {dot && (
          <span className="size-1.5 rounded-full bg-current opacity-80 shrink-0" />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
