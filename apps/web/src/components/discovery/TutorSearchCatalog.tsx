'use client';

import type { Locale } from '@/lib/i18n';
import type {
  BookingRequestPayload,
  OptionItem,
  SearchCatalogResponse,
  SearchFilters,
} from '@/features/tutors/types/tutor-search.types';
import {
  TutorSearchCatalog as TutorsCatalog,
} from '@/features/tutors/components/tutor-search-catalog';

/**
 * Props are IDENTICAL to the feature catalog props (which mirror the
 * canonical discovery catalog): same fields, same optionality, same
 * callback signatures. This path exists for backlog D-4 compatibility so
 * any legacy `components/discovery/TutorSearchCatalog` import keeps
 * compiling and rendering byte-identical output.
 */
export interface TutorSearchCatalogProps {
  locale: Locale;
  initialData?: SearchCatalogResponse;
  studentOptions?: OptionItem[];
  levelOptions?: OptionItem[];
  isLoading?: boolean;
  queryError?: string | null;
  onSearch?: (filters: SearchFilters) => Promise<SearchCatalogResponse>;
  onSubmitRequest?: (payload: BookingRequestPayload) => Promise<void>;
}

/**
 * Legacy `components/discovery` entry point. Thin composer over the
 * `features/tutors` catalog (which itself composes the canonical
 * discovery pieces): no logic, no fake data, no behavior drift — every
 * `data-testid`, i18n key, and user-visible flow is inherited verbatim.
 *
 * Preserved contract (mirrors the feature catalog exactly):
 * - `tutor-discovery-container` root, `results-count-text` counter with
 *   `discovery.resultsCount` `{count}` interpolation, `discovery-error`
 *   alert for `queryError`/search failures.
 * - Filter form ids: `discovery-filters-form`, `search-query-input`,
 *   `mode-select`, `sort-by-select`, `apply-filters-button`,
 *   `reset-filters-button`, `min-price-input`, `max-price-input`.
 * - Results ids: `tutors-grid`, `pagination-controls`,
 *   `pagination-prev-btn`, `page-indicator`, `pagination-next-btn`.
 * - Card ids: `tutor-card-{id}`, `match-score-badge-{id}`,
 *   `request-tutoring-btn-{id}`; modals: `score-breakdown-modal`,
 *   `booking-request-modal`, `booking-request-form`.
 */
export function TutorSearchCatalog(props: TutorSearchCatalogProps) {
  return <TutorsCatalog {...props} />;
}

export default TutorSearchCatalog;
