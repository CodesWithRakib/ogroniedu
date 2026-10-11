'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ErrorState({
  message,
  onRetry,
  testId = 'error-state',
}: {
  message: string;
  onRetry?: () => void;
  testId?: string;
}) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-rose-500" aria-hidden />
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
