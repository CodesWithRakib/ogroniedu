'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Composable domain-agnostic table. Feature wrappers own columns + data fetching.
 * Handles loading/error/empty states; responsive via horizontal scroll container.
 */
export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  isLoading,
  errorMessage,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  testId = 'data-table',
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  testId?: string;
}) {
  if (isLoading) return <LoadingState testId={`${testId}-loading`} />;
  if (errorMessage)
    return <ErrorState message={errorMessage} onRetry={onRetry} testId={`${testId}-error`} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
      />
    );
  }
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border "
      data-testid={testId}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-testid={`${testId}-row-${row.id}`}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
