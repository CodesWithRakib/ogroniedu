'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Label as LabelPrimitive } from 'radix-ui';

export interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean;
}

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'inline-flex items-center gap-1 text-xs sm:text-sm leading-none font-semibold select-none text-foreground group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive font-bold ml-0.5 select-none" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
