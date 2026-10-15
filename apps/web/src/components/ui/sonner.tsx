'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

export type CustomToasterProps = ToasterProps;

const Toaster = ({
  position = 'top-center',
  duration = 4000,
  closeButton = true,
  richColors = true,
  ...props
}: CustomToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position={position}
      duration={duration}
      closeButton={closeButton}
      richColors={richColors}
      className="toaster group font-sans"
      icons={{
        success: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ),
        info: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 shadow-xs dark:bg-sky-950/60 dark:text-sky-400">
            <Info className="h-4 w-4" />
          </div>
        ),
        warning: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 shadow-xs dark:bg-amber-950/60 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        ),
        error: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 shadow-xs dark:bg-rose-950/60 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
          </div>
        ),
        loading: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 text-sm font-medium ' +
            'group-[.toaster]:bg-white/95 dark:group-[.toaster]:bg-slate-900/95 ' +
            'group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-slate-100 ' +
            'group-[.toaster]:border-slate-200/90 dark:group-[.toaster]:border-slate-800/90 ' +
            'group-[.toaster]:shadow-emerald-950/5 dark:group-[.toaster]:shadow-black/40',
          description:
            'text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed mt-0.5',
          actionButton:
            'rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 active:scale-95',
          cancelButton:
            'rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          closeButton:
            'border-none bg-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200',
          success:
            '!bg-emerald-50/95 dark:!bg-emerald-950/80 !border-emerald-200 dark:!border-emerald-800/60 !text-emerald-950 dark:!text-emerald-100',
          error:
            '!bg-rose-50/95 dark:!bg-rose-950/80 !border-rose-200 dark:!border-rose-800/60 !text-rose-950 dark:!text-rose-100',
          warning:
            '!bg-amber-50/95 dark:!bg-amber-950/80 !border-amber-200 dark:!border-amber-800/60 !text-amber-950 dark:!text-amber-100',
          info: '!bg-sky-50/95 dark:!bg-sky-950/80 !border-sky-200 dark:!border-sky-800/60 !text-sky-950 dark:!text-sky-100',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
