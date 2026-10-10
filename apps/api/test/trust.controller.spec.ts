import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewsController } from '../src/modules/trust/reviews.controller';
import { SafetyReportsController } from '../src/modules/trust/safety-reports.controller';
import { TutorReplacementController } from '../src/modules/trust/tutor-replacement.controller';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Trust & Safety Controllers Unit Tests (Phase 13)', () => {
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
      listCases: vi.fn().mockResolvedValue([{ id: 'case-1' }]),
      getCase: vi.fn().mockResolvedValue({ id: 'case-1' }),
      updateCaseStatus: vi.fn().mockResolvedValue({ id: 'case-1', status: 'matching' }),
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
      expect(mockReviewsService.getTutorReviews).toHaveBeenCalledWith('tutor-123', false);
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
    it('POST /api/v1/tutor-replacements should delegate to TutorReplacementService.requestReplacement', async () => {
      const dto: any = {
        bookingId: '00000000-0000-4000-8000-000000000010',
        reasonCode: 'trial_dissatisfaction',
        explanation: 'Dissatisfied with trial class',
      };
      const res = await replacementController.requestReplacement(mockUser, dto);
      expect(res.id).toBe('case-1');
      expect(mockReplacementService.requestReplacement).toHaveBeenCalledWith(mockUser, dto);
    });

    it('GET /api/v1/tutor-replacements/:id should delegate to TutorReplacementService.getCase', async () => {
      const res = await replacementController.getCase(mockUser, 'case-1');
      expect(res.id).toBe('case-1');
      expect(mockReplacementService.getCase).toHaveBeenCalledWith(mockUser, 'case-1');
    });
  });
});
