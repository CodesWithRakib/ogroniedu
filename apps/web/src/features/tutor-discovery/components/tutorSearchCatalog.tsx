'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  X,
  MapPin,
  LocateFixed,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { Alert, AlertDescription, Button, Input, Sheet, SheetContent } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import {
  TutorFiltersForm,
  EMPTY_FILTERS,
  POPULAR_SUBJECTS_BN,
  POPULAR_SUBJECTS_EN,
  type TutorFiltersValue,
} from './tutorFiltersForm';
import { TutorResultsGrid } from './tutorResultsGrid';
import { ScoreBreakdownModal } from './scoreBreakdownModal';
import { BookingRequestModal, type BookingFormValue } from './bookingRequestModal';
import {
  EMPTY_CATALOG,
  WEEKDAY_LABELS,
  type OptionItem,
  type SearchCatalogResponse,
  type SearchFilters,
  type TutorCardData,
  type TutorSortKey,
} from '../types/tutor-discovery.types';

const SEARCH_DEBOUNCE_MS = 350;

export interface TutorSearchCatalogProps {
  locale: Locale;
  initialData?: SearchCatalogResponse;
  initialFilters?: TutorFiltersValue;
  studentOptions?: OptionItem[];
  /** Education levels used by the booking modal picker. */
  levelOptions?: OptionItem[];
  subjectOptions?: OptionItem[];
  filterLevelOptions?: OptionItem[];
  curriculumOptions?: OptionItem[];
  districtOptions?: OptionItem[];
  hasLocation?: boolean;
  savedTutorIds?: Set<string>;
  canSave?: boolean;
  onToggleSave?: (tutor: TutorCardData) => void;
  isLoading?: boolean;
  queryError?: string | null;
  onFiltersChange?: (filters: TutorFiltersValue) => void;
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
  /** Optional location props for seamless unified UI */
  locationActive?: boolean;
  onUseMyLocation?: () => void;
  onClearLocation?: () => void;
  locationError?: string | null;
  saveError?: string | null;
}

function toSearchFilters(filters: TutorFiltersValue, page: number): SearchFilters {
  return {
    q: filters.query.trim() || undefined,
    subjectId: filters.subjectId || undefined,
    educationLevelId: filters.educationLevelId || undefined,
    curriculumId: filters.curriculumId || undefined,
    districtCode: filters.districtCode || undefined,
    mode: filters.modeFilter || undefined,
    sortBy: filters.sortBy,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minExperience: filters.minExperience ? Number(filters.minExperience) : undefined,
    availableWeekday: filters.availableWeekday ? Number(filters.availableWeekday) : undefined,
    radiusKm: filters.radiusKm ? Number(filters.radiusKm) : undefined,
    page,
  };
}

export function TutorSearchCatalog({
  locale,
  initialData = EMPTY_CATALOG,
  initialFilters,
  studentOptions = [],
  levelOptions = [],
  subjectOptions = [],
  filterLevelOptions = [],
  curriculumOptions = [],
  districtOptions = [],
  hasLocation = false,
  savedTutorIds,
  canSave = false,
  onToggleSave,
  isLoading = false,
  queryError = null,
  onFiltersChange,
  onSearch,
  onSubmitRequest,
  locationActive = false,
  onUseMyLocation,
  onClearLocation,
  locationError,
  saveError,
}: TutorSearchCatalogProps) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<TutorFiltersValue>(initialFilters ?? EMPTY_FILTERS);
  const [results, setResults] = useState<SearchCatalogResponse>(initialData);
  const [currentPage, setCurrentPage] = useState(initialData.page ?? 1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const committedQuery = useRef(initialFilters?.query ?? '');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

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

  useEffect(() => {
    setResults(initialData);
  }, [initialData]);

  const runSearch = React.useCallback(
    (page: number) => {
      startTransition(async () => {
        if (!onSearch) return;
        try {
          const res = await onSearch(toSearchFilters(filtersRef.current, page));
          setResults(res);
          setCurrentPage(res.page ?? page);
          setSearchError(null);
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : String(err));
        }
      });
    },
    [onSearch],
  );

  // Debounced text search
  useEffect(() => {
    if (!onSearch) return;
    const term = filters.query.trim();
    if (term === committedQuery.current) return;
    const timer = setTimeout(() => {
      committedQuery.current = term;
      runSearch(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.query, onSearch, runSearch]);

  const patchFilters = (patch: Partial<TutorFiltersValue>) =>
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      onFiltersChange?.(next);
      return next;
    });

  const handleFilterSubmit = () => {
    committedQuery.current = filters.query.trim();
    runSearch(1);
    setIsMobileFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    onFiltersChange?.(EMPTY_FILTERS);
    committedQuery.current = '';
    if (onSearch) {
      startTransition(async () => {
        try {
          const res = await onSearch({ page: 1, sortBy: 'recommended' });
          setResults(res);
          setCurrentPage(1);
          setSearchError(null);
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : String(err));
        }
      });
    } else {
      setResults(initialData);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > results.totalPages) return;
    if (onSearch) runSearch(newPage);
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

  // Build active chips for dismissal and mobile filter count
  const activeChips: Array<{ key: keyof TutorFiltersValue; label: string }> = [];
  if (filters.query) activeChips.push({ key: 'query', label: `“${filters.query}”` });
  if (filters.subjectId) {
    activeChips.push({
      key: 'subjectId',
      label:
        subjectOptions.find((o) => o.id === filters.subjectId)?.label ?? (isBn ? 'বিষয়' : 'Subject'),
    });
  }
  if (filters.educationLevelId) {
    activeChips.push({
      key: 'educationLevelId',
      label: levelOptions.find((o) => o.id === filters.educationLevelId)?.label ?? 'Level',
    });
  }
  if (filters.curriculumId) {
    activeChips.push({
      key: 'curriculumId',
      label: curriculumOptions.find((o) => o.id === filters.curriculumId)?.label ?? 'Curriculum',
    });
  }
  if (filters.modeFilter) {
    const modeLabel =
      filters.modeFilter === 'in_person'
        ? (dict.tutor?.modeInPerson || 'In-person')
        : filters.modeFilter === 'online'
          ? (dict.tutor?.modeOnline || 'Online')
          : filters.modeFilter === 'hybrid'
            ? (dict.tutor?.modeHybrid || 'Hybrid')
            : filters.modeFilter;
    activeChips.push({ key: 'modeFilter', label: modeLabel });
  }
  if (filters.minPrice) activeChips.push({ key: 'minPrice', label: `≥ ৳${filters.minPrice}` });
  if (filters.maxPrice) activeChips.push({ key: 'maxPrice', label: `≤ ৳${filters.maxPrice}` });
  if (filters.minExperience) {
    activeChips.push({
      key: 'minExperience',
      label: isBn ? `${filters.minExperience}+ বছর` : `${filters.minExperience}+ yrs`,
    });
  }
  if (filters.availableWeekday) {
    const day = WEEKDAY_LABELS[Number(filters.availableWeekday)];
    activeChips.push({ key: 'availableWeekday', label: isBn ? day?.bn : day?.en });
  }
  if (filters.districtCode) {
    const distName = districtOptions.find((d) => d.id === filters.districtCode)?.label ?? filters.districtCode;
    activeChips.push({ key: 'districtCode', label: distName });
  }
  if (filters.radiusKm) {
    activeChips.push({ key: 'radiusKm', label: `${filters.radiusKm} km` });
  }

  const activeFilterCount = activeChips.length;
  const popularSubjects = isBn ? POPULAR_SUBJECTS_BN : POPULAR_SUBJECTS_EN;

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 pt-4 sm:pt-6 pb-24 sm:pb-12 space-y-6"
      data-testid="tutor-discovery-container"
    >
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary-soft/30 p-5 sm:p-8 backdrop-blur-xl shadow-xs">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-soft rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft border border-primary/20 rounded-full text-xs font-bold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isBn ? 'যাচাইকৃত শিক্ষক — বাস্তব প্রোফাইল' : 'Verified educators — real profiles'}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              {dict.discovery?.searchHeading || 'যাচাইকৃত অভিজ্ঞ গৃহশিক্ষক খুঁজুন'}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              {dict.discovery?.searchSubheading ||
                'স্বচ্ছ ফি এবং শিক্ষাগত যোগ্যতার বিবরণসহ বাংলাদেশের শীর্ষ শিক্ষকদের তালিকা'}
            </p>
          </div>

          {/* Location button integration if props provided */}
          {(onUseMyLocation || locationActive) && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 text-xs">
              {locationActive ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 font-semibold text-foreground shadow-xs">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span data-testid="location-active">
                    {isBn ? 'আপনার লোকেশন সক্রিয়' : 'Using your location'}
                  </span>
                  {onClearLocation && (
                    <button
                      type="button"
                      onClick={onClearLocation}
                      className="ml-1 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                      title={isBn ? 'মুছুন' : 'Clear'}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                onUseMyLocation && (
                  <button
                    type="button"
                    onClick={onUseMyLocation}
                    data-testid="use-my-location"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-xs"
                  >
                    <LocateFixed className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>{isBn ? 'নিকটবর্তী শিক্ষক খুঁজুন' : 'Find tutors near me'}</span>
                  </button>
                )
              )}
              {locationError && (
                <span className="text-warning-soft-foreground text-[11px]" data-testid="location-error" role="alert">
                  {locationError}
                </span>
              )}
              {saveError && (
                <span className="text-destructive text-[11px]" data-testid="save-tutor-error" role="alert">
                  {saveError}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Interactive Bar (Quick search, Mobile filter trigger, Quick pills) */}
      <div className="space-y-3">
        {/* Search input + Mobile Filter Trigger */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={
                dict.discovery?.searchPlaceholder ||
                'Search by tutor name, subject or university...'
              }
              value={filters.query}
              onChange={(e) => patchFilters({ query: e.target.value })}
              aria-label={isBn ? 'শিক্ষক খুঁজুন' : 'Search tutors'}
              leadingIcon={<Search className="w-4 h-4 text-primary" />}
              className="rounded-2xl h-11 sm:h-12 text-sm bg-card/90 border-border shadow-xs pl-10 pr-9"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => {
                  patchFilters({ query: '' });
                  handleFilterSubmit();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label={isBn ? 'মুছুন' : 'Clear search'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Button (< lg) */}
          <Button
            type="button"
            variant={activeFilterCount > 0 ? 'primary' : 'outline'}
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden h-11 sm:h-12 px-3.5 sm:px-4 rounded-2xl font-bold text-xs shrink-0 gap-1.5 shadow-xs"
            aria-label={isBn ? 'ফিল্টার খুলুন' : 'Open filters'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isBn ? 'ফিল্টার' : 'Filter'}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-primary-foreground text-primary text-[11px] font-black">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Quick Horizontal Scrollable Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          <button
            type="button"
            onClick={() => {
              patchFilters({ query: '', subjectId: '', modeFilter: '' });
              handleFilterSubmit();
            }}
            className={`shrink-0 rounded-full px-3 py-1 font-semibold transition-all border ${
              !filters.query && !filters.subjectId && !filters.modeFilter
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card border-border text-foreground hover:border-primary/40'
            }`}
          >
            {isBn ? '🔥 সকল শিক্ষক' : '🔥 All Tutors'}
          </button>

          {/* Popular Subjects */}
          {popularSubjects.map((sub) => {
            const isSelected = filters.query === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  patchFilters({ query: isSelected ? '' : sub });
                  handleFilterSubmit();
                }}
                className={`shrink-0 rounded-full px-3 py-1 font-semibold transition-all border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card border-border text-foreground hover:border-primary/40'
                }`}
              >
                {sub}
              </button>
            );
          })}

          {/* Quick Mode Filters */}
          <button
            type="button"
            onClick={() => {
              const nextMode = filters.modeFilter === 'online' ? '' : 'online';
              patchFilters({ modeFilter: nextMode });
              handleFilterSubmit();
            }}
            className={`shrink-0 rounded-full px-3 py-1 font-semibold transition-all border ${
              filters.modeFilter === 'online'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card border-border text-foreground hover:border-primary/40'
            }`}
          >
            🌐 {isBn ? 'অনলাইন' : 'Online'}
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMode = filters.modeFilter === 'in_person' ? '' : 'in_person';
              patchFilters({ modeFilter: nextMode });
              handleFilterSubmit();
            }}
            className={`shrink-0 rounded-full px-3 py-1 font-semibold transition-all border ${
              filters.modeFilter === 'in_person'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card border-border text-foreground hover:border-primary/40'
            }`}
          >
            🏠 {isBn ? 'হোম টিউশন' : 'Home Tutoring'}
          </button>
        </div>

        {/* Active Filter Chips Strip (Top Bar) */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              {isBn ? 'ফিল্টার সক্রিয়:' : 'Active:'}
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  patchFilters({ [chip.key]: chip.key === 'sortBy' ? 'recommended' : '' });
                  handleFilterSubmit();
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft/60 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground font-semibold px-2 py-0.5 rounded-md hover:bg-muted ml-1 transition-colors"
            >
              {isBn ? 'সব মুছুন' : 'Clear all'}
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Discovery Grid Layout (2-Column on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* Left Column: Desktop Sticky Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20">
          <TutorFiltersForm
            locale={locale}
            value={filters}
            isPending={isPending}
            subjectOptions={subjectOptions}
            levelOptions={filterLevelOptions}
            curriculumOptions={curriculumOptions}
            districtOptions={districtOptions}
            hasLocation={hasLocation}
            onChange={patchFilters}
            onSubmit={handleFilterSubmit}
            onReset={handleResetFilters}
          />
        </aside>

        {/* Right Column: Search Results */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0">
          {/* Results Count & Quick Sort Bar */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <span data-testid="results-count-text" className="font-bold text-foreground">
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

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                {isBn ? 'সাজান:' : 'Sort:'}
              </span>
              <Select
                value={filters.sortBy || 'recommended'}
                onValueChange={(val) => {
                  patchFilters({ sortBy: val as TutorSortKey });
                  handleFilterSubmit();
                }}
              >
                <SelectTrigger className="h-8.5 rounded-xl bg-card border-border text-xs px-2.5 min-w-[130px] sm:min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">
                    {dict.discovery?.sortRecommended || 'Recommended'}
                  </SelectItem>
                  <SelectItem value="nearest" disabled={!hasLocation}>
                    {isBn ? 'নিকটতম প্রথমে' : 'Nearest first'}
                  </SelectItem>
                  <SelectItem value="price_asc">
                    {dict.discovery?.sortPriceAsc || 'Price: Low to High'}
                  </SelectItem>
                  <SelectItem value="price_desc">
                    {dict.discovery?.sortPriceDesc || 'Price: High to Low'}
                  </SelectItem>
                  <SelectItem value="experience_desc">
                    {dict.discovery?.sortExpDesc || 'Experience: Most to Least'}
                  </SelectItem>
                  <SelectItem value="rating_desc">
                    {isBn ? 'রেটিং: সর্বোচ্চ প্রথমে' : 'Rating: Highest'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Query or Search Error Alert */}
          {(queryError || searchError) && (
            <Alert variant="destructive" className="rounded-2xl" data-testid="discovery-error">
              <AlertDescription role="alert">{queryError || searchError}</AlertDescription>
            </Alert>
          )}

          {/* Tutor Cards Grid */}
          <TutorResultsGrid
            tutors={results.data}
            locale={locale}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={results.totalPages}
            savedTutorIds={savedTutorIds}
            canSave={canSave}
            onToggleSave={onToggleSave}
            onShowScore={setActiveScoreTutor}
            onRequestBooking={handleOpenBookingModal}
            onPageChange={handlePageChange}
            onReset={handleResetFilters}
          />
        </main>
      </div>

      {/* 4. Mobile Filter Bottom Drawer */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent
          side="bottom"
          className="p-0 max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col bg-card border-t border-border"
          showCloseButton={false}
        >
          {/* Drag Handle Bar */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-1 shrink-0" />

          {/* Drawer Content */}
          <div className="overflow-y-auto px-1 py-2 flex-1">
            <TutorFiltersForm
              locale={locale}
              value={filters}
              isPending={isPending}
              subjectOptions={subjectOptions}
              levelOptions={filterLevelOptions}
              curriculumOptions={curriculumOptions}
              districtOptions={districtOptions}
              hasLocation={hasLocation}
              onChange={patchFilters}
              onSubmit={handleFilterSubmit}
              onReset={handleResetFilters}
              isMobileDrawer
              onCloseDrawer={() => setIsMobileFilterOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 5. Modals */}
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
