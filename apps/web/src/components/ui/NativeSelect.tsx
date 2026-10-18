'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Extra classes for the positioning wrapper (use for width control, e.g. `w-auto`). */
  wrapperClassName?: string;
}

/**
 * NativeSelect — the shared styled native `<select>`.
 *
 * Feature pages must not hand-roll raw `<select>` elements: this component is
 * the single home for the native control, matching the visual language of the
 * Radix `Select` primitive (h-10, rounded-xl, single border weight, standard
 * focus ring). Native semantics are preserved on purpose (real `<option>`
 * elements, form autofill, and automation `selectOption` compatibility).
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative flex w-full items-center', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full cursor-pointer appearance-none rounded-xl border border-input bg-card pl-3.5 pr-9 text-sm text-foreground outline-none transition-colors duration-150 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
