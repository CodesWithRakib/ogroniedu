import type { AnalyticsWindowPreset } from '../hooks/use-analytics-window';

export interface AnalyticsTrendPoint {
  date: string;
  requests: number;
  confirmed: number;
}

export interface AnalyticsGatewayShare {
  provider: string;
  volumeBdt: number;
  ordersCount: number;
}

export interface AnalyticsOperationalData {
  timeWindow: {
    startDate: string;
    endDate: string;
  };
  conversion: {
    totalRequests: number;
    confirmedBookings: number;
    cancelledRequests: number;
    declinedRequests: number;
    conversionRate: number;
  };
  sessions: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    scheduledSessions: number;
    completionRate: number;
    sessionCancellationRate: number;
    noShowRate: number;
  };
  financials: {
    grossMerchandiseValueBdt: number;
    totalRefundedBdt: number;
    netProcessedVolumeBdt: number;
    platformCommissionRevenueBdt: number;
    refundRate: number;
    successfulOrdersCount: number;
    refundsCount: number;
  };
  trustAndQuality: {
    averageRating: number;
    totalReviews: number;
    punctualityRating: number;
    teachingClarityRating: number;
    subjectMasteryRating: number;
    replacementCasesCount: number;
    replacementRate: number;
    safetyReportsCount: number;
    criticalSafetyCount: number;
  };
  retention: {
    totalUniqueLearners: number;
    repeatLearners: number;
    retentionRate: number;
  };
  trends: AnalyticsTrendPoint[];
  gateways?: AnalyticsGatewayShare[];
}

export interface AnalyticsDashboardViewProps {
  initialData?: AnalyticsOperationalData | null;
  onDateRangeChange?: (rangePreset: AnalyticsWindowPreset) => Promise<void>;
}
