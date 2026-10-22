import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { EventTrackingService } from '../src/modules/analytics/services/event-tracking.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AnalyticsTutorService } from '../src/modules/analytics/services/analytics-tutor.service';
import { AllowedAnalyticsEvent, type TrackEventDto } from '../src/modules/analytics/dto/track-event.dto';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

/**
 * Phase 14: Product Analytics & Retention Optimization Test Suite
 *
 * Validates:
 * 1. Client analytics event ingestion and anti-spoofing security (rejects client-emitted authoritative events).
 * 2. Event payload PII sanitization before persistence.
 * 3. Multi-stage conversion funnel and reliability math invariants.
 * 4. Learner retention and re-booking cohort metrics.
 * 5. Tutor performance telemetry and ABAC personal analytics isolation.
 */
describe('Phase 14: Product Analytics & Retention Optimization', () => {
  describe('1. Client Telemetry & Event Ingestion Security', () => {
    let trackingService: EventTrackingService;
    let mockDataSource: any;

    beforeEach(() => {
      mockDataSource = {
        query: vi.fn().mockResolvedValue([{ id: 1 }]),
      };
      trackingService = new EventTrackingService(mockDataSource);
    });

    it('SUCCESS: Ingests client-permitted interaction events (e.g. tutor search)', async () => {
      const dto: TrackEventDto = {
        eventName: AllowedAnalyticsEvent.TUTOR_SEARCH_PERFORMED,
        properties: { query: 'physics', district: 'dhaka' },
      };

      const result = await trackingService.trackClientEvent(dto, {
        id: 'usr-student-1',
        email: 'student@example.com',
        roles: ['student'],
      });

      expect(result.recorded).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_analytics_events'),
        expect.arrayContaining(['tutor_search_performed', 'usr-student-1', 'student']),
      );
    });

    it('ANTI-SPOOFING: Strictly rejects client emission of server-authoritative events (e.g. booking_confirmed)', async () => {
      const dto: any = {
        eventName: 'booking_confirmed',
        properties: { bookingId: 'b-1' },
      };

      await expect(
        trackingService.trackClientEvent(dto, {
          id: 'usr-attacker-1',
          email: 'attacker@example.com',
          roles: ['student'],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('ANTI-SPOOFING: Strictly rejects client emission of session_completed or payment_succeeded', async () => {
      const sessionDto: any = { eventName: 'session_completed', properties: {} };
      const paymentDto: any = { eventName: 'payment_succeeded', properties: {} };

      await expect(trackingService.trackClientEvent(sessionDto)).rejects.toThrow(BadRequestException);
      await expect(trackingService.trackClientEvent(paymentDto)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('PII SANITIZATION: Redacts sensitive fields from properties before recording event', async () => {
      const dto: TrackEventDto = {
        eventName: AllowedAnalyticsEvent.BOOKING_STARTED,
        properties: {
          tutorId: 't-123',
          nid: '19981234567890123',
          password: 'secretPassword',
          phoneNumber: '01712345678',
        },
      };

      await trackingService.trackClientEvent(dto);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const passedPropsJson = mockDataSource.query.mock.calls[0][1][6];
      const savedProps = JSON.parse(passedPropsJson);

      expect(savedProps.tutorId).toBe('t-123');
      expect(savedProps.password).toBeUndefined();
      expect(savedProps.nid).toBeUndefined();
      expect(savedProps.phoneNumber).toBeUndefined();
    });
  });

  describe('2. Multi-Stage Conversion Funnel & Reliability Math', () => {
    let service: AnalyticsService;
    let mockDataSource: any;

    beforeEach(() => {
      mockDataSource = { query: vi.fn() };
      service = new AnalyticsService(
        mockDataSource,
        { runReconciliation: vi.fn() } as any,
        new AnalyticsTutorService(mockDataSource),
      );
    });

    it('CONVERSION MATH: Accurately computes booking conversion and session reliability percentages', async () => {
      mockDataSource.query
        // 1. Conversion
        .mockResolvedValueOnce([{ total_requests: 80, confirmed_bookings: 60 }])
        // 2. Sessions
        .mockResolvedValueOnce([{ total_sessions: 150, completed_sessions: 135, no_show_sessions: 3 }])
        // 3. GMV
        .mockResolvedValueOnce([{ total_gmv_minor: '12000000', total_orders: 60 }])
        // 4. Refunds
        .mockResolvedValueOnce([{ total_refunds_minor: '600000', total_refund_count: 3 }])
        // 5. Reviews
        .mockResolvedValueOnce([{ total_reviews: 40, average_rating: '4.90' }])
        // 6. Replacements
        .mockResolvedValueOnce([{ count: 1 }])
        // 7. Safety
        .mockResolvedValueOnce([{ total_safety: 0, critical_safety: 0 }])
        // 8. Trends
        .mockResolvedValueOnce([]);

      const data = await service.getOperationalOverview({
        startDate: '2026-03-01T00:00:00Z',
        endDate: '2026-03-31T23:59:59Z',
      });

      // 60 / 80 * 100 = 75.00%
      expect(data.conversion.conversionRate).toBe(75);
      expect(data.conversion.totalRequests).toBe(80);
      expect(data.conversion.confirmedBookings).toBe(60);

      // 135 / 150 * 100 = 90.00%
      expect(data.sessions.completionRate).toBe(90);
      expect(data.sessions.totalSessions).toBe(150);
      expect(data.sessions.completedSessions).toBe(135);

      // 3 / 150 * 100 = 2.00%
      expect(data.sessions.noShowRate).toBe(2);

      // Financials: 120,000 BDT GMV - 6,000 BDT Refunds = 114,000 BDT Net
      expect(data.financials.grossMerchandiseValueBdt).toBe(120000);
      expect(data.financials.totalRefundedBdt).toBe(6000);
      expect(data.financials.netProcessedVolumeBdt).toBe(114000);
    });

    it('ZERO-SAFE: Handles zero activity windows gracefully without NaN or Infinity', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ total_requests: 0, confirmed_bookings: 0 }])
        .mockResolvedValueOnce([{ total_sessions: 0, completed_sessions: 0, no_show_sessions: 0 }])
        .mockResolvedValueOnce([{ total_gmv_minor: '0', total_orders: 0 }])
        .mockResolvedValueOnce([{ total_refunds_minor: '0', total_refund_count: 0 }])
        .mockResolvedValueOnce([{ total_reviews: 0, average_rating: '5.0' }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total_safety: 0, critical_safety: 0 }])
        .mockResolvedValueOnce([]);

      const data = await service.getOperationalOverview({});

      expect(data.conversion.conversionRate).toBe(0);
      expect(Number.isFinite(data.conversion.conversionRate)).toBe(true);
      expect(data.sessions.completionRate).toBe(0);
      expect(Number.isFinite(data.sessions.completionRate)).toBe(true);
      expect(data.financials.refundRate).toBe(0);
      expect(Number.isFinite(data.financials.refundRate)).toBe(true);
    });
  });

  describe('3. Learner Retention & Re-Booking Cohorts', () => {
    let service: AnalyticsService;
    let mockDataSource: any;

    beforeEach(() => {
      mockDataSource = { query: vi.fn() };
      service = new AnalyticsService(
        mockDataSource,
        {} as any,
        new AnalyticsTutorService(mockDataSource),
      );
    });

    it('RETENTION COHORTS: Accurately separates repeat learners from one-time learners', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_unique_learners: 100,
          repeat_learners: 45,
          loyal_learners: 20,
        },
      ]);

      const retention = await service.getRetentionAnalytics({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-03-31T23:59:59Z',
      });

      expect(retention.totalUniqueLearners).toBe(100);
      expect(retention.repeatLearners).toBe(45);
      expect(retention.loyalLearners).toBe(20);
      // 45 / 100 * 100 = 45.00%
      expect(retention.retentionRate).toBe(45);
    });

    it('RETENTION COHORTS: Returns 0% retention rate when there are zero unique learners', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_unique_learners: 0,
          repeat_learners: 0,
          loyal_learners: 0,
        },
      ]);

      const retention = await service.getRetentionAnalytics({});
      expect(retention.retentionRate).toBe(0);
      expect(Number.isFinite(retention.retentionRate)).toBe(true);
    });
  });

  describe('4. Tutor Leaderboard & Quality Analytics', () => {
    let tutorAnalyticsService: AnalyticsTutorService;
    let mockDataSource: any;

    beforeEach(() => {
      mockDataSource = { query: vi.fn() };
      tutorAnalyticsService = new AnalyticsTutorService(mockDataSource);
    });

    it('LEADERBOARD: Ranks top tutors by completed sessions and average rating', async () => {
      mockDataSource.query
        // 1. Avg response hours
        .mockResolvedValueOnce([{ avg_response_hours: '1.8' }])
        // 2. Leaderboard
        .mockResolvedValueOnce([
          {
            tutor_user_id: 't-1',
            tutor_name: 'Dr. Rafiq',
            completed_sessions: 42,
            no_show_sessions: 0,
            average_rating: '4.95',
          },
          {
            tutor_user_id: 't-2',
            tutor_name: 'Tanvir Ahmed',
            completed_sessions: 35,
            no_show_sessions: 1,
            average_rating: '4.88',
          },
        ])
        // 3. Subject demand
        .mockResolvedValueOnce([
          {
            name_en: 'Higher Math',
            name_bn: 'উচ্চতর গণিত',
            total_bookings: 50,
            completed_sessions: 40,
          },
        ]);

      const analytics = await tutorAnalyticsService.getTutorPerformanceAnalytics({});

      expect(analytics.avgResponseHours).toBe(1.8);
      expect(analytics.topTutors).toHaveLength(2);
      expect(analytics.topTutors[0].tutorName).toBe('Dr. Rafiq');
      expect(analytics.topTutors[0].completedSessions).toBe(42);
      expect(analytics.topTutors[0].averageRating).toBe(4.95);
      expect(analytics.subjects[0].nameBn).toBe('উচ্চতর গণিত');
    });

    it('PERSONAL ANALYTICS: Scopes inquiry conversion metrics strictly to the requested tutor', async () => {
      mockDataSource.query
        // Inquiries
        .mockResolvedValueOnce([
          { total_inquiries: 20, accepted_inquiries: 18, declined_inquiries: 2 },
        ])
        // Completed sessions
        .mockResolvedValueOnce([
          { total_sessions: 30, completed_sessions: 29, no_show_sessions: 0 },
        ])
        // Earnings
        .mockResolvedValueOnce([{ total_earnings_minor: '3600000', completed_count: 29 }])
        // Ratings
        .mockResolvedValueOnce([{ reviews_count: 15, average_rating: '4.92' }]);

      const myAnalytics = await tutorAnalyticsService.getMyTutorAnalytics('tutor-uuid-123', {});

      expect(myAnalytics.inquiries.totalInquiries).toBe(20);
      expect(myAnalytics.inquiries.acceptedInquiries).toBe(18);
      expect(myAnalytics.inquiries.acceptanceRate).toBe(90); // 18 / 20 * 100
      expect(myAnalytics.sessions.completionRate).toBe(96.67); // 29 / 30 * 100
      expect(myAnalytics.earnings.totalEarningsBdt).toBe(36000); // 3,600,000 poisha = 36,000 BDT
    });
  });
});
