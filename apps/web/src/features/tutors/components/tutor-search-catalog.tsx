'use client';

import type { Locale } from '@/lib/i18n';
import { TutorSearchCatalog as DiscoveryTutorSearchCatalog } from '@/features/tutor-discovery/components/tutor-search-catalog';
import type {
  BookingRequestPayload,
  OptionItem,
  SearchCatalogResponse,
  SearchFilters,
} from '../types/tutor-search.types';

/**
 * Props are IDENTICAL to the canonical discovery `TutorSearchCatalogProps`:
 * same field names, same optionality, same callback signatures. Existing
 * routes and specs compile unchanged against this surface.
 */
export interface TutorSearchCatalogProps {
  /** `bn` | `en`; drives dictionary copy and localized number formatting. */
  locale: Locale;
  /** Server snapshot; defaults to `EMPTY_CATALOG` (genuine empty state). */
  initialData?: SearchCatalogResponse;
  /** Student choices for the booking modal (guardian children / self). */
  studentOptions?: OptionItem[];
  /** Education-level choices for the booking modal. */
  levelOptions?: OptionItem[];
  /** When true, the counter shows the loading copy while data refetches. */
  isLoading?: boolean;
  /** Query-level failure surfaced in the `discovery-error` alert. */
  queryError?: string | null;
  /** Container search handler; without it, filtering falls back to client. */
  onSearch?: (filters: SearchFilters) => Promise<SearchCatalogResponse>;
  /** Container booking-submit handler; without it, submission asks sign-in. */
  onSubmitRequest?: (payload: BookingRequestPayload) => Promise<void>;
}

/**
 * Tutor search catalog for the `tutors` feature module (backlog D-4).
 *
 * Thin composer over the canonical discovery catalog: every user-visible
 * contract is inherited verbatim — `tutor-discovery-container`,
 * `results-count-text`, `discovery-error`, the hero copy
 * (`discovery.searchHeading/searchSubheading`), filter/results/modal
 * test ids, i18n keys, and the client-side filter/sort/pagination/booking
 * flows. New `tutors` pieces (`TutorSearchFilters`, `TutorSearchResults`,
 * `TutorCard`, `useTutorSearch`) are exported alongside for incremental
 * adoption; this composer keeps current routes green in the meantime.
 *
 * Deliberately no local state duplication: filter state, page state, score
 * modal state, and booking modal state all live in the canonical catalog,
 * so ranking/filtering/sorting semantics cannot drift between the two
 * import surfaces (`features/tutors` vs `features/tutor-discovery`).
 */
export function TutorSearchCatalog(props: TutorSearchCatalogProps) {
  return <DiscoveryTutorSearchCatalog {...props} />;
}
