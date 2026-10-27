import React, { type HTMLAttributes } from 'react';
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
  ref?: React.Ref<HTMLSpanElement>;
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ref,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full font-semibold select-none transition-colors duration-150 leading-none';

  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm',
  };

  const variants: Record<string, string> = {
    default: 'bg-surface-muted text-foreground',
    primary: 'bg-primary-soft text-primary-soft-foreground',
    secondary: 'bg-surface text-foreground',
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    destructive: 'bg-destructive-soft text-destructive-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
    outline: 'border border-border text-foreground bg-transparent',
    draft: 'bg-warning-soft text-warning-soft-foreground',
    pending: 'bg-warning-soft text-warning-soft-foreground',
    active: 'bg-success-soft text-success-soft-foreground',
    completed: 'bg-primary-soft text-primary-soft-foreground',
    cancelled: 'bg-destructive-soft text-destructive-soft-foreground',
    suspended: 'bg-destructive-soft text-destructive-soft-foreground',
  };

  return (
    <span
      ref={ref}
      className={cn(
        baseStyles,
        sizes[size] || sizes.md,
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full bg-current opacity-80 shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
