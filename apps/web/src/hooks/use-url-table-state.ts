'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UrlTableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Shareable table state synced to URL query params (?page=&pageSize=&q=&sortBy=&sortOrder=).
 * Debounce search at the caller with useDebouncedSearch before passing to queries.
 */
export function useUrlTableState(defaults?: Partial<UrlTableState>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state: UrlTableState = React.useMemo(() => {
    const get = (k: string) => searchParams.get(k);
    return {
      page: Math.max(1, Number(get('page')) || defaults?.page || 1),
      pageSize: Math.min(100, Math.max(1, Number(get('pageSize')) || defaults?.pageSize || 20)),
      search: get('q') ?? defaults?.search ?? '',
      sortBy: get('sortBy') ?? defaults?.sortBy,
      sortOrder: (get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    };
  }, [searchParams, defaults?.page, defaults?.pageSize, defaults?.search, defaults?.sortBy]);

  const setState = React.useCallback(
    (patch: Partial<UrlTableState>, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString());
      const merged: UrlTableState = {
        ...state,
        ...patch,
        page: opts?.resetPage ? 1 : (patch.page ?? state.page),
      };
      next.set('page', String(merged.page));
      next.set('pageSize', String(merged.pageSize));
      if (merged.search) next.set('q', merged.search);
      else next.delete('q');
      if (merged.sortBy) next.set('sortBy', merged.sortBy);
      else next.delete('sortBy');
      next.set('sortOrder', merged.sortOrder ?? 'desc');
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, state],
  );

  const resetAll = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { state, setState, resetAll };
}
