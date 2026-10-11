'use client';

import React from 'react';
import { parseOffsetCollection } from '@/lib/api/parse';
import type { OffsetPaginationMeta } from '@/lib/api/contract';

export interface OffsetPage<T> {
  items: T[];
  pagination: OffsetPaginationMeta;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
}

interface OffsetQueryResult {
  data?: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
}

/**
 * Adapt any RTK Query offset-collection result into stable page state.
 * The query hook owns fetching/caching; this hook owns parsing + navigation.
 */
export function useOffsetPagination<T>(
  result: OffsetQueryResult,
  nav: { page: number; onPageChange: (page: number) => void },
  formatError: (error: unknown) => string = () => 'Failed to load.',
): OffsetPage<T> {
  const parsed = React.useMemo(() => {
    if (!result.data) {
      return {
        items: [] as T[],
        pagination: {
          strategy: 'offset',
          page: nav.page,
          pageSize: 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        } as OffsetPaginationMeta,
      };
    }
    try {
      const p = parseOffsetCollection<T>(result.data);
      return { items: p.items, pagination: p.pagination };
    } catch {
      return {
        items: [] as T[],
        pagination: {
          strategy: 'offset',
          page: nav.page,
          pageSize: 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        } as OffsetPaginationMeta,
      };
    }
  }, [result.data, nav.page]);

  return {
    items: parsed.items,
    pagination: parsed.pagination,
    isLoading: result.isLoading,
    isFetching: result.isFetching ?? false,
    isError: result.isError,
    errorMessage: result.isError ? formatError(result.error) : null,
    refetch: result.refetch,
    nextPage: () => {
      if (parsed.pagination.hasNextPage) nav.onPageChange(nav.page + 1);
    },
    prevPage: () => {
      if (parsed.pagination.hasPreviousPage) nav.onPageChange(nav.page - 1);
    },
    setPage: nav.onPageChange,
  };
}
