import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AnalyticsTutorService } from '../src/modules/analytics/services/analytics-tutor.service';
import { EventTrackingService } from '../src/modules/analytics/services/event-tracking.service';
import { AllowedAnalyticsEvent } from '../src/modules/analytics/dto/track-event.dto';
import { sanitizeAnalyticsProperties } from '../src/modules/analytics/utils/event-sanitizer.util';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Product Analytics, Event Tracking & Retention Specifications (Phase 14)', () => {
  let analyticsService: AnalyticsService;
  let eventTrackingService: EventTrackingService;

  const mockDataSource = {
    query: vi.fn(),
  };

  const mockLedgerService = {
    runReconciliation: vi.fn().mockResolvedValue({ isBalanced: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService = new AnalyticsService(
      mockDataSource as any,
      mockLedgerService as any,
      new AnalyticsTutorService(mockDataSource as any),
    );
    eventTrackingService = new EventTrackingService(mockDataSource as any);
  });

  describe('1. Privacy-Conscious Event Sanitization & Ingestion Integrity', () => {
    it('should strip forbidden sensitive substrings from analytics properties', () => {
      const dangerousProps = {
        subject_id: 'sub-101',
        search_query_filter: 'mathematics',
        user_password: 'super-secret-password',
        user_otp: '123456',
        auth_token: 'bearer-jwt-token-xyz',
        credit_card: '4111111111111111',
        phone_number: '+8801700000000',
        student_email: 'student@example.com',
        private_message_content: 'Confidential message',
        result_count: 5,
      };

      const sanitized = sanitizeAnalyticsProperties(dangerousProps);

      expect(sanitized.subject_id).toBe('sub-101');
      expect(sanitized.result_count).toBe(5);
      expect((sanitized as any).user_password).toBeUndefined();
      expect((sanitized as any).user_otp).toBeUndefined();
      expect((sanitized as any).auth_token).toBeUndefined();
      expect((sanitized as any).credit_card).toBeUndefined();
      expect((sanitized as any).phone_number).toBeUndefined();
      expect((sanitized as any).student_email).toBeUndefined();
      expect((sanitized as any).private_message_content).toBeUndefined();
    });

    it('should truncate excessively long property values and cap at 20 properties', () => {
      const longProps: Record<string, unknown> = {
        note: 'a'.repeat(300),
      };
      for (let i = 0; i < 30; i++) {
        longProps[`key_${i}`] = i;
      }

      const sanitized = sanitizeAnalyticsProperties(longProps);

      expect(typeof sanitized.note).toBe('string');
      expect((sanitized.note as string).length).toBe(256);
      expect(Object.keys(sanitized).length).toBeLessThanOrEqual(20);
    });

    it('should accept valid client-permitted events', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const result = await eventTrackingService.trackClientEvent(
        {
          eventName: AllowedAnalyticsEvent.TUTOR_SEARCH_PERFORMED,
          sessionId: 'session-xyz',
          properties: { result_count: 3, district: 'Dhaka' },
        },
        { id: 'user-1', roles: ['student'] } as unknown as AuthenticatedUser,
      );

      expect(result.recorded).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_analytics_events'),
        expect.arrayContaining(['tutor_search_performed', 'user-1', 'student']),
      );
    });

    it('NEGATIVE TEST: should strictly reject client attempt to forge server-authoritative event (e.g. booking_confirmed)', async () => {
      await expect(
        eventTrackingService.trackClientEvent(
          {
            eventName: AllowedAnalyticsEvent.BOOKING_CONFIRMED,
          },
          { id: 'user-1', roles: ['student'] } as unknown as AuthenticatedUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should gracefully isolate database write failures during server event tracking without throwing', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('DB connection drop'));

      const success = await eventTrackingService.trackServerEvent(AllowedAnalyticsEvent.BOOKING_CONFIRMED, {
        actorUserId: 'user-1',
        actorRole: 'system',
      });

      expect(success).toBe(false); // Isolated, does not throw
    });
  });

  describe('2. Multi-Stage Booking & Discovery Funnel Calculations', () => {
    it('should calculate complete 7-stage funnel with step-by-step drop-offs', async () => {
      // 1. Event counts (search, profile views, booking started)
      mockDataSource.query.mockResolvedValueOnce([
        { search_count: 1000, profile_views_count: 400, booking_started_count: 200 },
      ]);
      // 2. Zero-result searches
      mockDataSource.query.mockResolvedValueOnce([{ zero_result_count: 50 }]);
      // 3. Bookings requested & confirmed
      mockDataSource.query.mockResolvedValueOnce([{ total_requested: 120, confirmed: 90 }]);
      // 4. Payments
      mockDataSource.query.mockResolvedValueOnce([{ succeeded_payments: 85 }]);
      // 5. Completed sessions
      mockDataSource.query.mockResolvedValueOnce([{ completed_sessions: 80 }]);

      const res = await analyticsService.getFunnelAnalytics({
        startDate: '2026-10-01T00:00:00Z',
        endDate: '2026-10-21T00:00:00Z',
      });

      expect(res.stages).toHaveLength(7);
      expect(res.stages[0].stageKey).toBe('tutor_search');
      expect(res.stages[0].count).toBe(1000);
      expect(res.stages[1].stageKey).toBe('profile_view');
      expect(res.stages[1].count).toBe(400);
      expect(res.stages[1].conversionRateFromPrevious).toBe(40.0); // 400 / 1000 = 40%
      expect(res.stages[1].dropOffRate).toBe(60.0);

      expect(res.zeroResultSearches.totalSearches).toBe(1000);
      expect(res.zeroResultSearches.zeroResultCount).toBe(50);
      expect(res.zeroResultSearches.zeroResultRate).toBe(5.0);
    });

    it('BOUNDARY TEST: should handle zero denominators safely without NaN or crashes', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { search_count: 0, profile_views_count: 0, booking_started_count: 0 },
      ]);
      mockDataSource.query.mockResolvedValueOnce([{ zero_result_count: 0 }]);
      mockDataSource.query.mockResolvedValueOnce([{ total_requested: 0, confirmed: 0 }]);
      mockDataSource.query.mockResolvedValueOnce([{ succeeded_payments: 0 }]);
      mockDataSource.query.mockResolvedValueOnce([{ completed_sessions: 0 }]);

      const res = await analyticsService.getFunnelAnalytics({});

      for (const stage of res.stages) {
        expect(stage.count).toBe(0);
        expect(stage.conversionRateFromPrevious).toBe(0);
        expect(stage.overallConversionRate).toBe(0);
        expect(Number.isNaN(stage.conversionRateFromPrevious)).toBe(false);
      }
      expect(res.zeroResultSearches.zeroResultRate).toBe(0);
    });
  });

  describe('3. Role-Specific Activation Metrics', () => {
    it('should calculate Student, Guardian, and Tutor activation rates from verified states', async () => {
      // Student res
      mockDataSource.query.mockResolvedValueOnce([
        { registered_students: 50, onboarded_students: 40, active_students: 25 },
      ]);
      // Guardian res
      mockDataSource.query.mockResolvedValueOnce([
        { registered_guardians: 30, linked_guardians: 24, active_guardians: 18 },
      ]);
      // Tutor res
      mockDataSource.query.mockResolvedValueOnce([
        { registered_tutors: 40, published_tutors: 35, verified_tutors: 30, active_tutors: 20 },
      ]);

      const res = await analyticsService.getActivationAnalytics({});

      expect(res.student.registered).toBe(50);
      expect(res.student.onboarded).toBe(40);
      expect(res.student.activeWithBookings).toBe(25);
      expect(res.student.activationRate).toBe(50.0); // 25 / 50 = 50%

      expect(res.guardian.registered).toBe(30);
      expect(res.guardian.withLinkedChildren).toBe(24);
      expect(res.guardian.activeWithChildBookings).toBe(18);
      expect(res.guardian.activationRate).toBe(60.0); // 18 / 30 = 60%

      expect(res.tutor.registered).toBe(40);
      expect(res.tutor.verified).toBe(30);
      expect(res.tutor.verificationRate).toBe(75.0); // 30 / 40 = 75%
      expect(res.tutor.activationRate).toBe(50.0); // 20 / 40 = 50%
    });
  });

  describe('4. Learning Engagement & Homework Metrics', () => {
    it('should calculate attendance rate and homework submission/review rates', async () => {
      // Sessions
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_sessions: 100,
          completed_sessions: 90,
          cancelled_sessions: 5,
          no_show_sessions: 5,
          scheduled_sessions: 0,
        },
      ]);
      // Assignments
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_assignments: 50,
          total_submissions: 40,
          reviewed_submissions: 36,
          average_score: 84.5,
        },
      ]);

      const res = await analyticsService.getLearningEngagementAnalytics({});

      expect(res.sessions.attendanceRate).toBe(94.74); // 90 / (90 + 5) = 94.74%
      expect(res.homework.totalAssignments).toBe(50);
      expect(res.homework.totalSubmissions).toBe(40);
      expect(res.homework.submissionRate).toBe(80.0); // 40 / 50 = 80%
      expect(res.homework.reviewRate).toBe(90.0); // 36 / 40 = 90%
      expect(res.homework.averageScore).toBe(84.5);
    });
  });

  describe('5. Tenant-Isolated Organization Scoped Analytics', () => {
    it('POSITIVE TEST: should allow platform admin to view any organization analytics', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'org-1', name: 'Retina Coaching', slug: 'retina', status: 'active' },
      ]);
      mockDataSource.query.mockResolvedValueOnce([
        {
          member_tutors_count: 12,
          total_bookings: 50,
          confirmed_bookings: 45,
          unique_students_served: 38,
          completed_volume_minor: '9000000', // 90,000.00 BDT
        },
      ]);

      const adminUser: AuthenticatedUser = { id: 'admin-1', roles: ['admin'] } as any;
      const res = await analyticsService.getOrganizationAnalytics('org-1', {}, adminUser);

      expect(res.organization.id).toBe('org-1');
      expect(res.metrics.memberTutorsCount).toBe(12);
      expect(res.metrics.confirmedBookings).toBe(45);
      expect(res.metrics.conversionRate).toBe(90.0);
      expect(res.metrics.completedVolumeBdt).toBe(90000);
    });

    it('POSITIVE TEST: should allow organization owner to view their own organization analytics', async () => {
      // 1. Membership check passes
      mockDataSource.query.mockResolvedValueOnce([{ role: 'owner' }]);
      // 2. Org check
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'org-1', name: 'Retina Coaching', slug: 'retina', status: 'active' },
      ]);
      // 3. Stats
      mockDataSource.query.mockResolvedValueOnce([
        {
          member_tutors_count: 5,
          total_bookings: 10,
          confirmed_bookings: 8,
          unique_students_served: 8,
          completed_volume_minor: '1600000',
        },
      ]);

      const ownerUser: AuthenticatedUser = { id: 'user-owner', roles: ['tutor'] } as any;
      const res = await analyticsService.getOrganizationAnalytics('org-1', {}, ownerUser);

      expect(res.organization.id).toBe('org-1');
      expect(res.metrics.memberTutorsCount).toBe(5);
    });

    it('SECURITY NEGATIVE TEST: should strictly reject unauthorized user trying to view cross-tenant organization analytics (IDOR)', async () => {
      // Membership check fails
      mockDataSource.query.mockResolvedValueOnce([]);

      const intruder: AuthenticatedUser = { id: 'user-intruder', roles: ['tutor'] } as any;
      await expect(
        analyticsService.getOrganizationAnalytics('org-secret-2', {}, intruder),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should return 404 NotFoundException if organization does not exist', async () => {
      const adminUser: AuthenticatedUser = { id: 'admin-1', roles: ['admin'] } as any;
      mockDataSource.query.mockResolvedValueOnce([]); // Org not found

      await expect(
        analyticsService.getOrganizationAnalytics('org-missing', {}, adminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
