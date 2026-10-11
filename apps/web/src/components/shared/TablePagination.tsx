'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OffsetPaginationMeta } from '@/lib/api/contract';

export function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  testId = 'table-pagination',
}: {
  pagination: OffsetPaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid={testId}>
      <p className="text-xs text-slate-500" data-testid={`${testId}-summary`}>
        Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} items
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-24" aria-label="Page size" data-testid={`${testId}-page-size`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          data-testid={`${testId}-prev`}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          data-testid={`${testId}-next`}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
