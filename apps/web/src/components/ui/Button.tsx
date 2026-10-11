import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] rounded-xl cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-900/20 active:bg-emerald-900',
        default:
          'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-900/20 active:bg-emerald-900',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        outline:
          'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50',
        ghost:
          'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:bg-rose-800',
        link: 'text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400',
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
