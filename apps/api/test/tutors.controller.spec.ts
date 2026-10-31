import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorsController } from '../src/modules/tutors/tutors.controller';
import { AdminTutorsController } from '../src/modules/tutors/admin-tutors.controller';
import { TutorsService } from '../src/modules/tutors/tutors.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('TutorsController & AdminTutorsController Unit Tests', () => {
  let tutorsController: TutorsController;
  let adminController: AdminTutorsController;
  let mockTutorsService: Partial<TutorsService>;

  const tutorUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'tutor@ogroniedu.com',
    roles: ['tutor'],
  };

  const adminUser: AuthenticatedUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'admin@ogroniedu.com',
    roles: ['admin'],
  };

  beforeEach(() => {
    mockTutorsService = {
      getOwnProfile: vi.fn(async (userId) => ({ profile: { userId } }) as any),
      updateOwnProfile: vi.fn(async (userId, dto) => ({ userId, ...dto }) as any),
      submitVerification: vi.fn(
        async (userId) => ({ userId, verificationStatus: 'submitted' }) as any,
      ),
      setPublicationStatus: vi.fn(
        async (userId, status) => ({ userId, publicationStatus: status }) as any,
      ),
      addQualification: vi.fn(async (userId, dto) => ({ id: 'qual-1', ...dto }) as any),
      deleteQualification: vi.fn(async () => true),
      addSubject: vi.fn(async (userId, dto) => ({ id: 'sub-1', ...dto }) as any),
      deleteSubject: vi.fn(async () => true),
      setServiceAreas: vi.fn(async (userId, areas) => areas as any),
      setAvailability: vi.fn(async (userId, slots) => slots as any),
      getPublicProfile: vi.fn(async (id) => ({ id, badges: ['verified_tutor'] }) as any),
      getPendingVerificationTutors: vi.fn(async () => [{ userId: tutorUser.id } as any]),
      getReviewDossier: vi.fn(async (id) => ({ profile: { userId: id } }) as any),
      submitReviewDecision: vi.fn(
        async (reviewer, id, dto) => ({ id: 'rev-1', decision: dto.decision }) as any,
      ),
      verifyQualification: vi.fn(
        async (reviewer, id, qid, status) => ({ id: qid, reviewStatus: status }) as any,
      ),
      searchTutors: vi.fn(async () => ({
        data: [{ id: 'tutor-1' }] as any,
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      })),
    };

    tutorsController = new TutorsController(mockTutorsService as TutorsService);
    adminController = new AdminTutorsController(
      mockTutorsService as TutorsService,
      {} as any,
      {} as any,
    );
  });

  describe('TutorsController Endpoints', () => {
    it('should return own profile', async () => {
      const res = await tutorsController.getOwnProfile(tutorUser);
      expect(res.success).toBe(true);
      expect(mockTutorsService.getOwnProfile).toHaveBeenCalledWith(tutorUser.id);
    });

    it('should submit verification', async () => {
      const res = await tutorsController.submitVerification(tutorUser);
      expect(res.success).toBe(true);
      expect(mockTutorsService.submitVerification).toHaveBeenCalledWith(tutorUser.id);
    });

    it('should update publication status', async () => {
      const res = await tutorsController.setPublicationStatus(tutorUser, {
        publicationStatus: 'published',
      });
      expect(res.success).toBe(true);
      expect(mockTutorsService.setPublicationStatus).toHaveBeenCalledWith(
        tutorUser.id,
        'published',
      );
    });

    it('should return sanitized public profile', async () => {
      const res = await tutorsController.getPublicProfile('22222222-2222-4222-8222-222222222222');
      expect(res.success).toBe(true);
      expect(res.data.badges).toContain('verified_tutor');
    });

    it('delete endpoints return data:null per SuccessEnvelope<T> (Phase 23)', async () => {
      const qual = await tutorsController.deleteQualification(
        tutorUser,
        '33333333-3333-4333-8333-333333333333',
      );
      expect(qual.success).toBe(true);
      expect(qual).toHaveProperty('data', null);
      const subj = await tutorsController.deleteSubject(
        tutorUser,
        '44444444-4444-4333-8333-444444444444',
      );
      expect(subj.success).toBe(true);
      expect(subj).toHaveProperty('data', null);
    });

    it('searchTutors returns canonical meta.pagination without legacy root total/page/limit/totalPages', async () => {
      const res = await tutorsController.searchTutors({ page: 1, pageSize: 12 });
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.pagination).toEqual({
        strategy: 'offset',
        page: 1,
        pageSize: 12,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(res).not.toHaveProperty('total');
      expect(res).not.toHaveProperty('page');
      expect(res).not.toHaveProperty('limit');
      expect(res).not.toHaveProperty('totalPages');
    });
  });

  describe('AdminTutorsController Endpoints', () => {
    it('should list pending verification tutors', async () => {
      const res = await adminController.getPendingTutors();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
    });

    it('should submit review decision', async () => {
      const res = await adminController.submitReviewDecision(adminUser, tutorUser.id, {
        decision: 'approved',
        reasonCode: 'CREDENTIALS_VALIDATED',
      });
      expect(res.success).toBe(true);
      expect(mockTutorsService.submitReviewDecision).toHaveBeenCalledWith(adminUser, tutorUser.id, {
        decision: 'approved',
        reasonCode: 'CREDENTIALS_VALIDATED',
      });
    });

    it('should verify individual qualification document', async () => {
      const res = await adminController.verifyQualification(
        adminUser,
        tutorUser.id,
        '33333333-3333-4333-8333-333333333333',
        { reviewStatus: 'approved' },
      );
      expect(res.success).toBe(true);
      expect(mockTutorsService.verifyQualification).toHaveBeenCalled();
    });
  });
});
