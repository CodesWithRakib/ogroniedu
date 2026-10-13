import type { AnalyticsOperationalData } from '../types/analytics.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNum(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'number' && Number.isFinite(record[key]);
}

/**
 * Structural guard for merged analytics payloads. The dashboard reads deep
 * numeric fields unconditionally, so incomplete payloads must be rejected
 * at the boundary (empty state) rather than crashing or showing NaN.
 */
export function isCompleteAnalyticsData(raw: unknown): raw is AnalyticsOperationalData {
  if (!isRecord(raw)) return false;
  const { conversion, sessions, financials, trustAndQuality, retention, trends } = raw;
  if (!isRecord(conversion) || !isRecord(sessions) || !isRecord(financials)) return false;
  if (!isRecord(trustAndQuality) || !isRecord(retention)) return false;
  if (!Array.isArray(trends)) return false;
  return (
    hasNum(conversion, 'totalRequests') &&
    hasNum(conversion, 'confirmedBookings') &&
    hasNum(conversion, 'conversionRate') &&
    hasNum(sessions, 'totalSessions') &&
    hasNum(sessions, 'completedSessions') &&
    hasNum(sessions, 'completionRate') &&
    hasNum(financials, 'grossMerchandiseValueBdt') &&
    hasNum(financials, 'platformCommissionRevenueBdt') &&
    hasNum(trustAndQuality, 'averageRating') &&
    hasNum(retention, 'retentionRate')
  );
}
