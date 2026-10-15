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

/** Curated verified academic tutors used as demonstration and local fallback */
const CURATED_SAMPLE_TUTORS: TutorCardData[] = [
  {
    id: 'tutor-buet-1',
    displayName: 'তানভীর হাসান (Tanvir Hasan)',
    headline: 'বুয়েট (সিএসই) • গণিত ও পদার্থবিজ্ঞান স্পেশালিস্ট',
    bio: '৪+ বছরের শিক্ষকতার অভিজ্ঞতা। একাদশ-দ্বাদশ শ্রেণি এবং বুয়েট ও ইঞ্জিনিয়ারিং ভর্তি পরীক্ষার নিবিড় মেন্টরশিপ।',
    yearsExperience: 4,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '80000',
    currency: 'BDT',
    responseTimeMinutes: 15,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    matchScore: 165,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Verified Academic Degree (+20)',
      'Experience 4+ Years (+15)',
      'Fast Response Rate (+10)',
    ],
    subjects: [
      {
        id: 's-1',
        subjectId: 'sub-math',
        subjectNameEn: 'Higher Mathematics',
        subjectNameBn: 'উচ্চতর গণিত',
        educationLevelNameEn: 'HSC & SSC',
        educationLevelNameBn: 'মাধ্যমিক ও উচ্চ মাধ্যমিক',
      },
      {
        id: 's-2',
        subjectId: 'sub-phy',
        subjectNameEn: 'Physics',
        subjectNameBn: 'পদার্থবিজ্ঞান',
        educationLevelNameEn: 'HSC',
        educationLevelNameBn: 'একাদশ-দ্বাদশ শ্রেণি',
      },
      {
        id: 's-3',
        subjectId: 'sub-ict',
        subjectNameEn: 'ICT & Programming',
        subjectNameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
  {
    id: 'tutor-dmc-2',
    displayName: 'ডা. নুসরাত জাহান (Dr. Nusrat Jahan)',
    headline: 'ঢাকা মেডিকেল কলেজ (DMC) • জীববিজ্ঞান ও রসায়ন বিশেষজ্ঞ',
    bio: 'মেডিকেল ভর্তি পরীক্ষা এবং উচ্চ মাধ্যমিক জীববিজ্ঞান ও রসায়নে শতভাগ কনসেপ্ট ক্লিয়ারিং ক্লাস।',
    yearsExperience: 5,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '100000',
    currency: 'BDT',
    responseTimeMinutes: 20,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    matchScore: 180,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Verified Medical Degree (+20)',
      'Experience 5+ Years (+20)',
      'Top Rated Educator (+20)',
    ],
    subjects: [
      {
        id: 's-4',
        subjectId: 'sub-bio',
        subjectNameEn: 'Biology',
        subjectNameBn: 'জীববিজ্ঞান',
        educationLevelNameEn: 'HSC & Admission',
        educationLevelNameBn: 'উচ্চ মাধ্যমিক ও ভর্তি প্রস্তুতি',
      },
      {
        id: 's-5',
        subjectId: 'sub-chem',
        subjectNameEn: 'Chemistry',
        subjectNameBn: 'রসায়ন',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
  {
    id: 'tutor-du-3',
    displayName: 'ফারহান আহমেদ (Farhan Ahmed)',
    headline: 'ঢাকা বিশ্ববিদ্যালয় (ফলিত পদার্থবিজ্ঞান) • বিজ্ঞান মেন্টর',
    bio: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষার্থীদের জটিল বিষয়গুলো বাস্তব উদাহরণের মাধ্যমে সহজে বুঝিয়ে দেওয়ার প্রমাণিত রেকর্ড।',
    yearsExperience: 3,
    teachingModes: ['online', 'hybrid'],
    hourlyRateMinor: '65000',
    currency: 'BDT',
    responseTimeMinutes: 10,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    matchScore: 150,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Verified Academic Degree (+20)',
      'Fast Response Rate (+10)',
    ],
    subjects: [
      {
        id: 's-6',
        subjectId: 'sub-phy',
        subjectNameEn: 'Physics',
        subjectNameBn: 'পদার্থবিজ্ঞান',
      },
      {
        id: 's-7',
        subjectId: 'sub-math',
        subjectNameEn: 'General Mathematics',
        subjectNameBn: 'সাধারণ গণিত',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
  {
    id: 'tutor-iba-4',
    displayName: 'মাহমুদুল করিম (Mahmudul Karim)',
    headline: 'আইবিএ, ঢাকা বিশ্ববিদ্যালয় (IBA DU) • ইংরেজি ও ভর্তি পরীক্ষা',
    bio: 'ইংরেজি ব্যাকরণ, রিডিং কমপ্রিহেনশন, ভোকাবুলারি ও আইবিএ/বিশ্ববিদ্যালয় ভর্তি পরীক্ষার দক্ষ প্রশিক্ষক।',
    yearsExperience: 6,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '90000',
    currency: 'BDT',
    responseTimeMinutes: 25,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    matchScore: 175,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Verified Academic Degree (+20)',
      'Experience 6+ Years (+25)',
      'High Student Satisfaction (+10)',
    ],
    subjects: [
      {
        id: 's-8',
        subjectId: 'sub-eng',
        subjectNameEn: 'English Language & Literature',
        subjectNameBn: 'ইংরেজি ভাষা ও সাহিত্য',
      },
      {
        id: 's-9',
        subjectId: 'sub-adm',
        subjectNameEn: 'University Admission Prep',
        subjectNameBn: 'বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
  {
    id: 'tutor-buet-5',
    displayName: 'আয়েশা সিদ্দিকা (Ayesha Siddiqua)',
    headline: 'বুয়েট (ইইই) • গণিত ও বিজ্ঞান (ইংলিশ ভার্সন স্পেশালিস্ট)',
    bio: 'English Version & English Medium (Edexcel/Cambridge) শিক্ষার্থীদের গণিত ও পদার্থবিজ্ঞানে ৫ বছরের বিশেষ অভিজ্ঞতা।',
    yearsExperience: 4,
    teachingModes: ['online', 'hybrid'],
    hourlyRateMinor: '85000',
    currency: 'BDT',
    responseTimeMinutes: 12,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    matchScore: 160,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Verified Academic Degree (+20)',
      'Fast Response Rate (+20)',
    ],
    subjects: [
      {
        id: 's-10',
        subjectId: 'sub-math',
        subjectNameEn: 'Mathematics (O/A Level & EV)',
        subjectNameBn: 'গণিত (ও/এ লেভেল ও ইংলিশ ভার্সন)',
      },
      {
        id: 's-11',
        subjectId: 'sub-ict',
        subjectNameEn: 'Computer Science',
        subjectNameBn: 'কম্পিউটার সায়েন্স',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
  {
    id: 'tutor-ju-6',
    displayName: 'সাদিয়া রহমান (Sadia Rahman)',
    headline: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় • বাংলা ও মানবিক শাখা বিশেষজ্ঞ',
    bio: '১ম থেকে ১০ম শ্রেণির শিক্ষার্থীদের বাংলা ও বাংলাদেশ ও বিশ্বপরিচয় বিষয়ে সহজ ও আকর্ষণীয় পাঠদান।',
    yearsExperience: 3,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '50000',
    currency: 'BDT',
    responseTimeMinutes: 18,
    badges: ['verified_tutor', 'verified_identity'],
    matchScore: 145,
    rankingReasons: [
      'Approved Platform Tutor (+100)',
      'Verified Government Identity (+20)',
      'Experience 3+ Years (+15)',
      'High Engagement (+10)',
    ],
    subjects: [
      {
        id: 's-12',
        subjectId: 'sub-bng',
        subjectNameEn: 'Bangla 1st & 2nd Paper',
        subjectNameBn: 'বাংলা ১ম ও ২য় পত্র',
      },
      {
        id: 's-13',
        subjectId: 'sub-arts',
        subjectNameEn: 'Social Science',
        subjectNameBn: 'বাংলাদেশ ও বিশ্বপরিচয়',
      },
    ],
    serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
  },
];

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
    if (items.length > 0) {
      return {
        data: items.map(toCard),
        total: searchQuery.data?.total ?? items.length,
        page: searchQuery.data?.page ?? 1,
        limit: searchQuery.data?.limit ?? 12,
        totalPages: searchQuery.data?.totalPages ?? 1,
      };
    }

    // Local / unseeded demonstration fallback:
    let sampleData = CURATED_SAMPLE_TUTORS;
    if (filters.q && filters.q.trim()) {
      const q = filters.q.toLowerCase();
      sampleData = sampleData.filter(
        (t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.headline?.toLowerCase().includes(q) ||
          t.bio?.toLowerCase().includes(q) ||
          t.subjects.some(
            (s) =>
              s.subjectNameEn.toLowerCase().includes(q) ||
              s.subjectNameBn.toLowerCase().includes(q),
          ),
      );
    }
    if (filters.mode) {
      sampleData = sampleData.filter((t) => t.teachingModes.includes(filters.mode!));
    }
    if (filters.minPrice) {
      sampleData = sampleData.filter(
        (t) => Number(t.hourlyRateMinor || 0) >= (filters.minPrice || 0) * 100,
      );
    }
    if (filters.maxPrice) {
      sampleData = sampleData.filter(
        (t) => Number(t.hourlyRateMinor || 0) <= (filters.maxPrice || 0) * 100,
      );
    }
    return {
      data: sampleData,
      total: sampleData.length,
      page: 1,
      limit: 12,
      totalPages: 1,
    };
  }, [items, searchQuery.data, filters]);

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
