'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MapPin, LocateFixed, X } from 'lucide-react';
import { type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import {
  useSearchTutorsQuery,
  useGetSavedTutorsQuery,
  useSaveTutorMutation,
  useUnsaveTutorMutation,
  type TutorSearchItem,
} from '@/store/services/tutors-api';
import { useCreateBookingRequestMutation } from '@/store/services/bookings-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import {
  useGetEducationLevelsQuery,
  useGetSubjectsQuery,
  useGetCurriculaQuery,
  useGetLocationsQuery,
} from '@/store/services/taxonomy-api';
import { TutorSearchCatalog } from '../components/tutorSearchCatalog';
import { EMPTY_FILTERS, type TutorFiltersValue } from '../components/tutorFiltersForm';
import type { TutoringMode } from '@/features/bookings/types/booking.types';
import type {
  OptionItem,
  SearchCatalogResponse,
  SearchFilters,
  TutorCardData,
  TutorSortKey,
} from '../types/tutor-discovery.types';

const DAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

interface Coordinates {
  lat: number;
  lng: number;
}

function numberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filtersFromParams(params: URLSearchParams): TutorFiltersValue {
  return {
    query: params.get('q') ?? '',
    subjectId: params.get('subjectId') ?? '',
    educationLevelId: params.get('educationLevelId') ?? '',
    curriculumId: params.get('curriculumId') ?? '',
    districtCode: params.get('districtCode') ?? '',
    modeFilter: params.get('mode') ?? '',
    sortBy: (params.get('sort') as TutorSortKey) || 'recommended',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    minExperience: params.get('minExperience') ?? '',
    availableWeekday: params.get('availableWeekday') ?? '',
    radiusKm: params.get('radiusKm') ?? '',
  };
}

/** Map an API tutor result into the presentational catalog card shape. */
function toCard(t: TutorSearchItem): TutorCardData {
  return {
    id: t.id,
    displayName: t.displayName,
    headline: t.headline,
    bio: t.bio,
    yearsExperience: t.yearsExperience,
    teachingModes: t.teachingModes,
    hourlyRateMinor: t.hourlyRateMinor,
    currency: t.currency,
    responseTimeMinutes: t.responseTimeMinutes,
    badges: t.badges,
    matchScore: t.matchScore,
    rankingReasons: t.rankingReasons,
    distanceKm: t.distanceKm,
    ratingAverage: t.ratingAverage,
    totalReviews: t.totalReviews,
    nextAvailableWeekday: t.nextAvailableWeekday,
    subjects: t.subjects.map((s) => ({
      id: s.id,
      subjectId: s.subjectId,
      subjectNameEn: s.subjectNameEn,
      subjectNameBn: s.subjectNameBn,
      educationLevelNameEn: s.educationLevelNameEn,
      educationLevelNameBn: s.educationLevelNameBn,
      curriculumNameEn: s.curriculumNameEn,
      curriculumNameBn: s.curriculumNameBn,
      rateMinor: s.rateMinor,
    })),
    serviceAreas: (t.serviceAreas ?? []).map((a) => ({
      districtCode: a.districtCode,
      districtNameEn: a.districtNameEn,
      districtNameBn: a.districtNameBn,
      localityName: a.localityName,
    })),
  };
}

/** Tutor discovery container: owns search, location, URL state and saved tutors. */
export function TutorsPage({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);

  const initialFilters = React.useMemo(
    () => filtersFromParams(new URLSearchParams(searchParams ? searchParams.toString() : '')),
    [searchParams],
  );

  const [filters, setFilters] = React.useState<TutorFiltersValue>(initialFilters);
  const [page, setPage] = React.useState(1);
  const [coordinates, setCoordinates] = React.useState<Coordinates | null>(() => {
    const lat = numberParam(searchParams?.get('lat') ?? null);
    const lng = numberParam(searchParams?.get('lng') ?? null);
    return lat !== undefined && lng !== undefined ? { lat, lng } : null;
  });
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const radiusKm = filters.radiusKm ? Number(filters.radiusKm) : undefined;

  const queryArgs = React.useMemo(
    () => ({
      q: filters.query.trim() || undefined,
      subjectId: filters.subjectId || undefined,
      educationLevelId: filters.educationLevelId || undefined,
      curriculumId: filters.curriculumId || undefined,
      districtCode: filters.districtCode || undefined,
      mode: (filters.modeFilter || undefined) as TutoringMode | undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      minExperience: filters.minExperience ? Number(filters.minExperience) : undefined,
      availableWeekday: filters.availableWeekday ? Number(filters.availableWeekday) : undefined,
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      radiusKm,
      sort: (filters.sortBy === 'nearest' && !coordinates ? 'recommended' : filters.sortBy) as
        TutorSortKey | undefined,
      page,
      pageSize: 12,
    }),
    [filters, coordinates, radiusKm, page],
  );

  const searchQuery = useSearchTutorsQuery(queryArgs, { refetchOnMountOrArgChange: true });
  const [createRequest] = useCreateBookingRequestMutation();
  const childrenQuery = useGetLinkedChildrenQuery(undefined, {
    skip: !user?.roles?.includes('guardian'),
  });
  const levelsQuery = useGetEducationLevelsQuery();
  const subjectsQuery = useGetSubjectsQuery();
  const curriculaQuery = useGetCurriculaQuery();
  const locationsQuery = useGetLocationsQuery();

  const savedQuery = useGetSavedTutorsQuery(undefined, { skip: !user });
  const [saveTutor] = useSaveTutorMutation();
  const [unsaveTutor] = useUnsaveTutorMutation();

  React.useEffect(() => {
    setFilters(initialFilters);
    // Only re-sync when the URL itself changes (back/forward navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters]);

  const savedIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of savedQuery.data?.data ?? []) set.add(item.tutorId);
    return set;
  }, [savedQuery.data]);

  const items: TutorSearchItem[] = React.useMemo(
    () => (searchQuery.data?.data ?? []) as TutorSearchItem[],
    [searchQuery.data],
  );

  // Only ids a real search returned are bookable (F-4): accumulate every id
  // seen so a submit can never target a fabricated or unknown tutor.
  const knownTutorIds = React.useRef(new Set<string>());
  React.useEffect(() => {
    for (const item of items) knownTutorIds.current.add(item.id);
  }, [items]);

  const studentOptions = React.useMemo(() => {
    if (user?.roles?.includes('guardian')) {
      return (childrenQuery.data ?? [])
        .filter((c) => c.status === 'active')
        .map((c) => ({ id: c.studentId, label: c.displayName }));
    }
    if (user?.roles?.includes('student') && user) {
      return [{ id: user.id, label: user.displayName }];
    }
    return [];
  }, [user, childrenQuery.data]);

  const levelOptions = React.useMemo(() => {
    const rows = (levelsQuery.data?.data ?? []) as Array<Record<string, unknown>>;
    return rows
      .filter((r) => typeof r.id === 'string')
      .map((r) => ({
        id: String(r.id),
        label:
          locale === 'bn'
            ? String(r.nameBn ?? r.nameEn ?? r.id)
            : String(r.nameEn ?? r.nameBn ?? r.id),
      }));
  }, [levelsQuery.data, locale]);

  const subjectOptions = React.useMemo(() => {
    const rows = (subjectsQuery.data?.data ?? []) as Array<Record<string, unknown>>;
    return rows
      .filter((r) => typeof r.id === 'string')
      .map((r) => ({
        id: String(r.id),
        label:
          locale === 'bn'
            ? String(r.nameBn ?? r.nameEn ?? r.id)
            : String(r.nameEn ?? r.nameBn ?? r.id),
      }));
  }, [subjectsQuery.data, locale]);

  const curriculumOptions = React.useMemo(() => {
    const rows = (curriculaQuery.data?.data ?? []) as Array<Record<string, unknown>>;
    return rows
      .filter((r) => typeof r.id === 'string')
      .map((r) => ({
        id: String(r.id),
        label:
          locale === 'bn'
            ? String(r.nameBn ?? r.nameEn ?? r.id)
            : String(r.nameEn ?? r.nameBn ?? r.id),
      }));
  }, [curriculaQuery.data, locale]);

  const districtOptions: OptionItem[] = React.useMemo(() => {
    const rows = (locationsQuery.data?.data ?? []) as Array<Record<string, unknown>>;
    return rows
      .filter((r) => typeof r.code === 'string')
      .map((r) => ({
        id: String(r.code),
        label:
          locale === 'bn'
            ? String(r.nameBn ?? r.nameEn ?? r.code)
            : String(r.nameEn ?? r.nameBn ?? r.code),
      }));
  }, [locationsQuery.data, locale]);

  const resultSnapshot = React.useMemo<SearchCatalogResponse>(() => {
    return {
      data: items.map(toCard),
      total: searchQuery.data?.total ?? 0,
      page: searchQuery.data?.page ?? 1,
      limit: searchQuery.data?.limit ?? 12,
      totalPages: searchQuery.data?.totalPages ?? 1,
    };
  }, [items, searchQuery.data]);

  const syncUrl = React.useCallback(
    (next: TutorFiltersValue, coords: Coordinates | null) => {
      const params = new URLSearchParams();
      const entries: Array<[string, string | undefined]> = [
        ['q', next.query.trim() || undefined],
        ['subjectId', next.subjectId || undefined],
        ['educationLevelId', next.educationLevelId || undefined],
        ['curriculumId', next.curriculumId || undefined],
        ['districtCode', next.districtCode || undefined],
        ['mode', next.modeFilter || undefined],
        ['sort', next.sortBy !== 'recommended' ? next.sortBy : undefined],
        ['minPrice', next.minPrice || undefined],
        ['maxPrice', next.maxPrice || undefined],
        ['minExperience', next.minExperience || undefined],
        ['availableWeekday', next.availableWeekday || undefined],
        ['radiusKm', next.radiusKm || undefined],
        ['lat', coords ? String(coords.lat) : undefined],
        ['lng', coords ? String(coords.lng) : undefined],
      ];
      for (const [key, value] of entries) {
        if (value !== undefined && value !== '') params.set(key, value);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [pathname, router],
  );

  const handleFiltersChange = React.useCallback(
    (next: TutorFiltersValue) => {
      setFilters(next);
      // Any filter change resets pagination so a page from the previous
      // result set can never be requested against the new one.
      setPage(1);
      syncUrl(next, coordinates);
    },
    [coordinates, syncUrl],
  );

  async function handleSearch(next: SearchFilters) {
    setPage(next.page ?? 1);
    return { ...resultSnapshot, page: next.page ?? resultSnapshot.page };
  }

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(locale === 'bn' ? 'এই ব্রাউজারে লোকেশন নেই' : 'Location is unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setCoordinates(coords);
        setLocationError(null);
        setFilters((prev) => ({ ...prev, radiusKm: prev.radiusKm || '10' }));
        syncUrl({ ...filters, radiusKm: filters.radiusKm || '10' }, coords);
      },
      () => {
        // Denied/unavailable: fall back to manual district selection.
        setLocationError(
          locale === 'bn'
            ? 'লোকেশন অনুমতি দেওয়া হয়নি — জেলা নির্বাচন করে খুঁজুন।'
            : 'Location permission denied — pick a district instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const handleClearLocation = () => {
    setCoordinates(null);
    setLocationError(null);
    syncUrl(
      {
        ...filters,
        sortBy: filters.sortBy === 'nearest' ? 'recommended' : filters.sortBy,
        radiusKm: '',
      },
      null,
    );
  };

  const handleToggleSave = async (tutor: TutorCardData) => {
    if (!user) {
      setSaveError(locale === 'bn' ? 'সংরক্ষণ করতে লগইন করুন।' : 'Sign in to save tutors.');
      return;
    }
    setSaveError(null);
    try {
      if (savedIds.has(tutor.id)) {
        await unsaveTutor(tutor.id).unwrap();
      } else {
        await saveTutor(tutor.id).unwrap();
      }
    } catch (err) {
      const appErr = normalizeUnknownError(err, locale);
      setSaveError(appErr.message);
    }
  };

  async function handleSubmitRequest(payload: {
    tutorId: string;
    studentId: string;
    subjectId: string;
    educationLevelId: string;
    mode: 'in_person' | 'online' | 'hybrid';
    messageNotes?: string;
    preferredDays?: string[];
  }) {
    if (!knownTutorIds.current.has(payload.tutorId)) {
      throw new Error(
        locale === 'bn'
          ? 'শিক্ষকের তথ্য পাওয়া যায়নি — সার্চ রিফ্রেশ করে আবার চেষ্টা করুন।'
          : 'This tutor is not part of the current search results. Refresh the search and try again.',
      );
    }
    const studentId = payload.studentId || user?.id || '';
    if (!studentId) {
      throw new Error(locale === 'bn' ? 'শিক্ষার্থী নির্বাচন করুন।' : 'Please select a student.');
    }
    const preferredDays = payload.preferredDays?.map((d) => DAY_TO_INDEX[d] ?? 0);
    try {
      await createRequest({
        tutorId: payload.tutorId,
        studentId,
        subjectId: payload.subjectId,
        educationLevelId: payload.educationLevelId,
        mode: payload.mode,
        messageNotes: payload.messageNotes,
        preferredDays,
      }).unwrap();
    } catch (err: unknown) {
      const appErr = normalizeUnknownError(err, locale);
      throw new Error(appErr.message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-w-7xl mx-auto px-4 pt-4 flex flex-wrap items-center gap-2 text-xs">
        {coordinates ? (
          <>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground"
              data-testid="location-active"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {locale === 'bn' ? 'আপনার লোকেশন ব্যবহার হচ্ছে' : 'Using your location'}
            </span>
            <button
              type="button"
              onClick={handleClearLocation}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {locale === 'bn' ? 'মুছুন' : 'Clear'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleUseMyLocation}
            data-testid="use-my-location"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground hover:border-primary/40"
          >
            <LocateFixed className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {locale === 'bn' ? 'নিকটবর্তী শিক্ষক খুঁজুন' : 'Find tutors near me'}
          </button>
        )}
        {locationError && (
          <span className="text-warning-soft-foreground" data-testid="location-error" role="alert">
            {locationError}
          </span>
        )}
        {saveError && (
          <span className="text-destructive" data-testid="save-tutor-error" role="alert">
            {saveError}
          </span>
        )}
      </div>

      <TutorSearchCatalog
        locale={locale}
        initialData={resultSnapshot}
        initialFilters={filters}
        studentOptions={studentOptions}
        levelOptions={levelOptions}
        subjectOptions={subjectOptions}
        filterLevelOptions={levelOptions}
        curriculumOptions={curriculumOptions}
        districtOptions={districtOptions}
        hasLocation={!!coordinates}
        savedTutorIds={savedIds}
        canSave={!!user}
        onToggleSave={handleToggleSave}
        isLoading={searchQuery.isLoading}
        queryError={
          searchQuery.error && resultSnapshot.data.length === 0
            ? locale === 'bn'
              ? 'শিক্ষকদের তথ্য লোড করা যায়নি'
              : 'Failed to load tutors'
            : null
        }
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        onSubmitRequest={handleSubmitRequest}
      />
    </div>
  );
}
