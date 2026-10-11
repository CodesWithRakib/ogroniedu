'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useSearchTutorsQuery, type TutorSearchItem } from '@/store/services/tutors-api';
import { useCreateBookingRequestMutation } from '@/store/services/bookings-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import { useGetEducationLevelsQuery } from '@/store/services/taxonomy-api';
import { TutorSearchCatalog } from '../components/tutor-search-catalog';
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
  const user = useAppSelector((s) => s.auth.user);

  const [filters, setFilters] = React.useState<SearchFilters>({
    q: initialQ || undefined,
    page: 1,
  });

  const searchQuery = useSearchTutorsQuery(
    {
      q: filters.q,
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

  const resultSnapshot = React.useMemo<SearchCatalogResponse>(
    () => ({
      data: items.map(toCard),
      total: searchQuery.data?.total ?? 0,
      page: searchQuery.data?.page ?? 1,
      limit: searchQuery.data?.limit ?? 12,
      totalPages: searchQuery.data?.totalPages ?? 1,
    }),
    [items, searchQuery.data],
  );

  async function handleSearch(next: SearchFilters) {
    setFilters(next);
    // RTK Query refetches via the filters state; return the current snapshot so
    // the presentational catalog keeps local state until the query resolves.
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
    if (!user) {
      throw new Error(locale === 'bn' ? 'অনুরোধ পাঠাতে লগইন করুন।' : 'Sign in to send a request.');
    }
    const studentId =
      payload.studentId || studentOptions[0]?.id || (user.roles.includes('student') ? user.id : '');
    if (!studentId) {
      throw new Error(
        locale === 'bn'
          ? 'শিক্ষার্থী নির্বাচন করুন (অভিভাবক হলে আগে সন্তান যুক্ত করুন)।'
          : 'Select a student (guardians must link a child first).',
      );
    }
    const levelId = payload.educationLevelId || levelOptions[0]?.id;
    if (!levelId) {
      throw new Error(
        locale === 'bn' ? 'শ্রেণি/স্তর পাওয়া যায়নি।' : 'Education level unavailable.',
      );
    }
    try {
      await createRequest({
        tutorId: payload.tutorId,
        studentId,
        subjectId: payload.subjectId,
        educationLevelId: levelId,
        mode: payload.mode,
        messageNotes: payload.messageNotes,
        preferredDays: (payload.preferredDays ?? []).map((d) => DAY_TO_INDEX[d] ?? 0),
      }).unwrap();
    } catch (err) {
      throw new Error(normalizeApiError(err as never, locale).message);
    }
  }

  const queryError = searchQuery.isError
    ? normalizeApiError(searchQuery.error, locale).message
    : null;

  return (
    <div className="py-6">
      <TutorSearchCatalog
        locale={locale}
        initialData={resultSnapshot}
        studentOptions={studentOptions}
        levelOptions={levelOptions}
        isLoading={searchQuery.isFetching}
        queryError={queryError}
        onSearch={handleSearch}
        onSubmitRequest={handleSubmitRequest}
      />
    </div>
  );
}
