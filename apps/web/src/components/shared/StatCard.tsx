import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCard({
  label,
  value,
  hint,
  isLoading,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  isLoading?: boolean;
  testId?: string;
}) {
  return (
    <Card data-testid={testId} className="p-4 sm:p-5">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-1">
        {isLoading ? (
          <Skeleton className="h-8 w-24 rounded-lg" />
        ) : (
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
            {value}
          </p>
        )}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
