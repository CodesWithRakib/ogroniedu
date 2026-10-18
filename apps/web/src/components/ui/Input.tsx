'use client';

import React, { forwardRef, type InputHTMLAttributes, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      errorMessage,
      leadingIcon,
      trailingIcon,
      showPasswordToggle = true,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(errorMessage);
    const isPasswordType = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    const resolvedType = isPasswordType && showPassword ? 'text' : type;

    const inputElement = (
      <div className="relative w-full">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={cn(
            'block w-full h-10 rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:border-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground',
            leadingIcon && 'pl-10',
            (isPasswordType && showPasswordToggle) || trailingIcon ? 'pr-10' : '',
            hasError
              ? 'border-destructive focus-visible:ring-destructive/25 focus-visible:border-destructive'
              : 'border-input hover:border-muted-foreground/40',
            className,
          )}
          {...props}
        />
        {isPasswordType && showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-lg"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff
                className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-hidden="true"
              />
            ) : (
              <Eye
                className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-hidden="true"
              />
            )}
          </button>
        ) : trailingIcon ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground"
            aria-hidden="true"
          >
            {trailingIcon}
          </div>
        ) : null}
      </div>
    );

    // If no label, error, or helper is provided, return input element directly
    if (!label && !errorMessage && !helperText) {
      return inputElement;
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label
            htmlFor={inputId}
            required={required}
            className="block text-xs sm:text-sm font-semibold text-foreground"
          >
            {label}
          </Label>
        )}
        {inputElement}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-xs text-destructive font-medium"
          >
            {errorMessage}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
