import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { FeedbackService } from '../src/modules/feedback/feedback.service';
import { CreateFeedbackDto } from '../src/modules/feedback/dto/create-feedback.dto';
import { TriageFeedbackDto } from '../src/modules/feedback/dto/triage-feedback.dto';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Beta Feedback Service Tests (Phase 12)', () => {
  let service: FeedbackService;
  let mockFeedbackRepo: any;
  let mockAuditService: any;
  let mockRateLimiter: any;

  const studentUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    roles: ['student'],
  };

  const strangerUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'stranger@example.com',
    roles: ['student'],
  };

  const adminUser: AuthenticatedUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const sampleFeedback = {
    id: 'fb-00000000-0000-4000-8000-000000000001',
    reporterUserId: studentUser.id,
    reporterRole: 'student',
    category: 'usability',
    title: 'Booking slot calendar confusing',
    description: 'The Saturday morning slot selector does not clearly indicate AM vs PM.',
    route: '/bn/tutors/tutor-123',
    reproductionSteps: '1. Open tutor page. 2. Click Saturday slot.',
    diagnosticMetadata: { viewport: '375x812', ua: 'Mobile Safari' },
    severity: null,
    status: 'submitted',
    assignedToUserId: null,
    triageNotes: 'Needs design review by UX lead',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockFeedbackRepo = {
      create: vi.fn((data) => ({
        ...data,
        id: sampleFeedback.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: vi.fn(async (entity) => entity),
      findOne: vi.fn(async ({ where }) => {
        if (where?.id === sampleFeedback.id) {
          return { ...sampleFeedback };
        }
        return null;
      }),
      findAndCount: vi.fn(async () => [[{ ...sampleFeedback }], 1]),
      createQueryBuilder: vi.fn(() => ({
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[sampleFeedback], 1]),
      })),
    };

    mockAuditService = {
      record: vi.fn(async () => ({})),
    };

    mockRateLimiter = {
      checkLimit: vi.fn(),
    };

    service = new FeedbackService(mockFeedbackRepo, mockAuditService, mockRateLimiter);
  });

  describe('submitFeedback', () => {
    it('creates and saves new feedback record with default submitted status', async () => {
      const dto: CreateFeedbackDto = {
        category: 'bug',
        title: 'Payment button unresponsive',
        description: 'When clicking pay with bKash, nothing happens on Safari.',
        route: '/bn/bookings/b-1/pay',
        reproductionSteps: 'Click pay button on mobile.',
      };

      const result = await service.submitFeedback(dto, studentUser, '127.0.0.1');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        `feedback:user:${studentUser.id}`,
        10,
        3600000,
      );
      expect(mockFeedbackRepo.create).toHaveBeenCalled();
      expect(mockFeedbackRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'feedback.submitted',
          resourceType: 'beta_feedback',
        }),
      );
      expect(result.status).toBe('submitted');
    });

    it('enforces rate limiting when too many feedback requests are submitted', async () => {
      mockRateLimiter.checkLimit.mockImplementation(() => {
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      });

      const dto: CreateFeedbackDto = {
        category: 'performance',
        title: 'Search is slow',
        description: 'Search took 5 seconds to load results.',
      };

      await expect(service.submitFeedback(dto, studentUser, '127.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getMyFeedback', () => {
    it('returns feedback submitted by user and redacts internal triage notes', async () => {
      const res = await service.getMyFeedback(studentUser.id, 1, 20);

      expect(res.items).toHaveLength(1);
      expect(res.items[0]).not.toHaveProperty('triageNotes');
      expect(res.total).toBe(1);
    });
  });

  describe('getFeedbackById', () => {
    it('allows owner to inspect their feedback with triage notes stripped', async () => {
      const item = await service.getFeedbackById(sampleFeedback.id, studentUser);

      expect(item.id).toBe(sampleFeedback.id);
      expect(item.triageNotes).toBeNull();
    });

    it('allows admin to inspect feedback with full unredacted triage notes', async () => {
      const item = await service.getFeedbackById(sampleFeedback.id, adminUser);

      expect(item.id).toBe(sampleFeedback.id);
      expect(item.triageNotes).toBe('Needs design review by UX lead');
    });

    it('NEGATIVE TEST: rejects non-owner non-admin from reading feedback item (403 Forbidden)', async () => {
      await expect(service.getFeedbackById(sampleFeedback.id, strangerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('NEGATIVE TEST: throws NotFoundException for invalid ID', async () => {
      await expect(service.getFeedbackById('non-existent-id', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('triageFeedback', () => {
    it('updates severity, status, and records audit trail', async () => {
      const triageDto: TriageFeedbackDto = {
        severity: 'p1_high',
        status: 'in_progress',
        triageNotes: 'Investigating payment webhook timeout.',
      };

      const updated = await service.triageFeedback(sampleFeedback.id, triageDto, adminUser);

      expect(updated.severity).toBe('p1_high');
      expect(updated.status).toBe('in_progress');
      expect(updated.triageNotes).toBe('Investigating payment webhook timeout.');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'feedback.triaged',
          resourceType: 'beta_feedback',
          resourceId: sampleFeedback.id,
        }),
      );
    });
  });

  describe('queryAdminFeedback', () => {
    it('queries feedback with filters and pagination', async () => {
      const res = await service.queryAdminFeedback({
        category: 'usability',
        status: 'submitted',
        page: 1,
        limit: 20,
      });

      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
    });
  });
});
