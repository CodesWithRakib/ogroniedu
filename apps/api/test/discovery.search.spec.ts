import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  TutorSearchService,
  resolveNextAvailableWeekday,
} from '../src/modules/tutors/services/tutor-search.service';
import type { SearchTutorsQueryDto } from '../src/modules/tutors/dto';

/**
 * The production query runs in PostgreSQL. These unit tests pin the query
 * composition (predicates + bound parameters + deterministic ordering) and the
 * sanitized mapping, without pretending to be a database integration test.
 * Real SQL behaviour is exercised by the API smoke run recorded in
 * docs/features/tutor-discovery/IMPLEMENTATION_REPORT.md.
 */
class FakeQueryBuilder {
  whereClauses: string[] = [];
  orderClauses: string[] = [];
  selects: string[] = [];
  params: Record<string, unknown> = {};
  offsetValue: number | null = null;
  limitValue: number | null = null;

  constructor(
    public rows: Array<Record<string, unknown>>,
    private readonly countOverride?: number,
  ) {}

  innerJoin() {
    return this;
  }
  where(clause: string, params?: Record<string, unknown>) {
    this.whereClauses.push(clause);
    Object.assign(this.params, params ?? {});
    return this;
  }
  andWhere(clause: string, params?: Record<string, unknown>) {
    this.whereClauses.push(clause);
    Object.assign(this.params, params ?? {});
    return this;
  }
  select(_selection: string, alias?: string) {
    if (alias) this.selects.push(alias);
    return this;
  }
  addSelect(expression: string, alias?: string) {
    this.selects.push(expression);
    if (alias) this.selects.push(alias);
    return this;
  }
  setParameters(params: Record<string, unknown>) {
    Object.assign(this.params, params);
    return this;
  }
  orderBy(column: string) {
    this.orderClauses.push(column);
    return this;
  }
  addOrderBy(column: string) {
    this.orderClauses.push(column);
    return this;
  }
  offset(value: number) {
    this.offsetValue = value;
    return this;
  }
  limit(value: number) {
    this.limitValue = value;
    return this;
  }
  clone() {
    const clone = new FakeQueryBuilder(this.rows, this.countOverride);
    // Share the recorded state so assertions can inspect the ranked clone too.
    clone.whereClauses = this.whereClauses;
    clone.orderClauses = this.orderClauses;
    clone.selects = this.selects;
    clone.params = this.params;
    return clone;
  }
  async getCount() {
    return this.countOverride ?? this.rows.length;
  }
  async getRawMany() {
    return this.rows;
  }
}

const tutorAId = '11111111-1111-4111-8111-111111111111';
const tutorBId = '22222222-2222-4222-8222-222222222222';

const profileA = {
  userId: tutorAId,
  headline: 'BUET EEE Physics Expert',
  bio: 'Classes 9 to 12',
  yearsExperience: 4,
  teachingModes: ['in_person', 'online'],
  hourlyRateMinor: '50000',
  currency: 'BDT',
  responseTimeMinutes: 30,
  verificationStatus: 'approved',
  publicationStatus: 'published',
  qualifications: [
    { id: 'q1', qualificationType: 'nid', reviewStatus: 'approved' },
    { id: 'q2', qualificationType: 'degree', reviewStatus: 'approved' },
  ],
  subjects: [
    {
      id: 'ts-1',
      subjectId: 'sub-phys',
      educationLevelId: 'lvl-hsc',
      curriculumId: 'cur-board',
      rateMinor: '50000',
    },
  ],
  serviceAreas: [
    {
      id: 'sa-1',
      districtCode: 'DHK',
      upazilaCode: 'Dhanmondi',
      localityName: 'Dhanmondi',
      radiusKm: '5.00',
    },
  ],
  availabilities: [
    {
      weekday: 1,
      startLocal: '17:00',
      endLocal: '20:00',
      timezone: 'Asia/Dhaka',
      isActive: true,
      effectiveFrom: null,
      effectiveUntil: null,
    },
  ],
} as any;

const profileB = {
  userId: tutorBId,
  headline: 'DU Chemistry Specialist',
  bio: 'O/A Levels',
  yearsExperience: 2,
  teachingModes: ['online'],
  hourlyRateMinor: '40000',
  currency: 'BDT',
  responseTimeMinutes: 120,
  verificationStatus: 'approved',
  publicationStatus: 'published',
  qualifications: [{ id: 'q3', qualificationType: 'degree', reviewStatus: 'approved' }],
  subjects: [
    {
      id: 'ts-2',
      subjectId: 'sub-chem',
      educationLevelId: 'lvl-ssc',
      curriculumId: null,
      rateMinor: '40000',
    },
  ],
  serviceAreas: [],
  availabilities: [],
} as any;

const userA = { id: tutorAId, displayName: 'Tanvir Hossain', status: 'active', deletedAt: null };
const userB = { id: tutorBId, displayName: 'Nusrat Jahan', status: 'active', deletedAt: null };

describe('Tutor discovery search (FR-001)', () => {
  let service: TutorSearchService;
  let queryBuilder: FakeQueryBuilder;
  let mockProfileRepo: any;
  let mockUserRepo: any;
  let mockSubjectRepo: any;
  let mockLevelRepo: any;
  let mockCurriculumRepo: any;

  function rowsFor(ids: string[]) {
    return ids.map((id, index) => ({
      user_id: id,
      match_score: String(165 - index * 30),
      rating_average: index === 0 ? '4.50' : null,
      total_reviews: index === 0 ? '2' : '0',
      distance_km: index === 0 ? '8.1300' : null,
    }));
  }

  beforeEach(() => {
    queryBuilder = new FakeQueryBuilder(rowsFor([tutorAId, tutorBId]));
    mockProfileRepo = {
      createQueryBuilder: vi.fn(() => queryBuilder),
      find: vi.fn(async () => [profileA, profileB]),
      findOne: vi.fn(async () => profileA),
      manager: { query: vi.fn(async () => [{ average: 4.5, total: 2 }]) },
    };
    mockUserRepo = { find: vi.fn(async () => [userA, userB]), findOne: vi.fn(async () => userA) };
    mockSubjectRepo = {
      find: vi.fn(async () => [
        { id: 'sub-phys', code: 'physics', nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান' },
        { id: 'sub-chem', code: 'chemistry', nameEn: 'Chemistry', nameBn: 'রসায়ন' },
      ]),
    };
    mockLevelRepo = {
      find: vi.fn(async () => [
        { id: 'lvl-hsc', code: 'higher_hsc', nameEn: 'HSC', nameBn: 'এইচএসসি' },
        { id: 'lvl-ssc', code: 'secondary_ssc', nameEn: 'SSC', nameBn: 'এসএসসি' },
      ]),
    };
    mockCurriculumRepo = {
      find: vi.fn(async () => [
        { id: 'cur-board', code: 'national', nameEn: 'National Curriculum', nameBn: 'জাতীয়' },
      ]),
    };

    service = new TutorSearchService(
      mockProfileRepo,
      mockUserRepo,
      mockSubjectRepo,
      mockLevelRepo,
      mockCurriculumRepo,
    );
  });

  it('applies the mandatory eligibility rules before any filter', async () => {
    await service.searchTutors({});
    const sql = queryBuilder.whereClauses.join('\n');
    expect(sql).toContain('tp.publication_status = :published');
    expect(sql).toContain('tp.verification_status = :approved');
    expect(sql).toContain(
      'tp.verification_expires_at IS NULL OR tp.verification_expires_at > :now',
    );
    expect(sql).toContain("u.status = 'active'");
    expect(sql).toContain('u.deleted_at IS NULL');
  });

  it('binds keyword, subject, level, curriculum, mode, fee, experience and availability as parameters', async () => {
    const query: SearchTutorsQueryDto = {
      q: 'Physics',
      subjectId: '11111111-1111-4111-8111-111111111111',
      educationLevelId: '22222222-2222-4222-8222-222222222222',
      curriculumId: '33333333-3333-4333-8333-333333333333',
      mode: 'online',
      minPrice: 10000,
      maxPrice: 90000,
      minExperience: 2,
      availableWeekday: 1,
      districtCode: 'DHK',
      upazilaCode: 'Dhanmondi',
    };
    await service.searchTutors(query);
    const sql = queryBuilder.whereClauses.join('\n');
    expect(sql).toContain('u.display_name ILIKE :term');
    expect(sql).toContain('ts.subject_id = :subjectId');
    expect(sql).toContain('ts.education_level_id = :educationLevelId');
    expect(sql).toContain('ts.curriculum_id = :curriculumId');
    expect(sql).toContain('ANY(tp.teaching_modes)');
    expect(sql).toContain('tp.hourly_rate_minor >= :minPrice');
    expect(sql).toContain('tp.hourly_rate_minor <= :maxPrice');
    expect(sql).toContain('tp.years_experience >= :minExperience');
    expect(sql).toContain('av.weekday = :availableWeekday');
    expect(sql).toContain('lower(sa.district_code) = lower(:districtCode)');
    expect(sql).toContain('lower(sa.upazila_code) = lower(:upazilaCode)');
    expect(queryBuilder.params).toMatchObject({
      term: '%Physics%',
      mode: 'online',
      minPrice: 10000,
      maxPrice: 90000,
      minExperience: 2,
      availableWeekday: 1,
      districtCode: 'DHK',
      upazilaCode: 'Dhanmondi',
    });
  });

  it('uses a bounding box and haversine filter for radius search', async () => {
    await service.searchTutors({ lat: 23.8103, lng: 90.4125, radiusKm: 20, sort: 'nearest' });
    const sql = queryBuilder.whereClauses.join('\n');
    expect(sql).toContain('sa.latitude BETWEEN :minLat AND :maxLat');
    expect(sql).toContain('sa.longitude BETWEEN :minLng AND :maxLng');
    expect(sql).toContain('acos');
    expect(queryBuilder.params).toMatchObject({ lat: 23.8103, lng: 90.4125, radiusKm: 20 });
    expect(queryBuilder.orderClauses[0]).toBe('distance_km');
    expect(queryBuilder.orderClauses).toContain('tp.user_id');
  });

  it('rejects coordinates without their pair, nearest without coordinates, and inverted fee bounds', async () => {
    await expect(service.searchTutors({ lat: 23.8 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.searchTutors({ sort: 'nearest' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.searchTutors({ minPrice: 500, maxPrice: 100 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns sanitized public fields and real aggregates only', async () => {
    const result = await service.searchTutors({});
    const tutor = result.data[0];
    expect(tutor.displayName).toBe('Tanvir Hossain');
    expect(tutor.badges).toContain('verified_tutor');
    expect(tutor.badges).toContain('verified_identity');
    expect(tutor.badges).toContain('verified_academic');
    expect(tutor.matchScore).toBe(165);
    expect(tutor.distanceKm).toBe(8.13);
    expect(tutor.ratingAverage).toBe(4.5);
    expect(tutor.totalReviews).toBe(2);
    expect(tutor.serviceAreas[0].districtNameEn).toBe('Dhaka');
    expect(tutor.subjects[0].curriculumNameEn).toBe('National Curriculum');
    expect((tutor as any).email).toBeUndefined();
    expect((tutor as any).phoneE164).toBeUndefined();
    expect((tutor as any).passwordHash).toBeUndefined();
    expect((tutor as any).verificationStatus).toBeUndefined();

    // No published reviews → null, never a fabricated number.
    expect(result.data[1].ratingAverage).toBeNull();
    expect(result.data[1].totalReviews).toBe(0);
  });

  it('returns a genuine empty page without querying relations', async () => {
    queryBuilder = new FakeQueryBuilder([], 0);
    service = new TutorSearchService(
      mockProfileRepo,
      mockUserRepo,
      mockSubjectRepo,
      mockLevelRepo,
      mockCurriculumRepo,
    );
    const result = await service.searchTutors({});
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  });

  it('applies deterministic tie-breaking for every supported sort', async () => {
    for (const sort of [
      'recommended',
      'price_asc',
      'price_desc',
      'experience_desc',
      'rating_desc',
    ] as const) {
      queryBuilder = new FakeQueryBuilder(rowsFor([tutorAId]));
      const local = new TutorSearchService(
        mockProfileRepo,
        mockUserRepo,
        mockSubjectRepo,
        mockLevelRepo,
        mockCurriculumRepo,
      );
      await local.searchTutors({ sort });
      expect(queryBuilder.orderClauses[queryBuilder.orderClauses.length - 1]).toBe('tp.user_id');
    }
  });

  it('public profile uses real review/session aggregates, not constants', async () => {
    const profile = await service.getPublicProfile(tutorAId);
    expect(profile.ratingAverage).toBe(4.5);
    expect(profile.totalReviews).toBe(2);
    expect(profile.completedSessions).toBe(2);
    expect(profile.nextAvailableWeekday).not.toBeNull();
    expect(mockProfileRepo.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('moderation_status'),
      [tutorAId],
    );
  });

  it('public profile never serializes internal verification fields', async () => {
    const profile = (await service.getPublicProfile(tutorAId)) as any;
    expect(profile.verificationStatus).toBeUndefined();
    expect(profile.email).toBeUndefined();
    expect(profile.phoneE164).toBeUndefined();
    expect(profile.qualifications.every((q: any) => q.isVerified === true)).toBe(true);
  });
});

describe('resolveNextAvailableWeekday', () => {
  const monday = new Date('2026-10-19T00:00:00.000Z');

  it('returns the next weekday with an active slot, wrapping across the week', () => {
    const slots = [
      { weekday: 3, isActive: true, effectiveFrom: null, effectiveUntil: null },
      { weekday: 1, isActive: false, effectiveFrom: null, effectiveUntil: null },
    ] as any;
    expect(resolveNextAvailableWeekday(slots, monday)).toBe(3);
  });

  it('returns null when no active, date-effective slot exists', () => {
    const slots = [
      { weekday: 1, isActive: false, effectiveFrom: null, effectiveUntil: null },
      { weekday: 2, isActive: true, effectiveFrom: '2027-01-01', effectiveUntil: null },
    ] as any;
    expect(resolveNextAvailableWeekday(slots, monday)).toBeNull();
  });
});
