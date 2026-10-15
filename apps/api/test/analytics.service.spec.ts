import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AnalyticsTutorService } from '../src/modules/analytics/services/analytics-tutor.service';

describe('Analytics & Reporting Service Specifications (Phase 15)', () => {
  let service: AnalyticsService;

  const mockDataSource = {
    query: vi.fn(),
  };

  const mockLedgerService = {
    runReconciliation: vi.fn().mockResolvedValue({
      isBalanced: true,
      totalDebits: '100000',
      totalCredits: '100000',
      discrepancy: '0',
      status: 'reconciled',
      accounts: [
        { code: '1010_CASH_SSLCOMMERZ', name: 'Cash', accountType: 'asset', balance: '100000' },
        {
          code: '2010_STUDENT_ESCROW',
          name: 'Escrow',
          accountType: 'liability',
          balance: '100000',
        },
      ],
      checkedAt: new Date(),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService(
      mockDataSource as any,
      mockLedgerService as any,
      new AnalyticsTutorService(mockDataSource as any),
    );
  });

  describe('Temporal Boundary Validation & Anti-Double-Counting Constraints', () => {
    it('POSITIVE TEST: should accept valid ISO date ranges', () => {
      const bounds = service.parseTimeBounds({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });
      expect(bounds.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(bounds.end.toISOString()).toBe('2026-01-31T23:59:59.000Z');
    });

    it('NEGATIVE TEST: should reject inverted dates (startDate > endDate)', () => {
      expect(() =>
        service.parseTimeBounds({
          startDate: '2026-02-01T00:00:00Z',
          endDate: '2026-01-01T00:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject malformed date strings', () => {
      expect(() =>
        service.parseTimeBounds({
          startDate: 'not-a-valid-date',
          endDate: '2026-01-01T00:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Operational Overview Reconciliation with Known Fixtures', () => {
    it('POSITIVE TEST: should compute exact conversion, completion, financial and trust metrics', async () => {
      // 1. Booking conversion funnel
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_requests: 100,
          confirmed_bookings: 75,
          cancelled_requests: 15,
          declined_requests: 10,
        },
      ]);

      // 2. Session reliability
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_sessions: 200,
          completed_sessions: 180,
          cancelled_sessions: 14,
          no_show_sessions: 6,
          scheduled_sessions: 0,
        },
      ]);

      // 3. Payment GMV
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_gmv_minor: '15000000', // 150,000.00 BDT
          total_orders: 75,
        },
      ]);

      // 4. Refunds
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_refunds_minor: '1500000', // 15,000.00 BDT
          total_refund_count: 5,
        },
      ]);

      // 5. Reviews & Ratings
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_reviews: 60,
          average_rating: '4.85',
          punctuality_rating: '4.90',
          teaching_clarity_rating: '4.80',
          subject_mastery_rating: '4.95',
        },
      ]);

      // 6. Replacement guarantee cases
      mockDataSource.query.mockResolvedValueOnce([{ count: 3 }]);

      // 7. Safety reports
      mockDataSource.query.mockResolvedValueOnce([{ total_safety: 2, critical_safety: 1 }]);

      // 8. Trends
      mockDataSource.query.mockResolvedValueOnce([
        { metric_date: '2026-01-10', requests: 10, confirmed: 8 },
      ]);

      const result = await service.getOperationalOverview({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      // Assert Conversion: 75 / 100 = 75.00%
      expect(result.conversion.totalRequests).toBe(100);
      expect(result.conversion.confirmedBookings).toBe(75);
      expect(result.conversion.conversionRate).toBe(75);

      // Assert Session Reliability: 180 / 200 = 90.00%, no-shows = 3.00%
      expect(result.sessions.totalSessions).toBe(200);
      expect(result.sessions.completedSessions).toBe(180);
      expect(result.sessions.completionRate).toBe(90);
      expect(result.sessions.noShowSessions).toBe(6);
      expect(result.sessions.noShowRate).toBe(3);

      // Assert Financials: GMV = 150000 BDT, Refunds = 15000 BDT, Net = 135000 BDT
      expect(result.financials.grossMerchandiseValueBdt).toBe(150000);
      expect(result.financials.totalRefundedBdt).toBe(15000);
      expect(result.financials.netProcessedVolumeBdt).toBe(135000);
      expect(result.financials.platformCommissionRevenueBdt).toBe(12000); // 8% of 150,000
      expect(result.financials.refundRate).toBe(10); // 15000 / 150000 * 100

      // Assert Trust & Quality
      expect(result.trustAndQuality.averageRating).toBe(4.85);
      expect(result.trustAndQuality.totalReviews).toBe(60);
      expect(result.trustAndQuality.replacementCasesCount).toBe(3);
      expect(result.trustAndQuality.replacementRate).toBe(4); // 3 / 75 * 100 = 4.00%
      expect(result.trustAndQuality.criticalSafetyCount).toBe(1);

      // Trends
      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].requests).toBe(10);
    });

    it('POSITIVE TEST: should handle zero division gracefully without NaN or Infinity', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ total_requests: 0, confirmed_bookings: 0 }])
        .mockResolvedValueOnce([{ total_sessions: 0, completed_sessions: 0 }])
        .mockResolvedValueOnce([{ total_gmv_minor: '0', total_orders: 0 }])
        .mockResolvedValueOnce([{ total_refunds_minor: '0', total_refund_count: 0 }])
        .mockResolvedValueOnce([{ total_reviews: 0, average_rating: '5.0' }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total_safety: 0, critical_safety: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.getOperationalOverview({});

      expect(result.conversion.conversionRate).toBe(0);
      expect(result.sessions.completionRate).toBe(0);
      expect(result.sessions.noShowRate).toBe(0);
      expect(result.financials.refundRate).toBe(0);
      expect(result.trustAndQuality.replacementRate).toBe(0);
    });
  });

  describe('Financial Analytics & Provider Breakdown', () => {
    it('POSITIVE TEST: should breakdown financial volume across gateways and reconcile ledger', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          { provider: 'bkash', orders_count: 50, volume_minor: '8000000' },
          { provider: 'sslcommerz', orders_count: 25, volume_minor: '5000000' },
        ])
        .mockResolvedValueOnce([
          { reason: 'Tutor cancellation', count: 3, amount_minor: '600000' },
        ]);

      const fin = await service.getFinancialAnalytics({});

      expect(fin.providerBreakdown).toHaveLength(2);
      expect(fin.providerBreakdown[0].provider).toBe('bkash');
      expect(fin.providerBreakdown[0].volumeBdt).toBe(80000);
      expect(fin.providerBreakdown[1].volumeBdt).toBe(50000);
      expect(fin.refundBreakdown[0].amountBdt).toBe(6000);
      expect(fin.ledgerReconciliation.isBalanced).toBe(true);
      expect(mockLedgerService.runReconciliation).toHaveBeenCalled();
    });
  });

  describe('Tutor Performance & Retention Analytics', () => {
    it('POSITIVE TEST: should compute average response time and tutor leaderboard', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ avg_response_hours: '1.8' }])
        .mockResolvedValueOnce([
          {
            tutor_user_id: 'tut-1',
            tutor_name: 'Nusrat Jahan',
            completed_sessions: 45,
            no_show_sessions: 0,
            average_rating: '4.95',
          },
        ])
        .mockResolvedValueOnce([
          {
            name_en: 'Physics',
            name_bn: 'পদার্থবিজ্ঞান',
            total_bookings: 30,
            completed_sessions: 60,
          },
        ]);

      const res = await service.getTutorPerformanceAnalytics({});

      expect(res.avgResponseHours).toBe(1.8);
      expect(res.topTutors[0].tutorName).toBe('Nusrat Jahan');
      expect(res.topTutors[0].completedSessions).toBe(45);
      expect(res.subjects[0].nameEn).toBe('Physics');
    });

    it('POSITIVE TEST: should calculate repeat learner retention rate without double counting', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          total_unique_learners: 100,
          repeat_learners: 42,
          loyal_learners: 18,
        },
      ]);

      const ret = await service.getRetentionAnalytics({});

      expect(ret.totalUniqueLearners).toBe(100);
      expect(ret.repeatLearners).toBe(42);
      expect(ret.retentionRate).toBe(42); // 42 / 100 * 100
    });
  });

  describe('Personal Tutor Analytics (ABAC Scoped)', () => {
    it('POSITIVE TEST: should compute personal inquiry acceptance, earnings, and completion for tutor', async () => {
      const tutorId = '00000000-0000-0000-0000-000000000099';

      mockDataSource.query
        .mockResolvedValueOnce([
          { total_inquiries: 20, accepted_inquiries: 18, declined_inquiries: 2 },
        ])
        .mockResolvedValueOnce([
          { total_sessions: 36, completed_sessions: 35, no_show_sessions: 0 },
        ])
        .mockResolvedValueOnce([
          { total_earnings_minor: '4500000' }, // 45,000.00 BDT
        ])
        .mockResolvedValueOnce([{ reviews_count: 15, average_rating: '4.90' }]);

      const tutorMetrics = await service.getMyTutorAnalytics(tutorId, {});

      expect(tutorMetrics.tutorUserId).toBe(tutorId);
      expect(tutorMetrics.inquiries.acceptanceRate).toBe(90); // 18 / 20 * 100
      expect(tutorMetrics.sessions.completedSessions).toBe(35);
      expect(tutorMetrics.sessions.completionRate).toBe(97.22); // 35 / 36 * 100
      expect(tutorMetrics.earnings.totalEarningsBdt).toBe(45000);
      expect(tutorMetrics.feedback.averageRating).toBe(4.9);
    });
  });
});
