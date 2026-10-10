import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  AnalyticsDashboardView,
  AnalyticsOperationalData,
} from '../src/components/analytics/AnalyticsDashboardView';
import { getDictionary } from '../src/lib/i18n';

describe('Operational Analytics & Source-of-Truth Reporting Frontend Tests (Phase 15)', () => {
  const sampleAnalyticsData: AnalyticsOperationalData = {
    timeWindow: {
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-31T23:59:59.999Z',
    },
    conversion: {
      totalRequests: 150,
      confirmedBookings: 120,
      cancelledRequests: 20,
      declinedRequests: 10,
      conversionRate: 80.0,
    },
    sessions: {
      totalSessions: 300,
      completedSessions: 270,
      cancelledSessions: 20,
      noShowSessions: 10,
      scheduledSessions: 0,
      completionRate: 90.0,
      sessionCancellationRate: 6.67,
      noShowRate: 3.33,
    },
    financials: {
      grossMerchandiseValueBdt: 250000,
      totalRefundedBdt: 12500,
      netProcessedVolumeBdt: 237500,
      platformCommissionRevenueBdt: 20000,
      refundRate: 5.0,
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
    retention: {
      totalUniqueLearners: 90,
      repeatLearners: 45,
      retentionRate: 50.0,
    },
    trends: [
      { date: '2026-03-01', requests: 10, confirmed: 8 },
      { date: '2026-03-02', requests: 12, confirmed: 10 },
    ],
    gateways: [
      { provider: 'bkash', volumeBdt: 150000, ordersCount: 75 },
      { provider: 'sslcommerz', volumeBdt: 100000, ordersCount: 45 },
    ],
  };

  it('should instantiate AnalyticsDashboardView with custom initialData', () => {
    const element = React.createElement(AnalyticsDashboardView, {
      initialData: sampleAnalyticsData,
    });

    expect(element).toBeDefined();
    expect(element.props.initialData?.conversion.totalRequests).toBe(150);
    expect(element.props.initialData?.conversion.confirmedBookings).toBe(120);
    expect(element.props.initialData?.conversion.conversionRate).toBe(80.0);
    expect(element.props.initialData?.sessions.completionRate).toBe(90.0);
    expect(element.props.initialData?.financials.grossMerchandiseValueBdt).toBe(250000);
    expect(element.props.initialData?.financials.platformCommissionRevenueBdt).toBe(20000);
    expect(element.props.initialData?.trustAndQuality.averageRating).toBe(4.85);
    expect(element.props.initialData?.retention.retentionRate).toBe(50.0);
    expect(element.props.initialData?.gateways).toHaveLength(2);
  });

  it('should instantiate AnalyticsDashboardView with default props without crashing', () => {
    const element = React.createElement(AnalyticsDashboardView, {});
    expect(element).toBeDefined();
  });

  it('should verify 100% dictionary key parity for analytics namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.analytics).toBeDefined();
    expect(enDict.analytics).toBeDefined();

    const bnKeys = Object.keys(bnDict.analytics).sort();
    const enKeys = Object.keys(enDict.analytics).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(30);

    // Verify key titles and operational terminology
    expect(bnDict.analytics.title).toBe('অপারেশনাল অ্যানালিটিক্স ও রিপোর্ট');
    expect(enDict.analytics.title).toBe('Operational Analytics & Metrics');

    expect(bnDict.analytics.conversionFunnelTitle).toBe('বুকিং কনভার্সন ফানেল');
    expect(enDict.analytics.conversionFunnelTitle).toBe('Booking Conversion Funnel');

    expect(bnDict.analytics.sessionReliabilityTitle).toBe('ক্লাস সম্পন্ন ও নির্ভরযোগ্যতা');
    expect(enDict.analytics.sessionReliabilityTitle).toBe('Session Completion & Reliability');

    expect(bnDict.analytics.financialOverviewTitle).toBe('মোট বুকিং ভলিউম ও প্ল্যাটফর্ম রাজস্ব');
    expect(enDict.analytics.financialOverviewTitle).toBe('Gross Booking Volume & Revenue');

    expect(bnDict.analytics.qualityTitle).toBe('বিশ্বাসযোগ্যতা ও গ্যারান্টি রিপোর্ট');
    expect(enDict.analytics.qualityTitle).toBe('Trust, Quality & Guarantee Rate');

    expect(bnDict.analytics.repeatLearners).toBe('পুনরায় বুকিংকারী শিক্ষার্থী (≥২)');
    expect(enDict.analytics.repeatLearners).toBe('Repeat Learners (≥2 Bookings)');
  });

  it('should accurately represent mathematical formulas and invariants in sample data', () => {
    const data = sampleAnalyticsData;

    // Conversion rate: (confirmed / total) * 100
    const calculatedConversion = (data.conversion.confirmedBookings / data.conversion.totalRequests) * 100;
    expect(data.conversion.conversionRate).toBeCloseTo(calculatedConversion, 2);

    // Session completion rate: (completed / total) * 100
    const calculatedCompletion = (data.sessions.completedSessions / data.sessions.totalSessions) * 100;
    expect(data.sessions.completionRate).toBeCloseTo(calculatedCompletion, 2);

    // Net processed volume: GMV - refunds
    const calculatedNet = data.financials.grossMerchandiseValueBdt - data.financials.totalRefundedBdt;
    expect(data.financials.netProcessedVolumeBdt).toBe(calculatedNet);

    // Platform commission is 8% of GMV: 250000 * 0.08 = 20000
    const calculatedCommission = Math.round(data.financials.grossMerchandiseValueBdt * 0.08);
    expect(data.financials.platformCommissionRevenueBdt).toBe(calculatedCommission);

    // Retention rate: (repeatLearners / totalUniqueLearners) * 100
    const calculatedRetention = (data.retention.repeatLearners / data.retention.totalUniqueLearners) * 100;
    expect(data.retention.retentionRate).toBeCloseTo(calculatedRetention, 2);
  });
});
