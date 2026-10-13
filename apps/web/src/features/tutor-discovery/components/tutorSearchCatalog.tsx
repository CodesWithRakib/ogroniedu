'use client';

import React, { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { TutorFiltersForm, type TutorFiltersValue } from './tutorFiltersForm';
import { TutorResultsGrid } from './tutorResultsGrid';
import { ScoreBreakdownModal } from './scoreBreakdownModal';
import { BookingRequestModal, type BookingFormValue } from './bookingRequestModal';
import { filterCatalog } from '../utils/catalog-filter';
import {
  EMPTY_CATALOG,
  type OptionItem,
  type SearchCatalogResponse,
  type SearchFilters,
  type TutorCardData,
} from '../types/tutor-discovery.types';

interface TutorSearchCatalogProps {
  locale: Locale;
  initialData?: SearchCatalogResponse;
  studentOptions?: OptionItem[];
  levelOptions?: OptionItem[];
  isLoading?: boolean;
  queryError?: string | null;
  onSearch?: (filters: SearchFilters) => Promise<SearchCatalogResponse>;
  onSubmitRequest?: (payload: {
    tutorId: string;
    studentId: string;
    subjectId: string;
    educationLevelId: string;
    mode: 'in_person' | 'online' | 'hybrid';
    messageNotes?: string;
    preferredDays?: string[];
  }) => Promise<void>;
}

const INITIAL_FILTERS: TutorFiltersValue = {
  query: '',
  modeFilter: '',
  sortBy: 'recommended',
  minPrice: '',
  maxPrice: '',
};

export function TutorSearchCatalog({
  locale,
  initialData = EMPTY_CATALOG,
  studentOptions = [],
  levelOptions = [],
  isLoading = false,
  queryError = null,
  onSearch,
  onSubmitRequest,
}: TutorSearchCatalogProps) {
  const dict = getDictionary(locale);
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<TutorFiltersValue>(INITIAL_FILTERS);
  const [results, setResults] = useState<SearchCatalogResponse>(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeScoreTutor, setActiveScoreTutor] = useState<TutorCardData | null>(null);
  const [selectedTutorForBooking, setSelectedTutorForBooking] = useState<TutorCardData | null>(
    null,
  );
  const [bookingForm, setBookingForm] = useState<BookingFormValue>({
    studentId: '',
    subjectId: '',
    levelId: '',
    mode: 'online',
    notes: '',
    days: [],
  });
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Sync locally managed results whenever the container delivers fresh API data.
  React.useEffect(() => {
    setResults(initialData);
  }, [initialData]);

  const patchFilters = (patch: Partial<TutorFiltersValue>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const buildFilters = (page: number): SearchFilters => ({
    q: filters.query.trim() || undefined,
    mode: filters.modeFilter || undefined,
    sortBy: filters.sortBy,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    page,
  });

  const handleFilterSubmit = () => {
    startTransition(async () => {
      if (onSearch) {
        try {
          const res = await onSearch(buildFilters(1));
          setResults(res);
          setCurrentPage(1);
          setSearchError(null);
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : String(err));
        }
      } else {
        setResults(
          filterCatalog(initialData, {
            query: filters.query,
            modeFilter: filters.modeFilter,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            sortBy: filters.sortBy,
          }),
        );
        setCurrentPage(1);
      }
    });
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setResults(initialData);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > results.totalPages) return;
    setCurrentPage(newPage);
    if (onSearch) {
      startTransition(async () => {
        const res = await onSearch(buildFilters(newPage));
        setResults(res);
      });
    }
  };

  const handleOpenBookingModal = (tutor: TutorCardData) => {
    setSelectedTutorForBooking(tutor);
    setBookingForm({
      studentId: studentOptions[0]?.id ?? '',
      subjectId: tutor.subjects[0]?.subjectId ?? '',
      levelId: levelOptions[0]?.id ?? '',
      mode: tutor.teachingModes.includes('online')
        ? 'online'
        : (tutor.teachingModes[0] as BookingFormValue['mode']) || 'in_person',
      notes: '',
      days: [],
    });
    setBookingSuccessMessage(null);
    setBookingError(null);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutorForBooking) return;

    setIsSubmittingBooking(true);
    setBookingError(null);
    try {
      if (!onSubmitRequest) {
        throw new Error(
          locale === 'bn' ? 'অনুরোধ পাঠাতে লগইন করুন।' : 'Sign in to send a tutoring request.',
        );
      }
      await onSubmitRequest({
        tutorId: selectedTutorForBooking.id,
        studentId: bookingForm.studentId,
        subjectId: bookingForm.subjectId,
        educationLevelId: bookingForm.levelId,
        mode: bookingForm.mode,
        messageNotes: bookingForm.notes,
        preferredDays: bookingForm.days,
      });
      setBookingSuccessMessage(
        dict.bookingRequest?.requestSuccess || 'Tutoring request submitted successfully!',
      );
      setTimeout(() => {
        setSelectedTutorForBooking(null);
        setBookingSuccessMessage(null);
      }, 2000);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const toggleDay = (dayKey: string) =>
    setBookingForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayKey)
        ? prev.days.filter((d) => d !== dayKey)
        : [...prev.days, dayKey],
    }));

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8"
      data-testid="tutor-discovery-container"
    >
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-medium text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NID &amp; Academic Verified Educators</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {dict.discovery?.searchHeading || 'Find Verified Qualified Tutors'}
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            {dict.discovery?.searchSubheading ||
              'Browse vetted educators across Bangladesh with transparent pricing and credential breakdown'}
          </p>
        </div>
      </div>

      <TutorFiltersForm
        locale={locale}
        value={filters}
        isPending={isPending}
        onChange={patchFilters}
        onSubmit={handleFilterSubmit}
        onReset={handleResetFilters}
      />

      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span data-testid="results-count-text">
          {isLoading
            ? dict.common?.loading || 'Loading...'
            : dict.discovery?.resultsCount
              ? dict.discovery.resultsCount.replace(
                  '{count}',
                  formatLocalizedNumber(results.total, locale),
                )
              : `Showing ${results.total} tutors`}
        </span>
      </div>
      {(queryError || searchError) && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          data-testid="discovery-error"
        >
          {queryError || searchError}
        </div>
      )}

      <TutorResultsGrid
        tutors={results.data}
        locale={locale}
        currentPage={currentPage}
        totalPages={results.totalPages}
        onShowScore={setActiveScoreTutor}
        onRequestBooking={handleOpenBookingModal}
        onPageChange={handlePageChange}
        onReset={handleResetFilters}
      />

      {activeScoreTutor && (
        <ScoreBreakdownModal
          tutor={activeScoreTutor}
          locale={locale}
          onClose={() => setActiveScoreTutor(null)}
        />
      )}

      {selectedTutorForBooking && (
        <BookingRequestModal
          tutor={selectedTutorForBooking}
          locale={locale}
          studentOptions={studentOptions}
          levelOptions={levelOptions}
          value={bookingForm}
          isSubmitting={isSubmittingBooking}
          successMessage={bookingSuccessMessage}
          error={bookingError}
          onChange={(patch) => setBookingForm((prev) => ({ ...prev, ...patch }))}
          onToggleDay={toggleDay}
          onSubmit={handleSubmitBooking}
          onClose={() => setSelectedTutorForBooking(null)}
        />
      )}
    </div>
  );
}
