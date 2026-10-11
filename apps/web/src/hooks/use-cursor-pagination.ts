'use client';

import React from 'react';
import { parseCursorCollection } from '@/lib/api/parse';

interface CursorQueryResult {
  data?: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
}

/**
 * Infinite-scroll / chat-history helper over cursor-paginated RTK Query results.
 * Accumulates pages locally; caller advances `cursor` to fetch the next page.
 */
export function useCursorPagination<T>(result: CursorQueryResult) {
  const [accumulated, setAccumulated] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);

  const parsed = React.useMemo(() => {
    if (!result.data) return null;
    try {
      return parseCursorCollection<T>(result.data);
    } catch {
      return null;
    }
  }, [result.data]);

  React.useEffect(() => {
    if (parsed) {
      setAccumulated((prev) => (cursor === null ? parsed.items : [...prev, ...parsed.items]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const loadMore = React.useCallback(() => {
    if (parsed?.hasNextPage && parsed.nextCursor) setCursor(parsed.nextCursor);
  }, [parsed]);

  const reset = React.useCallback(() => {
    setAccumulated([]);
    setCursor(null);
  }, []);

  return {
    items: accumulated,
    cursor,
    hasNextPage: parsed?.hasNextPage ?? false,
    isLoading: result.isLoading,
    isFetching: result.isFetching ?? false,
    isError: result.isError,
    error: result.error,
    loadMore,
    reset,
    refetch: result.refetch,
  };
}
