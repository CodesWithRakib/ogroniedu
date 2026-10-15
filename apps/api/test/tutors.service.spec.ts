import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorsService } from '../src/modules/tutors/tutors.service';
import { TutorProfileService } from '../src/modules/tutors/services/tutor-profile.service';
import { TutorSearchService } from '../src/modules/tutors/services/tutor-search.service';
import { TutorVerificationService } from '../src/modules/tutors/services/tutor-verification.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { TutorProfileEntity } from '../src/modules/tutors/entities/tutor-profile.entity';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('TutorsService Unit & Security Invariant Tests', () => {
  let service: TutorsService;
  let mockProfileRepo: any;
  let mockQualificationRepo: any;
  let mockReviewRepo: any;
  let mockSubjectRepo: any;
  let mockServiceAreaRepo: any;
  let mockAvailabilityRepo: any;
  let mockFileRepo: any;
  let mockUserRepo: any;
  let mockTaxonomySubjectRepo: any;
  let mockTaxonomyLevelRepo: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const tutorId = '11111111-1111-4111-8111-111111111111';
  const reviewerAdminId = '99999999-9999-4999-8999-999999999999';

  const reviewerUser: AuthenticatedUser = {
    id: reviewerAdminId,
    email: 'admin@ogroniedu.com',
    roles: ['admin'],
  };

  const selfReviewerUser: AuthenticatedUser = {
    id: tutorId,
    email: 'tutor@ogroniedu.com',
    roles: ['tutor', 'admin'], // Even if tutor has admin role
  };

  beforeEach(() => {
    mockProfileRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ ...dto })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    mockQualificationRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'qual-uuid-1' })),
      save: vi.fn(async (entity) => ({ ...entity })),
      remove: vi.fn(async (entity) => entity),
    };
    mockReviewRepo = {
      find: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'rev-uuid-1' })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    mockSubjectRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'sub-uuid-1' })),
      save: vi.fn(async (entity) => ({ ...entity })),
      remove: vi.fn(async (entity) => entity),
    };
    mockServiceAreaRepo = {
      find: vi.fn(),
      delete: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'area-uuid-1' })),
      save: vi.fn(async (entities) => entities),
    };
    mockAvailabilityRepo = {
      find: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'avail-uuid-1' })),
      save: vi.fn(async (entities) => entities),
    };
    mockFileRepo = {
      findOne: vi.fn(),
    };
    mockUserRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    mockTaxonomySubjectRepo = {
      find: vi.fn(),
    };
    mockTaxonomyLevelRepo = {
      find: vi.fn(),
    };
    mockAuditService = {
      record: vi.fn(async () => ({})),
    };
    mockNotificationService = {
      dispatch: vi.fn(async () => ({})),
    };

    service = new TutorsService(
      new TutorProfileService(
        mockProfileRepo,
        mockQualificationRepo,
        mockSubjectRepo,
        mockServiceAreaRepo,
        mockAvailabilityRepo,
        mockFileRepo,
        mockUserRepo,
        mockAuditService,
      ) as never,
      new TutorSearchService(
        mockProfileRepo,
        mockUserRepo,
        mockTaxonomySubjectRepo,
        mockTaxonomyLevelRepo,
      ) as never,
      new TutorVerificationService(
        mockProfileRepo,
        mockQualificationRepo,
        mockReviewRepo,
        mockUserRepo,
        mockAuditService,
        mockNotificationService,
      ) as never,
    );
  });

  describe('1. Profile Update & Submission', () => {
    it('should update tutor profile basics and record audit log', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        headline: 'Old Headline',
        teachingModes: [],
        verificationStatus: 'not_submitted',
        publicationStatus: 'draft',
      });

      const result = await service.updateOwnProfile(tutorId, {
        headline: 'BUET EEE, 4 Years Physics Experience',
        bio: 'Passionate physics teacher for Class 9-12 and university admission.',
        yearsExperience: 4,
        teachingModes: ['in_person', 'online'],
        hourlyRateMinor: 50000,
      });

      expect(result.headline).toBe('BUET EEE, 4 Years Physics Experience');
      expect(result.yearsExperience).toBe(4);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tutor.profile.updated',
          resourceType: 'tutor_profile',
          resourceId: tutorId,
        }),
      );
    });

    it('NEGATIVE TEST: should prevent verification submission if qualifications are missing', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        headline: 'Physics Tutor',
        teachingModes: ['online'],
        hourlyRateMinor: '50000',
        verificationStatus: 'not_submitted',
      });
      mockQualificationRepo.count.mockResolvedValueOnce(0); // 0 qualifications

      await expect(service.submitVerification(tutorId)).rejects.toThrow(
        /upload at least one qualification/i,
      );
    });

    it('should successfully transition to submitted when profile and qualifications exist', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        headline: 'Physics Tutor',
        teachingModes: ['online'],
        hourlyRateMinor: '50000',
        verificationStatus: 'not_submitted',
      });
      mockQualificationRepo.count.mockResolvedValueOnce(1); // 1 qualification

      const result = await service.submitVerification(tutorId);
      expect(result.verificationStatus).toBe('submitted');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tutor.verification.submitted',
        }),
      );
    });
  });

  describe('2. Publication Eligibility Invariants', () => {
    it('NEGATIVE TEST: should reject publication if verificationStatus is not approved', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'under_review',
        publicationStatus: 'draft',
      });

      await expect(service.setPublicationStatus(tutorId, 'published')).rejects.toThrow(
        /Verification approval is required before publication/i,
      );
    });

    it('NEGATIVE TEST: should reject publication if tutor has no teaching subjects', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'approved',
        publicationStatus: 'draft',
      });
      mockSubjectRepo.count.mockResolvedValueOnce(0); // 0 subjects

      await expect(service.setPublicationStatus(tutorId, 'published')).rejects.toThrow(
        /without at least one configured teaching subject/i,
      );
    });

    it('NEGATIVE TEST: should reject publication if tutor has no availability slots', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'approved',
        publicationStatus: 'draft',
      });
      mockSubjectRepo.count.mockResolvedValueOnce(1); // 1 subject
      mockAvailabilityRepo.count.mockResolvedValueOnce(0); // 0 availability slots

      await expect(service.setPublicationStatus(tutorId, 'published')).rejects.toThrow(
        /without configuring active availability slots/i,
      );
    });

    it('should successfully publish profile when all invariants are satisfied', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'approved',
        publicationStatus: 'draft',
      });
      mockSubjectRepo.count.mockResolvedValueOnce(2);
      mockAvailabilityRepo.count.mockResolvedValueOnce(3);

      const result = await service.setPublicationStatus(tutorId, 'published');
      expect(result.publicationStatus).toBe('published');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tutor.publication.updated',
        }),
      );
    });
  });

  describe('3. Admin Review & Self-Approval Denial', () => {
    it('CRITICAL SECURITY TEST: should reject review when reviewer is the tutor themselves (Self-Approval Denial)', async () => {
      await expect(
        service.submitReviewDecision(selfReviewerUser, tutorId, {
          decision: 'approved',
          reasonCode: 'CREDENTIALS_VALIDATED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CRITICAL SECURITY TEST: should reject qualification review on own profile', async () => {
      await expect(
        service.verifyQualification(selfReviewerUser, tutorId, 'qual-1', 'approved'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow valid admin to approve tutor and dispatch notification', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'submitted',
        publicationStatus: 'draft',
      });

      const review = await service.submitReviewDecision(reviewerUser, tutorId, {
        decision: 'approved',
        reasonCode: 'CREDENTIALS_VALIDATED',
        internalNotes: 'NID and BUET transcript verified against portal.',
      });

      expect(review.decision).toBe('approved');
      expect(mockReviewRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tutor.verification.reviewed',
          actorUserId: reviewerAdminId,
          resourceId: tutorId,
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tutorId,
          eventType: 'tutor.verified',
          recipientRole: 'tutor',
        }),
      );
    });

    it('should automatically depublish profile when admin suspends tutor', async () => {
      const activeProfile: Partial<TutorProfileEntity> = {
        userId: tutorId,
        verificationStatus: 'approved',
        publicationStatus: 'published',
      };
      mockProfileRepo.findOne.mockResolvedValueOnce(activeProfile);

      await service.submitReviewDecision(reviewerUser, tutorId, {
        decision: 'suspended',
        reasonCode: 'COMPLIANCE_SUSPENSION',
        internalNotes: 'Guardian reported safety concern.',
      });

      expect(activeProfile.verificationStatus).toBe('suspended');
      expect(activeProfile.publicationStatus).toBe('unpublished'); // Auto-depublished
    });
  });

  describe('4. Dynamic Badges (Definition of Done: Only checks actually performed)', () => {
    it('should compute badges reflecting only approved qualifications', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        headline: 'Physics Expert',
        bio: 'Bio text',
        teachingModes: ['in_person'],
        hourlyRateMinor: '60000',
        currency: 'BDT',
        verificationStatus: 'approved',
        publicationStatus: 'published',
        qualifications: [
          {
            qualificationType: 'nid',
            reviewStatus: 'approved',
          },
          {
            qualificationType: 'academic_certificate',
            reviewStatus: 'pending', // Academic pending
          },
        ],
        subjects: [],
        serviceAreas: [],
        availabilities: [],
      });

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: tutorId,
        displayName: 'Tanvir Ahmed',
        status: 'active',
      });

      const publicDto = await service.getPublicProfile(tutorId);

      // Must have verified_tutor and verified_identity, but NOT verified_academic
      expect(publicDto.badges).toContain('verified_tutor');
      expect(publicDto.badges).toContain('verified_identity');
      expect(publicDto.badges).not.toContain('verified_academic');
    });

    it('should include verified_academic only when academic certificate is approved', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        verificationStatus: 'approved',
        publicationStatus: 'published',
        qualifications: [
          {
            qualificationType: 'degree',
            reviewStatus: 'approved',
          },
        ],
        subjects: [],
        serviceAreas: [],
        availabilities: [],
      });

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: tutorId,
        displayName: 'Dr. Kabir',
        status: 'active',
      });

      const publicDto = await service.getPublicProfile(tutorId);
      expect(publicDto.badges).toContain('verified_academic');
      expect(publicDto.badges).not.toContain('verified_identity');
    });
  });

  describe('5. Availability Validation', () => {
    it('NEGATIVE TEST: should reject slot if startLocal >= endLocal', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({ userId: tutorId });

      await expect(
        service.setAvailability(tutorId, [
          { weekday: 1, startLocal: '18:00', endLocal: '17:00' }, // Invalid inverted times
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid non-overlapping weekly availability slots', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({ userId: tutorId });

      const slots = await service.setAvailability(tutorId, [
        { weekday: 0, startLocal: '16:00', endLocal: '18:00' },
        { weekday: 2, startLocal: '16:00', endLocal: '18:00' },
      ]);

      expect(slots.length).toBe(2);
      expect(mockAvailabilityRepo.delete).toHaveBeenCalledWith({ tutorUserId: tutorId });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tutor.availability.updated',
        }),
      );
    });
  });
});
