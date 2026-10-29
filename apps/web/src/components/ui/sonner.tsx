'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

export type CustomToasterProps = ToasterProps;

const Toaster = ({
  position = 'top-center',
  duration = 4000,
  closeButton = true,
  richColors = true,
  ...props
}: CustomToasterProps) => {
  return (
    <Sonner
      theme="light"
      position={position}
      duration={duration}
      closeButton={closeButton}
      richColors={richColors}
      className="toaster group font-sans"
      icons={{
        success: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground shadow-xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ),
        info: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-soft-foreground shadow-xs">
            <Info className="h-4 w-4" />
          </div>
        ),
        warning: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground shadow-xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
        ),
        error: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive-soft-foreground shadow-xs">
            <AlertCircle className="h-4 w-4" />
          </div>
        ),
        loading: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground shadow-xs">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-center gap-3.5 rounded-xl border px-4 py-3.5 shadow-sm backdrop-blur-md transition-all duration-300 text-sm font-medium ' +
            'group-[.toaster]:bg-card/95 ' +
            'group-[.toaster]:text-foreground ' +
            'group-[.toaster]:border-border ',
          description: 'text-xs text-muted-foreground font-normal leading-relaxed mt-0.5',
          actionButton:
            'rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition active:scale-95',
          cancelButton:
            'rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover',
          closeButton: 'border-none bg-transparent text-muted-foreground hover:text-foreground',
          success: '!bg-success-soft/95 !border-success/25 !text-success-soft-foreground',
          error: '!bg-destructive-soft/95 !border-destructive/25 !text-destructive-soft-foreground',
          warning: '!bg-warning-soft/95 !border-warning/25 !text-warning-soft-foreground',
          info: '!bg-info-soft/95 !border-info/25 !text-info-soft-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
