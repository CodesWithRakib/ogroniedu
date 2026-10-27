import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({
  lines = 3,
  testId = 'loading-state',
}: {
  lines?: number;
  testId?: string;
}) {
  return (
    <div role="status" aria-live="polite" data-testid={testId} className="flex flex-col gap-2 py-4">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
