import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewsController } from '../src/modules/trust/reviews.controller';
import { SafetyReportsController } from '../src/modules/trust/safety-reports.controller';
import { TutorReplacementController } from '../src/modules/trust/tutor-replacement.controller';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Trust & Safety Controllers Unit Tests (Phase 13/03)', () => {
  let reviewsController: ReviewsController;
  let safetyController: SafetyReportsController;
  let replacementController: TutorReplacementController;

  let mockReviewsService: any;
  let mockSafetyService: any;
  let mockReplacementService: any;

  const mockUser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'user@example.com',
    roles: ['student'],
  };

  beforeEach(() => {
    mockReviewsService = {
      createReview: vi.fn().mockResolvedValue({ id: 'rev-1', rating: 5 }),
      getTutorReviews: vi.fn().mockResolvedValue([{ id: 'rev-1', rating: 5 }]),
      replyToReview: vi.fn().mockResolvedValue({ id: 'rev-1', tutorResponse: 'Thanks' }),
      moderateReview: vi.fn().mockResolvedValue({ id: 'rev-1', moderationStatus: 'hidden' }),
    };

    mockSafetyService = {
      createReport: vi.fn().mockResolvedValue({ id: 'rep-1', status: 'submitted' }),
      listReports: vi.fn().mockResolvedValue([{ id: 'rep-1' }]),
      getReport: vi.fn().mockResolvedValue({ id: 'rep-1' }),
      updateReport: vi.fn().mockResolvedValue({ id: 'rep-1', status: 'action_taken' }),
    };

    mockReplacementService = {
      requestReplacement: vi.fn().mockResolvedValue({ id: 'case-1', status: 'requested' }),
      listCases: vi.fn().mockResolvedValue({
        data: [{ id: 'case-1' }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      getCase: vi.fn().mockResolvedValue({ case: { id: 'case-1' }, history: [] }),
      listEligibleBookings: vi.fn().mockResolvedValue([{ bookingId: 'b-1' }]),
      updateCaseStatus: vi.fn().mockResolvedValue({ id: 'case-1', status: 'matching' }),
      extendDeadline: vi
        .fn()
        .mockResolvedValue({ id: 'case-1', deadlineAt: '2026-10-20T00:00:00Z' }),
      acceptOffer: vi.fn().mockResolvedValue({ id: 'case-1', status: 'accepted' }),
      declineOffer: vi.fn().mockResolvedValue({ id: 'case-1', status: 'matching' }),
      cancelCase: vi.fn().mockResolvedValue({ id: 'case-1', status: 'cancelled' }),
      listCandidates: vi.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
      runOverdueSweep: vi.fn().mockResolvedValue({ processed: 2 }),
    };

    reviewsController = new ReviewsController(mockReviewsService);
    safetyController = new SafetyReportsController(mockSafetyService);
    replacementController = new TutorReplacementController(mockReplacementService);
  });

  describe('ReviewsController', () => {
    it('POST /api/v1/reviews should delegate to ReviewsService.createReview', async () => {
      const dto = {
        bookingId: '00000000-0000-4000-8000-000000000010',
        rating: 5,
        comment: 'Great tutor!',
      };
      const res = await reviewsController.createReview(mockUser, dto);
      expect(res.id).toBe('rev-1');
      expect(mockReviewsService.createReview).toHaveBeenCalledWith(mockUser, dto);
    });

    it('GET /api/v1/reviews/tutors/:tutorId should delegate to ReviewsService.getTutorReviews', async () => {
      const res = await reviewsController.getTutorReviews('tutor-123', 'false');
      expect(res).toHaveLength(1);
      expect(mockReviewsService.getTutorReviews).toHaveBeenCalledWith(
        'tutor-123',
        false,
        undefined,
      );
    });

    it('passes the authenticated viewer through so the staff-only all=true gate applies', async () => {
      await reviewsController.getTutorReviews('tutor-123', 'true', mockUser);
      expect(mockReviewsService.getTutorReviews).toHaveBeenCalledWith('tutor-123', true, mockUser);
    });
  });

  describe('SafetyReportsController', () => {
    it('POST /api/v1/safety-reports should delegate to SafetyReportsService.createReport', async () => {
      const dto: any = {
        category: 'child_safety',
        severity: 'high',
        description: 'Urgent report',
      };
      const res = await safetyController.createReport(mockUser, dto);
      expect(res.id).toBe('rep-1');
      expect(mockSafetyService.createReport).toHaveBeenCalledWith(mockUser, dto);
    });

    it('GET /api/v1/safety-reports/:id should delegate to SafetyReportsService.getReport', async () => {
      const res = await safetyController.getReport(mockUser, 'rep-1');
      expect(res.id).toBe('rep-1');
      expect(mockSafetyService.getReport).toHaveBeenCalledWith(mockUser, 'rep-1');
    });
  });

  describe('TutorReplacementController', () => {
    it('POST /api/v1/tutor-replacements wraps the created case in the envelope', async () => {
      const dto: any = {
        bookingId: '00000000-0000-4000-8000-000000000010',
        reasonCode: 'trial_dissatisfaction',
        explanation: 'Dissatisfied with trial class',
      };
      const res = await replacementController.requestReplacement(mockUser, dto);
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('case-1');
      expect(mockReplacementService.requestReplacement).toHaveBeenCalledWith(mockUser, dto);
    });

    it('GET /api/v1/tutor-replacements/:id returns case + history', async () => {
      const res = await replacementController.getCase(mockUser, 'case-1');
      expect(res.data).toEqual({ case: { id: 'case-1' }, history: [] });
      expect(mockReplacementService.getCase).toHaveBeenCalledWith(mockUser, 'case-1');
    });

    it('POST /:id/accept delegates to the participant consent method', async () => {
      const res = await replacementController.acceptOffer(mockUser, 'case-1');
      expect(res.data.status).toBe('accepted');
      expect(mockReplacementService.acceptOffer).toHaveBeenCalledWith(mockUser, 'case-1');
    });

    it('GET /eligible-bookings exposes computed eligibility only', async () => {
      const res = await replacementController.listEligibleBookings(mockUser);
      expect(res.data).toEqual([{ bookingId: 'b-1' }]);
    });
  });
});
