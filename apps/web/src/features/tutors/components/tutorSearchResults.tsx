'use client';

import type { Locale } from '@/lib/i18n';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { TutorResultsGrid } from '@/features/tutor-discovery/components/tutorResultsGrid';
import type { TutorCardData } from '../types/tutor-search.types';

export interface TutorSearchResultsProps {
  tutors: TutorCardData[];
  locale: Locale;
  currentPage: number;
  totalPages: number;
  /** When true and there is nothing to show yet, render skeleton rows. */
  isLoading?: boolean;
  /** When set, render the shared error state (keeps `discovery-error` id). */
  queryError?: string | null;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
  onPageChange: (page: number) => void;
  onReset: () => void;
}

/**
 * Tutor search results for the `tutors` feature module.
 *
 * The populated/empty/pagination rendering delegates to the canonical
 * `TutorResultsGrid`, preserving `tutors-grid`, `pagination-controls`,
 * `pagination-prev-btn`, `page-indicator`, `pagination-next-btn`, and the
 * grid empty-state copy (`discovery.noResults*`). The shared `LoadingState`
 * / `ErrorState` are used only for the two genuinely-fitting branches:
 * first-load skeletons (no rows yet) and query failures surfaced with the
 * legacy `discovery-error` test id so existing specs keep passing.
 * `DataTable`/`TablePagination` were deliberately NOT force-fit here: the
 * card grid + pager contract above is asserted by tests and must not drift.
 */
export function TutorSearchResults({
  tutors,
  locale,
  currentPage,
  totalPages,
  isLoading = false,
  queryError = null,
  onShowScore,
  onRequestBooking,
  onPageChange,
  onReset,
}: TutorSearchResultsProps) {
  if (queryError) {
    return <ErrorState message={queryError} testId="discovery-error" />;
  }

  if (isLoading && tutors.length === 0) {
    return <LoadingState lines={6} testId="tutor-search-loading" />;
  }

  return (
    <TutorResultsGrid
      tutors={tutors}
      locale={locale}
      currentPage={currentPage}
      totalPages={totalPages}
      onShowScore={onShowScore}
      onRequestBooking={onRequestBooking}
      onPageChange={onPageChange}
      onReset={onReset}
    />
  );
}
