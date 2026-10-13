import type {
  SearchTutorsParams,
  TutorSearchItem,
} from '@/store/services/tutors-api';
import type {
  BookingRequestPayload,
  OptionItem,
  SearchCatalogResponse,
  SearchFilters,
  TutorCardData,
  TutorSortKey,
} from '@/features/tutor-discovery/types/tutor-discovery.types';

// Re-export discovery shapes so `features/tutors` consumers have a single
// import surface without duplicating the canonical type definitions.
export type {
  BookingRequestPayload,
  OptionItem,
  SearchCatalogResponse,
  SearchFilters,
  SearchTutorsParams,
  TutorCardData,
  TutorSearchItem,
  TutorSortKey,
};

/**
 * UI filter state for the tutor search form. Field names intentionally match
 * `TutorFiltersValue` in tutor-discovery so the two stay assignable; the
 * canonical API mapping lives in `toSearchTutorsParams` below.
 */
export interface TutorSearchFilterParams {
  query: string;
  modeFilter: string;
  sortBy: TutorSortKey;
  minPrice: string;
  maxPrice: string;
}

export const DEFAULT_TUTOR_SEARCH_FILTERS: TutorSearchFilterParams = {
  query: '',
  modeFilter: '',
  sortBy: 'recommended',
  minPrice: '',
  maxPrice: '',
};

function toOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toMode(
  raw: string,
): SearchTutorsParams['mode'] {
  return raw === 'in_person' || raw === 'online' || raw === 'hybrid' ? raw : undefined;
}

function toSort(
  raw: TutorSortKey,
): NonNullable<SearchTutorsParams['sort']> {
  if (raw === 'price_asc' || raw === 'price_desc' || raw === 'experience_desc') return raw;
  return 'recommended';
}

/**
 * Map UI filter state to the `useSearchTutorsQuery` params. Preserves the
 * exact semantics of the discovery container: trimmed free-text query,
 * optional mode/sort, numeric price bounds, 1-based page.
 */
export function toSearchTutorsParams(
  filters: TutorSearchFilterParams,
  page: number,
  limit: number,
): SearchTutorsParams {
  const trimmedQuery = filters.query.trim();
  return {
    q: trimmedQuery ? trimmedQuery : undefined,
    mode: toMode(filters.modeFilter),
    sort: toSort(filters.sortBy),
    minPrice: toOptionalNumber(filters.minPrice),
    maxPrice: toOptionalNumber(filters.maxPrice),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    limit: Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 12,
  };
}

/** Narrow an opaque query payload to a tutor list (never throws, never fakes). */
export function asTutorSearchItems(payload: unknown): TutorSearchItem[] {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: TutorSearchItem[] }).data;
  }
  return [];
}
