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
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';

export function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  testId = 'table-pagination',
  locale = 'bn',
}: {
  pagination: OffsetPaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  testId?: string;
  locale?: Locale;
}) {
  const isBn = locale === 'bn';
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={testId}
    >
      <p className="text-xs text-muted-foreground" data-testid={`${testId}-summary`}>
        {isBn
          ? `পৃষ্ঠা ${formatLocalizedNumber(pagination.page, locale)} / ${formatLocalizedNumber(pagination.totalPages, locale)} · ${formatLocalizedNumber(pagination.totalItems, locale)}টি`
          : `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.totalItems} items`}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger
              className="h-8 w-24"
              aria-label={isBn ? 'পৃষ্ঠার আকার' : 'Page size'}
              data-testid={`${testId}-page-size`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {isBn ? `${formatLocalizedNumber(n, locale)} / পৃষ্ঠা` : `${n} / page`}
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
          {isBn ? 'পূর্ববর্তী' : 'Previous'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          data-testid={`${testId}-next`}
        >
          {isBn ? 'পরবর্তী' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
