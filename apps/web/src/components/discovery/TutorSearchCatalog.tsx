'use client';

import React, { useState, useTransition } from 'react';
import {
  Search,
  Filter,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  DollarSign,
  X,
  Info,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

export interface SubjectItem {
  id: string;
  subjectId: string;
  subjectNameEn: string;
  subjectNameBn: string;
  educationLevelNameEn?: string;
  educationLevelNameBn?: string;
  curriculumNameEn?: string;
  curriculumNameBn?: string;
  rateMinor?: string | null;
}

export interface TutorCardData {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  yearsExperience: number | null;
  teachingModes: string[];
  hourlyRateMinor: string | null;
  currency: string;
  responseTimeMinutes: number | null;
  badges: string[];
  matchScore: number;
  rankingReasons: string[];
  subjects: SubjectItem[];
  serviceAreas?: Array<{ districtNameEn: string; districtNameBn: string }>;
}

export interface SearchCatalogResponse {
  data: TutorCardData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchFilters {
  q?: string;
  subjectId?: string;
  educationLevelId?: string;
  curriculumId?: string;
  mode?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'recommended' | 'price_asc' | 'price_desc' | 'experience_desc';
  page?: number;
}

interface TutorSearchCatalogProps {
  locale: Locale;
  initialData?: SearchCatalogResponse;
  studentOptions?: Array<{ id: string; label: string }>;
  levelOptions?: Array<{ id: string; label: string }>;
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

const EMPTY_CATALOG: SearchCatalogResponse = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  data: [],
};

// Legacy demo catalog retained for isolated component tests that inject their own
// `initialData` explicitly. It is NOT used as a UI default anymore: without API
// data the catalog renders a genuine empty state.
const DEFAULT_CATALOG: SearchCatalogResponse = EMPTY_CATALOG;

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

  // Search filter states
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [sortBy, setSortBy] = useState<
    'recommended' | 'price_asc' | 'price_desc' | 'experience_desc'
  >('recommended');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Results state
  const [results, setResults] = useState<SearchCatalogResponse>(initialData);

  // Explainable Score Modal / Popover state
  const [activeScoreTutor, setActiveScoreTutor] = useState<TutorCardData | null>(null);

  // Booking Request Modal state
  const [selectedTutorForBooking, setSelectedTutorForBooking] = useState<TutorCardData | null>(
    null,
  );
  const [bookingSubjectId, setBookingSubjectId] = useState('');
  const [bookingStudentId, setBookingStudentId] = useState('');
  const [bookingLevelId, setBookingLevelId] = useState('');
  const [bookingMode, setBookingMode] = useState<'in_person' | 'online' | 'hybrid'>('online');
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Keep locally managed results in sync when the container delivers API data.
  React.useEffect(() => {
    setResults(initialData);
  }, [initialData]);

  const daysList = [
    { key: 'sunday', label: dict.bookingRequest?.daysSunday || 'Sunday' },
    { key: 'monday', label: dict.bookingRequest?.daysMonday || 'Monday' },
    { key: 'tuesday', label: dict.bookingRequest?.daysTuesday || 'Tuesday' },
    { key: 'wednesday', label: dict.bookingRequest?.daysWednesday || 'Wednesday' },
    { key: 'thursday', label: dict.bookingRequest?.daysThursday || 'Thursday' },
    { key: 'friday', label: dict.bookingRequest?.daysFriday || 'Friday' },
    { key: 'saturday', label: dict.bookingRequest?.daysSaturday || 'Saturday' },
  ];

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const filters: SearchFilters = {
        q: query.trim() || undefined,
        mode: modeFilter || undefined,
        sortBy,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page: 1,
      };

      if (onSearch) {
        try {
          const res = await onSearch(filters);
          setResults(res);
          setCurrentPage(1);
          setSearchError(null);
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : String(err));
        }
      } else {
        // Client-side filtering fallback
        let filtered = [...initialData.data];
        if (query.trim()) {
          const q = query.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.displayName.toLowerCase().includes(q) ||
              t.headline?.toLowerCase().includes(q) ||
              t.bio?.toLowerCase().includes(q) ||
              t.subjects.some(
                (s) => s.subjectNameEn.toLowerCase().includes(q) || s.subjectNameBn.includes(q),
              ),
          );
        }
        if (modeFilter) {
          filtered = filtered.filter((t) => t.teachingModes.includes(modeFilter));
        }
        if (minPrice) {
          const min = Number(minPrice);
          filtered = filtered.filter((t) => {
            const rate = t.hourlyRateMinor ? Number(t.hourlyRateMinor) / 100 : 0;
            return rate >= min;
          });
        }
        if (maxPrice) {
          const max = Number(maxPrice);
          filtered = filtered.filter((t) => {
            const rate = t.hourlyRateMinor ? Number(t.hourlyRateMinor) / 100 : 0;
            return rate <= max;
          });
        }

        // Sorting
        if (sortBy === 'price_asc') {
          filtered.sort((a, b) => Number(a.hourlyRateMinor || 0) - Number(b.hourlyRateMinor || 0));
        } else if (sortBy === 'price_desc') {
          filtered.sort((a, b) => Number(b.hourlyRateMinor || 0) - Number(a.hourlyRateMinor || 0));
        } else if (sortBy === 'experience_desc') {
          filtered.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
        } else {
          filtered.sort((a, b) => b.matchScore - a.matchScore);
        }

        setResults({
          data: filtered,
          total: filtered.length,
          page: 1,
          limit: 10,
          totalPages: Math.max(1, Math.ceil(filtered.length / 10)),
        });
        setCurrentPage(1);
      }
    });
  };

  const handleResetFilters = () => {
    setQuery('');
    setModeFilter('');
    setSortBy('recommended');
    setMinPrice('');
    setMaxPrice('');
    setResults(initialData);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > results.totalPages) return;
    setCurrentPage(newPage);
    if (onSearch) {
      startTransition(async () => {
        const res = await onSearch({
          q: query.trim() || undefined,
          mode: modeFilter || undefined,
          sortBy,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: newPage,
        });
        setResults(res);
      });
    }
  };

  const handleOpenBookingModal = (tutor: TutorCardData) => {
    setSelectedTutorForBooking(tutor);
    setBookingSubjectId(tutor.subjects[0]?.subjectId || '');
    setBookingMode(
      tutor.teachingModes.includes('online')
        ? 'online'
        : ((tutor.teachingModes[0] as 'in_person' | 'online' | 'hybrid') || 'in_person'),
    );
    setBookingNotes('');
    setSelectedDays([]);
    setBookingSuccessMessage(null);
    setBookingError(null);
    if (studentOptions.length > 0) setBookingStudentId(studentOptions[0].id);
    if (levelOptions.length > 0) setBookingLevelId(levelOptions[0].id);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutorForBooking) return;

    setIsSubmittingBooking(true);
    setBookingError(null);
    try {
      if (onSubmitRequest) {
        await onSubmitRequest({
          tutorId: selectedTutorForBooking.id,
          studentId: bookingStudentId,
          subjectId: bookingSubjectId,
          educationLevelId: bookingLevelId,
          mode: bookingMode,
          messageNotes: bookingNotes,
          preferredDays: selectedDays,
        });
      } else {
        throw new Error(
          locale === 'bn'
            ? 'অনুরোধ পাঠাতে লগইন করুন।'
            : 'Sign in to send a tutoring request.',
        );
      }
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

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey],
    );
  };

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8"
      data-testid="tutor-discovery-container"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-medium text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NID & Academic Verified Educators</span>
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

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <form
          onSubmit={handleFilterSubmit}
          className="space-y-4"
          data-testid="discovery-filters-form"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5">
              <Input
                leadingIcon={<Search className="w-4 h-4 text-slate-400" />}
                placeholder={
                  dict.discovery?.searchPlaceholder ||
                  'Search by tutor name, subject or university...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search tutors"
                data-testid="search-query-input"
              />
            </div>

            {/* Mode Select */}
            <div className="md:col-span-2">
              <select
                aria-label="Filter mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                data-testid="mode-select"
                className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">{dict.discovery?.filterAllModes || 'All Modes'}</option>
                <option value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</option>
                <option value="online">{dict.tutor?.modeOnline || 'Online'}</option>
                <option value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="md:col-span-3">
              <select
                aria-label="Sort by"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'recommended' | 'price_asc' | 'price_desc' | 'experience_desc')
                }
                data-testid="sort-by-select"
                className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="recommended">
                  {dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
                </option>
                <option value="price_asc">
                  {dict.discovery?.sortPriceAsc || 'Price: Low to High'}
                </option>
                <option value="price_desc">
                  {dict.discovery?.sortPriceDesc || 'Price: High to Low'}
                </option>
                <option value="experience_desc">
                  {dict.discovery?.sortExpDesc || 'Experience: Most to Least'}
                </option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex gap-2">
              <Button
                type="submit"
                variant="primary"
                className="flex-1 h-11"
                isLoading={isPending}
                data-testid="apply-filters-button"
              >
                {dict.discovery?.applyFilters || 'Filter'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3"
                onClick={handleResetFilters}
                data-testid="reset-filters-button"
              >
                {dict.discovery?.resetFilters || 'Reset'}
              </Button>
            </div>
          </div>

          {/* Secondary Price Range Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {dict.discovery?.priceRange || 'Hourly Rate (BDT)'}:
            </span>
            <div className="w-28">
              <input
                type="number"
                placeholder={dict.discovery?.minPrice || 'Min BDT'}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                data-testid="min-price-input"
              />
            </div>
            <span>—</span>
            <div className="w-28">
              <input
                type="number"
                placeholder={dict.discovery?.maxPrice || 'Max BDT'}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                data-testid="max-price-input"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Results Indicator */}
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
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="discovery-error">
          {queryError || searchError}
        </div>
      )}

      {/* Tutors Grid */}
      {results.data.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {dict.discovery?.noResults || 'No tutors matched your criteria.'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {dict.discovery?.noResultsSuggestion ||
                'Try expanding your search radius or clearing price filters.'}
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              {dict.discovery?.resetFilters || 'Reset Filters'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="tutors-grid"
        >
          {results.data.map((tutor) => {
            const hourlyRate = tutor.hourlyRateMinor
              ? formatLocalizedNumber(Number(tutor.hourlyRateMinor) / 100, locale)
              : null;
            const expYears = tutor.yearsExperience
              ? formatLocalizedNumber(tutor.yearsExperience, locale)
              : null;

            return (
              <Card
                key={tutor.id}
                className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-slate-200 dark:border-slate-800"
                data-testid={`tutor-card-${tutor.id}`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {tutor.displayName}
                      </CardTitle>
                      {tutor.headline && (
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 line-clamp-1">
                          {tutor.headline}
                        </p>
                      )}
                    </div>
                    {/* Explainable Match Score Badge */}
                    <button
                      type="button"
                      onClick={() => setActiveScoreTutor(tutor)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Click to view explainable match breakdown"
                      data-testid={`match-score-badge-${tutor.id}`}
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>{formatLocalizedNumber(tutor.matchScore, locale)} pts</span>
                    </button>
                  </div>

                  {/* Verification Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="success" className="gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      {dict.tutor?.badgeVerifiedTutor || 'Verified Tutor'}
                    </Badge>
                    {tutor.badges.includes('verified_identity') && (
                      <Badge variant="default" className="gap-1 text-[11px]">
                        <Award className="w-3 h-3 text-blue-600" />
                        {dict.tutor?.badgeVerifiedIdentity || 'NID Verified'}
                      </Badge>
                    )}
                    {tutor.badges.includes('verified_degree') && (
                      <Badge variant="default" className="gap-1 text-[11px]">
                        <GraduationCap className="w-3 h-3 text-purple-600" />
                        {dict.tutor?.badgeVerifiedAcademic || 'Degree Verified'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* Bio */}
                  {tutor.bio && (
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tutor.bio}
                    </p>
                  )}

                  {/* Teaching Subjects */}
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      {dict.tutor?.subjectsTitle || 'Teaching Subjects'}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tutor.subjects.slice(0, 3).map((sub) => (
                        <span
                          key={sub.id}
                          className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                        >
                          {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn}
                        </span>
                      ))}
                      {tutor.subjects.length > 3 && (
                        <span className="text-slate-400 text-[11px] self-center">
                          +{tutor.subjects.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes: Experience, Response Time, Mode */}
                  <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 pt-1">
                    {expYears && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {dict.discovery?.yearsExperience
                            ? dict.discovery.yearsExperience.replace('{count}', expYears)
                            : `${expYears} yrs experience`}
                        </span>
                      </div>
                    )}
                    {tutor.responseTimeMinutes && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          ~{formatLocalizedNumber(tutor.responseTimeMinutes, locale)}m response
                        </span>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Modes:</span>
                      {tutor.teachingModes.map((m) => (
                        <span key={m} className="capitalize text-slate-700 dark:text-slate-300">
                          {m.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    {hourlyRate ? (
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {dict.discovery?.hourlyRate
                          ? dict.discovery.hourlyRate.replace('{rate}', hourlyRate)
                          : `BDT ${hourlyRate}/hr`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Contact for fee</span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenBookingModal(tutor)}
                    data-testid={`request-tutoring-btn-${tutor.id}`}
                  >
                    {dict.discovery?.requestSession || 'Request Tutoring'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {results.totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-3 pt-6"
          data-testid="pagination-controls"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            data-testid="pagination-prev-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {dict.discovery?.paginationPrevious || 'Previous'}
          </Button>
          <span
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
            data-testid="page-indicator"
          >
            {dict.discovery?.pageIndicator
              ? dict.discovery.pageIndicator
                  .replace('{page}', formatLocalizedNumber(currentPage, locale))
                  .replace('{totalPages}', formatLocalizedNumber(results.totalPages, locale))
              : `Page ${currentPage} of ${results.totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= results.totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            data-testid="pagination-next-btn"
          >
            {dict.discovery?.paginationNext || 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Explainable Match Breakdown Modal */}
      {activeScoreTutor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          data-testid="score-breakdown-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {dict.discovery?.scoreBreakdownTitle || 'Ranking Factors'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveScoreTutor(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {activeScoreTutor.displayName}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                Total Score: {formatLocalizedNumber(activeScoreTutor.matchScore, locale)} Points
              </p>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                OgroniEdu scores tutors using transparent, deterministic verification & quality
                signals:
              </p>
              <ul className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                {activeScoreTutor.rankingReasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setActiveScoreTutor(null)}
            >
              {dict.common?.confirm || 'Understood'}
            </Button>
          </div>
        </div>
      )}

      {/* Booking Request Modal */}
      {selectedTutorForBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          data-testid="booking-request-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {dict.bookingRequest?.modalTitle || 'Request Tutoring Session'}
                </h3>
                <p className="text-xs text-slate-500">{selectedTutorForBooking.displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTutorForBooking(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccessMessage ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  {bookingSuccessMessage}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitBooking}
                className="space-y-4 text-xs"
                data-testid="booking-request-form"
              >
                {bookingError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700" data-testid="booking-request-error">
                    {bookingError}
                  </div>
                )}
                {studentOptions.length > 0 && (
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      {dict.bookingRequest?.selectStudent || 'Select Student'}
                    </label>
                    <select
                      value={bookingStudentId}
                      onChange={(e) => setBookingStudentId(e.target.value)}
                      required
                      data-testid="booking-student-select"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {studentOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {levelOptions.length > 0 && (
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      {dict.bookingRequest?.selectLevel || 'Select Level'}
                    </label>
                    <select
                      value={bookingLevelId}
                      onChange={(e) => setBookingLevelId(e.target.value)}
                      required
                      data-testid="booking-level-select"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {levelOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Select Subject */}
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {dict.bookingRequest?.selectSubject || 'Select Subject'}
                  </label>
                  <select
                    value={bookingSubjectId}
                    onChange={(e) => setBookingSubjectId(e.target.value)}
                    required
                    data-testid="booking-subject-select"
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {selectedTutorForBooking.subjects.map((sub) => (
                      <option key={sub.subjectId} value={sub.subjectId}>
                        {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn} (
                        {sub.educationLevelNameEn || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Mode */}
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {dict.bookingRequest?.selectMode || 'Preferred Mode'}
                  </label>
                  <select
                    value={bookingMode}
                    onChange={(e) =>
                      setBookingMode(e.target.value as 'in_person' | 'online' | 'hybrid')
                    }
                    data-testid="booking-mode-select"
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="online">{dict.tutor?.modeOnline || 'Online'}</option>
                    <option value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</option>
                    <option value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</option>
                  </select>
                </div>

                {/* Preferred Days */}
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {dict.bookingRequest?.preferredDaysLabel || 'Preferred Days'}
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {daysList.map((d) => {
                      const isSelected = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDay(d.key)}
                          data-testid={`day-toggle-${d.key}`}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message / Notes */}
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {dict.bookingRequest?.notesLabel || 'Notes / Learning Goals'}
                  </label>
                  <textarea
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder={
                      dict.bookingRequest?.notesPlaceholder ||
                      'Describe syllabus chapters or goals...'
                    }
                    data-testid="booking-notes-input"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTutorForBooking(null)}
                  >
                    {dict.common?.cancel || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingBooking}
                    data-testid="submit-booking-request"
                  >
                    {dict.bookingRequest?.submitButton || 'Send Request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
