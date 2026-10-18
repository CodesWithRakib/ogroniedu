import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] rounded-xl cursor-pointer text-sm',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:opacity-95',
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:opacity-95',
        secondary:
          'bg-surface-muted text-foreground hover:bg-surface-hover border border-transparent active:bg-surface-muted',
        outline:
          'border border-border bg-card text-foreground hover:bg-surface-hover hover:border-input active:bg-surface-muted',
        ghost: 'bg-transparent text-foreground hover:bg-surface-hover hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 active:opacity-95',
        warning: 'bg-warning text-white hover:bg-warning/90 active:opacity-95',
        link: 'text-interactive underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        xs: 'h-7 text-xs px-2.5 gap-1 rounded-lg',
        sm: 'h-8 text-xs px-3 gap-1.5',
        md: 'h-9 text-xs sm:text-sm px-3.5 sm:px-4 gap-2',
        default: 'h-9 text-xs sm:text-sm px-3.5 sm:px-4 gap-2',
        lg: 'h-11 text-sm sm:text-base px-5 sm:px-6 gap-2.5 font-semibold',
        icon: 'h-9 w-9 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
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
        {asChild ? (
          <Slottable>{children}</Slottable>
        ) : (
          <>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
            )}
            {children}
          </>
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
