'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs sm:text-sm font-medium text-foreground flex items-center"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive font-bold" aria-hidden>
            *
          </span>
        )}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<{
              id?: string;
              'aria-invalid'?: boolean;
              'aria-describedby'?: string;
            }>,
            {
              id: htmlFor,
              'aria-invalid': error ? true : undefined,
              'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
            },
          )
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground leading-normal">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-destructive font-medium leading-normal"
        >
          {error}
        </p>
      )}
    </div>
  );
}
