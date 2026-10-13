import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] rounded-xl cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/25 active:opacity-95',
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/25 active:opacity-95',
        secondary:
          'bg-surface-muted text-foreground hover:bg-surface-hover border border-border/50 active:bg-surface-muted',
        outline:
          'border border-border bg-card/60 text-foreground hover:bg-surface-hover hover:border-primary/40 backdrop-blur-xs',
        ghost:
          'bg-transparent text-foreground hover:bg-surface-hover',
        destructive:
          'bg-destructive text-white hover:opacity-90 shadow-sm shadow-destructive/20 active:opacity-95',
        link:
          'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 gap-1.5',
        md: 'text-sm px-4 py-2.5 gap-2',
        default: 'text-sm px-4 py-2.5 gap-2',
        lg: 'text-base px-6 py-3.5 gap-2.5',
        icon: 'h-9 w-9 p-0',
        xs: 'text-xs px-2.5 py-1 gap-1',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
