'use client';

import React, { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui';
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

  const isBn = locale === 'bn';

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8"
      data-testid="tutor-discovery-container"
    >
      <div className="rounded-2xl p-6 sm:p-10 bg-card/90 border border-border text-foreground relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-soft rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft border border-border rounded-full text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isBn ? '১০০% এনআইডি ও ডিগ্রি যাচাইকৃত শিক্ষক' : 'NID & Academic Verified Educators'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {dict.discovery?.searchHeading || 'Find Verified Qualified Tutors'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-2xl">
            {dict.discovery?.searchSubheading ||
              'Browse vetted educators across Bangladesh with transparent pricing and credential breakdown'}
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>{isBn ? 'বুয়েট, ঢাবি ও মেডিকেল টিউটর' : 'BUET, DU & Medical Tutors'}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>{isBn ? '১০০% এসক্রো ফি সুরক্ষা' : '100% Escrow Protection'}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>{isBn ? 'ফ্রি ট্রায়াল সেশন' : 'Free Trial Sessions'}</span>
            </div>
          </div>
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="results-count-text" className="font-semibold text-foreground">
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
        <Alert variant="destructive" className="rounded-2xl" data-testid="discovery-error">
          <AlertDescription role="alert">{queryError || searchError}</AlertDescription>
        </Alert>
      )}

      <TutorResultsGrid
        tutors={results.data}
        locale={locale}
        isLoading={isLoading}
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
