import type { AnalyticsOperationalData } from '../types/analytics.types';

export type ExportRow = [string, string, string | number];

/** Flatten dashboard data to CSV/JSON export rows (pure, unit-tested). */
export function buildExportRows(data: AnalyticsOperationalData): ExportRow[] {
  return [
    ['Metric Category', 'Metric Name', 'Value'],
    ['Conversion', 'Total Booking Requests', data.conversion.totalRequests],
    ['Conversion', 'Confirmed Bookings', data.conversion.confirmedBookings],
    ['Conversion', 'Conversion Rate %', `${data.conversion.conversionRate}%`],
    ['Sessions', 'Total Sessions Scheduled', data.sessions.totalSessions],
    ['Sessions', 'Completed Sessions', data.sessions.completedSessions],
    ['Sessions', 'Completion Rate %', `${data.sessions.completionRate}%`],
    ['Sessions', 'No-Show Rate %', `${data.sessions.noShowRate}%`],
    ['Financials', 'Gross Merchandise Value (BDT)', data.financials.grossMerchandiseValueBdt],
    ['Financials', 'Total Refunded (BDT)', data.financials.totalRefundedBdt],
    ['Financials', 'Net Volume (BDT)', data.financials.netProcessedVolumeBdt],
    ['Financials', 'Platform Revenue (8%) (BDT)', data.financials.platformCommissionRevenueBdt],
    ['Trust & Quality', 'Average Rating', data.trustAndQuality.averageRating],
    ['Trust & Quality', 'Replacement Guarantee Rate %', `${data.trustAndQuality.replacementRate}%`],
    ['Retention', 'Total Unique Learners', data.retention.totalUniqueLearners],
    ['Retention', 'Repeat Learners', data.retention.repeatLearners],
    ['Retention', 'Learner Retention Rate %', `${data.retention.retentionRate}%`],
  ];
}

/** Trigger a browser download (client-only; no-op during SSR). */
export function downloadFile(filename: string, mime: string, content: string): void {
  if (typeof document === 'undefined') return;
  const url =
    mime === 'application/json'
      ? `data:text/json;charset=utf-8,${encodeURIComponent(content)}`
      : `data:text/csv;charset=utf-8,${encodeURI(content)}`;
  const anchor = document.createElement('a');
  anchor.setAttribute('href', url);
  anchor.setAttribute('download', filename);
  anchor.click();
}

export function toCsv(rows: ExportRow[]): string {
  return rows.map((row) => row.join(',')).join('\n');
}
