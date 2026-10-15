import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewsService } from '../src/modules/trust/reviews.service';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('ReviewsService Unit Tests (Phase 13)', () => {
  let service: ReviewsService;
  let mockReviewRepo: any;
  let mockBookingRepo: any;
  let mockOutboxRepo: any;
  let mockAuditRepo: any;
  let mockNotificationService: any;

  const bookingId = '00000000-0000-4000-8000-000000000001';
  const studentId = '00000000-0000-4000-8000-000000000002';
  const guardianId = '00000000-0000-4000-8000-000000000003';
  const tutorId = '00000000-0000-4000-8000-000000000004';
  const intruderId = '00000000-0000-4000-8000-000000000099';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@example.com',
    roles: ['student'],
  };

  const guardianUser: AuthenticatedUser = {
    id: guardianId,
    email: 'guardian@example.com',
    roles: ['guardian'],
  };

  const tutorUser: AuthenticatedUser = {
    id: tutorId,
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const intruderUser: AuthenticatedUser = {
    id: intruderId,
    email: 'intruder@example.com',
    roles: ['student'],
  };

  const adminUser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000000',
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const sampleBooking: any = {
    id: bookingId,
    studentUserId: studentId,
    requesterUserId: guardianId,
    tutorUserId: tutorId,
    status: 'completed',
  };

  beforeEach(() => {
    mockReviewRepo = {
      create: vi.fn((data) => ({ id: 'rev-1', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'rev-1', ...entity })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue(sampleBooking),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'out-1' }),
    };

    mockAuditRepo = {
      create: vi.fn((data) => ({ id: 'aud-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'aud-1' }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new ReviewsService(
      mockReviewRepo,
      mockBookingRepo,
      mockOutboxRepo,
      mockAuditRepo,
      mockNotificationService,
    );
  });

  describe('Review Submission & Anti-Self / Anti-Fake Invariants', () => {
    it('should allow student participant to submit verified review with criteria ratings', async () => {
      const res = await service.createReview(studentUser, {
        bookingId,
        rating: 5,
        punctualityRating: 5,
        teachingClarityRating: 4,
        subjectMasteryRating: 5,
        comment: 'Excellent physics tutor! Explains concepts clearly.',
      });

      expect(res).toBeDefined();
      expect(res.rating).toBe(5);
      expect(res.punctualityRating).toBe(5);
      expect(res.isVerifiedBooking).toBe(true);
      expect(res.moderationStatus).toBe('published');
      expect(mockReviewRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockOutboxRepo.save).toHaveBeenCalled();
      expect(mockNotificationService.dispatch).toHaveBeenCalled();
    });

    it('should allow requester guardian to submit verified review', async () => {
      const res = await service.createReview(guardianUser, {
        bookingId,
        rating: 4,
        comment: 'Very polite and punctual tutor for my child.',
      });

      expect(res.rating).toBe(4);
      expect(res.reviewerUserId).toBe(guardianId);
    });

    it('NEGATIVE TEST: should strictly reject self-review by tutor (403 Forbidden)', async () => {
      await expect(
        service.createReview(tutorUser, {
          bookingId,
          rating: 5,
          comment: 'I am the best tutor ever!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should strictly reject fake review by unrelated user (403 Forbidden)', async () => {
      await expect(
        service.createReview(intruderUser, {
          bookingId,
          rating: 1,
          comment: 'Fake review from non-participant',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject review when booking is in uncompleted/unconfirmed status (400 BadRequest)', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        ...sampleBooking,
        status: 'declined',
      });

      await expect(
        service.createReview(studentUser, {
          bookingId,
          rating: 4,
          comment: 'Premature review',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject duplicate review for same booking and user (409 Conflict)', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-existing',
        bookingId,
        reviewerUserId: studentId,
      });

      await expect(
        service.createReview(studentUser, {
          bookingId,
          rating: 5,
          comment: 'Second attempt review',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should flag review containing abusive/toxic terms for moderator review', async () => {
      const res = await service.createReview(studentUser, {
        bookingId,
        rating: 1,
        comment: 'This tutor is a cheat and scam!',
      });

      expect(res.moderationStatus).toBe('flagged');
    });
  });

  describe('Tutor Response & Rebuttal Mechanism', () => {
    it('should allow reviewed tutor to post a single polite response', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-1',
        tutorUserId: tutorId,
        tutorResponse: null,
      });

      const res = await service.replyToReview(tutorUser, 'rev-1', {
        reply: 'Thank you Rahim for the feedback. Best wishes for your SSC exams.',
      });

      expect(res.tutorResponse).toContain('Thank you Rahim');
      expect(res.tutorRespondedAt).toBeDefined();
    });

    it('NEGATIVE TEST: should reject reply by non-tutor user (403 Forbidden)', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-1',
        tutorUserId: tutorId,
      });

      await expect(
        service.replyToReview(intruderUser, 'rev-1', {
          reply: 'Intruder reply',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should prevent multiple responses to the same review (409 Conflict)', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-1',
        tutorUserId: tutorId,
        tutorResponse: 'Initial response already submitted',
      });

      await expect(
        service.replyToReview(tutorUser, 'rev-1', {
          reply: 'Second response attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Admin Review Moderation', () => {
    it('should allow admin to hide or publish flagged reviews', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-1',
        moderationStatus: 'flagged',
      });

      const res = await service.moderateReview(adminUser, 'rev-1', {
        status: 'hidden',
        reason: 'Violates platform courtesy rules',
      });

      expect(res.moderationStatus).toBe('hidden');
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should reject non-admin users from moderating reviews (403 Forbidden)', async () => {
      await expect(
        service.moderateReview(studentUser, 'rev-1', {
          status: 'hidden',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
