'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useSearchTutorsQuery, type TutorSearchItem } from '@/store/services/tutors-api';
import { useCreateBookingRequestMutation } from '@/store/services/bookings-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import { useGetEducationLevelsQuery } from '@/store/services/taxonomy-api';
import { TutorSearchCatalog } from '../components/tutorSearchCatalog';
import type {
  SearchCatalogResponse,
  SearchFilters,
  TutorCardData,
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
    subjects: t.subjects.map((s) => {
      const obj = s as unknown as Record<string, unknown>;
      return {
        id: String(obj.id ?? obj.subjectId ?? ''),
        subjectId: String(obj.subjectId ?? ''),
        subjectNameEn: String(obj.subjectNameEn ?? ''),
        subjectNameBn: String(obj.subjectNameBn ?? ''),
        educationLevelNameEn: obj.educationLevelNameEn as string | undefined,
        educationLevelNameBn: obj.educationLevelNameBn as string | undefined,
        curriculumNameEn: obj.curriculumNameEn as string | undefined,
        curriculumNameBn: obj.curriculumNameBn as string | undefined,
        rateMinor: obj.rateMinor as string | null | undefined,
      };
    }),
    serviceAreas: (t.serviceAreas ?? []).map((a) => {
      const obj = a as unknown as Record<string, unknown>;
      return {
        districtNameEn: String(obj.districtNameEn ?? ''),
        districtNameBn: String(obj.districtNameBn ?? ''),
      };
    }),
  };
}

/** Tutor discovery container: owns all search/booking query wiring. */
export function TutorsPage({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get('q') ?? '';
  const initialSubject = searchParams?.get('subjectId') ?? '';
  const initialLevel = searchParams?.get('educationLevelId') ?? '';
  const initialDistrict = searchParams?.get('districtCode') ?? '';
  const user = useAppSelector((s) => s.auth.user);

  const [filters, setFilters] = React.useState<SearchFilters>({
    q: initialQ || undefined,
    subjectId: initialSubject || undefined,
    educationLevelId: initialLevel || undefined,
    districtCode: initialDistrict || undefined,
    page: 1,
  });

  const searchQuery = useSearchTutorsQuery(
    {
      q: filters.q,
      subjectId: filters.subjectId,
      educationLevelId: filters.educationLevelId,
      districtCode: filters.districtCode,
      mode: filters.mode as 'in_person' | 'online' | 'hybrid' | undefined,
      sort: filters.sortBy ?? 'recommended',
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      page: filters.page ?? 1,
      limit: 12,
    },
    { refetchOnMountOrArgChange: true },
  );

  const [createRequest] = useCreateBookingRequestMutation();
  const childrenQuery = useGetLinkedChildrenQuery(undefined, {
    skip: !user?.roles?.includes('guardian'),
  });
  const levelsQuery = useGetEducationLevelsQuery();

  const items: TutorSearchItem[] = React.useMemo(
    () => (searchQuery.data?.data ?? []) as TutorSearchItem[],
    [searchQuery.data],
  );

  // Only ids a real search returned are bookable (F-4): accumulate every id
  // seen so a submit can never target a fabricated or unknown tutor, without
  // breaking legitimate multi-page browsing.
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

  const resultSnapshot = React.useMemo<SearchCatalogResponse>(() => {
    // Real search results only. Fabricated fallback cards used to flash here
    // while the query was still pending and booked non-existent tutors
    // (audit F-4/S-1); until the query resolves the grid renders a skeleton.
    return {
      data: items.map(toCard),
      total: searchQuery.data?.total ?? items.length,
      page: searchQuery.data?.page ?? 1,
      limit: searchQuery.data?.limit ?? 12,
      totalPages: searchQuery.data?.totalPages ?? 1,
    };
  }, [items, searchQuery.data]);

  async function handleSearch(next: SearchFilters) {
    setFilters(next);
    return { ...resultSnapshot, page: next.page ?? resultSnapshot.page };
  }

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
    <TutorSearchCatalog
      locale={locale}
      initialData={resultSnapshot}
      studentOptions={studentOptions}
      levelOptions={levelOptions}
      isLoading={searchQuery.isLoading}
      queryError={
        searchQuery.error && resultSnapshot.data.length === 0
          ? locale === 'bn'
            ? 'শিক্ষকদের তথ্য লোড করা যায়নি'
            : 'Failed to load tutors'
          : null
      }
      onSearch={handleSearch}
      onSubmitRequest={handleSubmitRequest}
    />
  );
}
