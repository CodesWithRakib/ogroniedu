'use client';

import React from 'react';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useUrlTableState } from '@/hooks/use-url-table-state';
import {
  useSearchTutorsQuery,
  type SearchTutorsParams,
  type TutorSearchItem,
} from '@/store/services/tutors-api';
import { parseOffsetCollection } from '@/lib/api/parse';
import type { ParsedOffsetCollection } from '@/lib/api/contract';
import {
  toSearchTutorsParams,
  type TutorSearchFilterParams,
} from '../types/tutor-search.types';

export interface UseTutorSearchOptions {
  /** Seed for `?q=` when the URL carries no search param. */
  initialQ?: string;
  /** Page size for `?pageSize=` when the URL carries none. Defaults to 12. */
  limit?: number;
  /** Controlled UI filters; when omitted the hook keeps an empty default. */
  filters?: TutorSearchFilterParams;
}

export interface UseTutorSearchResult {
  /** Raw search text mirrored from `?q=` (updates instantly while typing). */
  search: string;
  /** Debounced search text actually sent to the API (350ms). */
  debouncedSearch: string;
  /** Current 1-based page mirrored from `?page=`. */
  page: number;
  /** Current page size mirrored from `?pageSize=`. */
  pageSize: number;
  /** Effective RTK Query params (debounced query + filters + pagination). */
  params: SearchTutorsParams;
  /** Raw RTK Query result for `useSearchTutorsQuery` (loading/error flags). */
  query: ReturnType<typeof useSearchTutorsQuery>;
  /** Tutors parsed via `parseOffsetCollection` (canonical + legacy shapes). */
  tutors: TutorSearchItem[];
  /** Pagination parsed via `parseOffsetCollection` (never mocked). */
  parsed: ParsedOffsetCollection<TutorSearchItem>;
  /** Update `?q=` (resets to page 1). Debounce before the request fires. */
  setSearch: (value: string) => void;
  /** Update `?page=` (clamped to >= 1 by the URL state hook). */
  setPage: (page: number) => void;
}

/**
 * URL-synced tutor search: `?q=` (debounced 350ms) + `?page=`/`?pageSize=`
 * via `useUrlTableState`, data via `useSearchTutorsQuery`, envelope parsing
 * via `parseOffsetCollection`. Ranking/filtering/sorting semantics are owned
 * by the server; this hook only threads params through.
 */
export function useTutorSearch(options: UseTutorSearchOptions = {}): UseTutorSearchResult {
  const { initialQ = '', limit = 12, filters } = options;
  const { state, setState } = useUrlTableState({ search: initialQ, page: 1, pageSize: limit });

  const debouncedSearch = useDebouncedSearch(state.search, 350);

  const params = React.useMemo<SearchTutorsParams>(
    () =>
      toSearchTutorsParams(
        {
          query: debouncedSearch,
          modeFilter: filters?.modeFilter ?? '',
          sortBy: filters?.sortBy ?? 'recommended',
          minPrice: filters?.minPrice ?? '',
          maxPrice: filters?.maxPrice ?? '',
        },
        state.page,
        state.pageSize,
      ),
    [
      debouncedSearch,
      filters?.modeFilter,
      filters?.sortBy,
      filters?.minPrice,
      filters?.maxPrice,
      state.page,
      state.pageSize,
    ],
  );

  const query = useSearchTutorsQuery(params, { refetchOnMountOrArgChange: true });

  const parsed = React.useMemo<ParsedOffsetCollection<TutorSearchItem>>(
    () => parseOffsetCollection<TutorSearchItem>(query.data),
    [query.data],
  );

  const setSearch = React.useCallback(
    (value: string) => setState({ search: value }, { resetPage: true }),
    [setState],
  );
  const setPage = React.useCallback((page: number) => setState({ page }), [setState]);

  return {
    search: state.search,
    debouncedSearch,
    page: state.page,
    pageSize: state.pageSize,
    params,
    query,
    tutors: parsed.items,
    parsed,
    setSearch,
    setPage,
  };
}
