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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground shadow-xs mt-0.5">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ),
        info: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-soft-foreground shadow-xs mt-0.5">
            <Info className="h-4 w-4" />
          </div>
        ),
        warning: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-soft-foreground shadow-xs mt-0.5">
            <AlertTriangle className="h-4 w-4" />
          </div>
        ),
        error: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-destructive-soft text-destructive-soft-foreground shadow-xs mt-0.5">
            <AlertCircle className="h-4 w-4" />
          </div>
        ),
        loading: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground shadow-xs mt-0.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg backdrop-blur-xl transition-all duration-300 text-xs sm:text-sm font-medium w-full max-w-[calc(100vw-32px)] sm:max-w-md ' +
            'group-[.toaster]:bg-card/95 ' +
            'group-[.toaster]:text-foreground ' +
            'group-[.toaster]:border-border/80 ',
          title: 'font-bold text-foreground text-xs sm:text-sm leading-snug',
          description: 'text-xs text-muted-foreground font-normal leading-relaxed mt-1',
          actionButton:
            'rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition active:scale-95',
          cancelButton:
            'rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover',
          closeButton: 'border-none bg-surface-muted hover:bg-surface-hover text-muted-foreground hover:text-foreground rounded-lg p-1',
          success: '!bg-card/98 !border-success/30 !text-foreground',
          error: '!bg-card/98 !border-destructive/30 !text-foreground',
          warning: '!bg-card/98 !border-warning/30 !text-foreground',
          info: '!bg-card/98 !border-info/30 !text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
