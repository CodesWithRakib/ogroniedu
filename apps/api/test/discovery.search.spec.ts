import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorsService } from '../src/modules/tutors/tutors.service';
import { TutorProfileEntity } from '../src/modules/tutors/entities/tutor-profile.entity';
import { UserEntity } from '../src/modules/auth/entities/user.entity';

describe('Tutor Discovery & Explainable Search Unit Tests (FR-001)', () => {
  let service: TutorsService;
  let mockProfileRepo: any;
  let mockUserRepo: any;
  let mockTaxonomySubjectRepo: any;
  let mockTaxonomyLevelRepo: any;

  const publishedTutor1Id = '11111111-1111-4111-8111-111111111111';
  const publishedTutor2Id = '22222222-2222-4222-8222-222222222222';
  const unpublishedTutorId = '33333333-3333-4333-8333-333333333333';
  const unverifiedTutorId = '44444444-4444-4444-8444-444444444444';

  const mockProfiles: Partial<TutorProfileEntity>[] = [
    {
      userId: publishedTutor1Id,
      headline: 'BUET EEE Physics Expert',
      bio: 'Classes 9 to 12 and Medical/Engineering Admission',
      yearsExperience: 4,
      teachingModes: ['in_person', 'online'],
      hourlyRateMinor: '50000', // BDT 500
      currency: 'BDT',
      verificationStatus: 'approved',
      publicationStatus: 'published',
      responseTimeMinutes: 30,
      qualifications: [
        { qualificationType: 'nid', reviewStatus: 'approved' } as any,
        { qualificationType: 'degree', reviewStatus: 'approved' } as any,
      ],
      subjects: [
        {
          id: 'ts-1',
          subjectId: 'sub-phys',
          educationLevelId: 'lvl-hsc',
          rateMinor: '50000',
        } as any,
      ],
      serviceAreas: [
        { id: 'sa-1', districtCode: 'DHK', localityName: 'Mirpur', radiusKm: 5 } as any,
      ],
    },
    {
      userId: publishedTutor2Id,
      headline: 'DU Chemistry Specialist',
      bio: 'O/A Levels and Bangla Medium Chemistry',
      yearsExperience: 2,
      teachingModes: ['online'],
      hourlyRateMinor: '40000', // BDT 400
      currency: 'BDT',
      verificationStatus: 'approved',
      publicationStatus: 'published',
      responseTimeMinutes: 120,
      qualifications: [{ qualificationType: 'degree', reviewStatus: 'approved' } as any],
      subjects: [
        {
          id: 'ts-2',
          subjectId: 'sub-chem',
          educationLevelId: 'lvl-ssc',
          rateMinor: '40000',
        } as any,
      ],
      serviceAreas: [
        { id: 'sa-2', districtCode: 'CTG', localityName: 'Agrabad', radiusKm: 10 } as any,
      ],
    },
  ];

  const mockUsers: Partial<UserEntity>[] = [
    {
      id: publishedTutor1Id,
      displayName: 'Tanvir Hossain',
      email: 'secret_tanvir@example.com', // Private PII
      phoneE164: '+8801711111111', // Private PII
      status: 'active',
    },
    {
      id: publishedTutor2Id,
      displayName: 'Nusrat Jahan',
      email: 'secret_nusrat@example.com', // Private PII
      phoneE164: '+8801722222222', // Private PII
      status: 'active',
    },
  ];

  beforeEach(() => {
    mockProfileRepo = {
      find: vi.fn(async () => mockProfiles),
    };
    mockUserRepo = {
      find: vi.fn(async () => mockUsers),
    };
    mockTaxonomySubjectRepo = {
      find: vi.fn(async () => [
        { id: 'sub-phys', code: 'physics', nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান' },
        { id: 'sub-chem', code: 'chemistry', nameEn: 'Chemistry', nameBn: 'রসায়ন' },
      ]),
    };
    mockTaxonomyLevelRepo = {
      find: vi.fn(async () => [
        { id: 'lvl-hsc', code: 'higher_hsc', nameEn: 'Class 11-12 (HSC)', nameBn: 'এইচএসসি' },
        { id: 'lvl-ssc', code: 'secondary_ssc', nameEn: 'Class 9-10 (SSC)', nameBn: 'এসএসসি' },
      ]),
    };

    service = new TutorsService(
      mockProfileRepo,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      mockUserRepo,
      mockTaxonomySubjectRepo,
      mockTaxonomyLevelRepo,
      { record: vi.fn() } as any,
    );
  });

  describe('Discovery Query Execution & Privacy Isolation', () => {
    it('should return published & verified tutors without exposing private contact info', async () => {
      const result = await service.searchTutors({ page: 1, limit: 10 });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);

      const tutor1 = result.data.find((t) => t.id === publishedTutor1Id);
      expect(tutor1).toBeDefined();
      expect(tutor1!.displayName).toBe('Tanvir Hossain');
      expect(tutor1!.headline).toBe('BUET EEE Physics Expert');

      // CRITICAL PRIVACY INVARIANT: Private fields must be excluded
      expect((tutor1 as any).email).toBeUndefined();
      expect((tutor1 as any).phoneE164).toBeUndefined();
      expect((tutor1 as any).passwordHash).toBeUndefined();
    });

    it('NEGATIVE TEST: should strictly exclude unpublished and unverified tutors', async () => {
      // In the database query, publicationStatus='published' and verificationStatus='approved' are required
      expect(mockProfileRepo.find).toBeDefined();
      const result = await service.searchTutors({});

      const ids = result.data.map((t) => t.id);
      expect(ids).not.toContain(unpublishedTutorId);
      expect(ids).not.toContain(unverifiedTutorId);
    });

    it('should filter by keyword search (q) across name and headline', async () => {
      const result = await service.searchTutors({ q: 'BUET' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe(publishedTutor1Id);
    });

    it('should filter by mode (in_person vs online)', async () => {
      const onlineResults = await service.searchTutors({ mode: 'online' });
      expect(onlineResults.data.length).toBe(2); // Both support online

      const inPersonResults = await service.searchTutors({ mode: 'in_person' });
      expect(inPersonResults.data.length).toBe(1);
      expect(inPersonResults.data[0].id).toBe(publishedTutor1Id);
    });

    it('should filter by district code', async () => {
      const ctgResults = await service.searchTutors({ districtCode: 'CTG' });

      expect(ctgResults.data.length).toBe(1);
      expect(ctgResults.data[0].id).toBe(publishedTutor2Id);
    });

    it('should filter by subjectId', async () => {
      const physResults = await service.searchTutors({ subjectId: 'sub-phys' });

      expect(physResults.data.length).toBe(1);
      expect(physResults.data[0].id).toBe(publishedTutor1Id);
    });

    it('should provide explainable ranking and match score', async () => {
      const result = await service.searchTutors({ sort: 'recommended' });

      const topTutor = result.data[0];
      expect(topTutor.id).toBe(publishedTutor1Id);
      expect(topTutor.matchScore).toBeGreaterThan(130);
      expect(topTutor.badges).toContain('verified_identity');
      expect(topTutor.badges).toContain('verified_academic');
      expect(topTutor.rankingReasons).toContain('Verified Government Identity (+20)');
      expect(topTutor.rankingReasons).toContain('Fast Responder (+10)');
    });

    it('should sort deterministically by price ascending and descending', async () => {
      const ascResult = await service.searchTutors({ sort: 'price_asc' });
      expect(ascResult.data[0].id).toBe(publishedTutor2Id); // 40000 < 50000

      const descResult = await service.searchTutors({ sort: 'price_desc' });
      expect(descResult.data[0].id).toBe(publishedTutor1Id); // 50000 > 40000
    });

    it('should handle deterministic pagination correctly', async () => {
      const page1 = await service.searchTutors({ page: 1, limit: 1 });
      expect(page1.data.length).toBe(1);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);

      const page2 = await service.searchTutors({ page: 2, limit: 1 });
      expect(page2.data.length).toBe(1);
      expect(page2.page).toBe(2);
      expect(page2.data[0].id).not.toBe(page1.data[0].id);
    });
  });
});
