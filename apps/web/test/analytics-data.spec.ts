import { describe, it, expect } from 'vitest';
import { buildExportRows, toCsv } from '../src/features/analytics/utils/analytics-export';
import { isCompleteAnalyticsData } from '../src/features/analytics/utils/analytics-guards';
import type { AnalyticsOperationalData } from '../src/features/analytics/types/analytics.types';

const complete: AnalyticsOperationalData = {
  timeWindow: { startDate: '2026-03-01', endDate: '2026-03-31' },
  conversion: {
    totalRequests: 150,
    confirmedBookings: 120,
    cancelledRequests: 20,
    declinedRequests: 10,
    conversionRate: 80,
  },
  sessions: {
    totalSessions: 300,
    completedSessions: 270,
    cancelledSessions: 20,
    noShowSessions: 10,
    scheduledSessions: 0,
    completionRate: 90,
    sessionCancellationRate: 6.67,
    noShowRate: 3.33,
  },
  financials: {
    grossMerchandiseValueBdt: 250000,
    totalRefundedBdt: 12500,
    netProcessedVolumeBdt: 237500,
    platformCommissionRevenueBdt: 20000,
    refundRate: 5,
    successfulOrdersCount: 120,
    refundsCount: 5,
  },
  trustAndQuality: {
    averageRating: 4.85,
    totalReviews: 85,
    punctualityRating: 4.9,
    teachingClarityRating: 4.8,
    subjectMasteryRating: 4.85,
    replacementCasesCount: 2,
    replacementRate: 1.67,
    safetyReportsCount: 0,
    criticalSafetyCount: 0,
  },
  retention: { totalUniqueLearners: 90, repeatLearners: 45, retentionRate: 50 },
  trends: [{ date: '2026-03-01', requests: 10, confirmed: 8 }],
};

describe('Analytics data boundary (no fabricated metrics)', () => {
  it('accepts complete payloads and rejects partial ones', () => {
    expect(isCompleteAnalyticsData(complete)).toBe(true);
    expect(isCompleteAnalyticsData({})).toBe(false);
    expect(isCompleteAnalyticsData(null)).toBe(false);
    expect(isCompleteAnalyticsData({ ...complete, trends: 'soon' })).toBe(false);
    const { conversion, ...rest } = complete;
    void conversion;
    expect(isCompleteAnalyticsData(rest)).toBe(false);
    expect(
      isCompleteAnalyticsData({
        ...complete,
        financials: { ...complete.financials, grossMerchandiseValueBdt: Number.NaN },
      }),
    ).toBe(false);
  });

  it('builds deterministic export rows from real data', () => {
    const rows = buildExportRows(complete);
    expect(rows[0]).toEqual(['Metric Category', 'Metric Name', 'Value']);
    expect(rows).toContainEqual(['Conversion', 'Total Booking Requests', 150]);
    expect(rows).toContainEqual(['Financials', 'Net Volume (BDT)', 237500]);
    const csv = toCsv(rows);
    expect(csv.split('\n')).toHaveLength(rows.length);
    expect(csv).toContain('Metric Category,Metric Name,Value');
  });
});
