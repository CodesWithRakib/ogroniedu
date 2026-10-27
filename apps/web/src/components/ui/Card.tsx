import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({ className, variant = 'default', ref, ...props }: CardProps) {
  const variantStyles = {
    // Borders carry separation; shadows are reserved for genuinely floating surfaces.
    default: 'border border-border bg-card text-card-foreground',
    elevated: 'border border-border bg-card text-card-foreground shadow-sm',
    subtle: 'border border-border bg-surface text-card-foreground',
    interactive:
      'border border-border bg-card text-card-foreground hover:border-primary/30 hover:shadow-xs transition-[border-color,box-shadow,transform] duration-150 cursor-pointer',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-5 sm:p-6 transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
Card.displayName = 'Card';

export function CardHeader({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 pb-3', className)} {...props} />;
}
CardHeader.displayName = 'CardHeader';

export function CardTitle({
  className,
  children,
  ref,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }) {
  return (
    <h3
      ref={ref}
      className={cn('text-base sm:text-lg font-semibold tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
CardTitle.displayName = 'CardTitle';

export function CardDescription({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) {
  return (
    <p
      ref={ref}
      className={cn('text-xs sm:text-sm text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  );
}
CardDescription.displayName = 'CardDescription';

export function CardContent({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref} className={cn('pt-0', className)} {...props} />;
}
CardContent.displayName = 'CardContent';

export function CardFooter({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn('flex items-center pt-3 border-t border-border mt-3', className)}
      {...props}
    />
  );
}
CardFooter.displayName = 'CardFooter';
