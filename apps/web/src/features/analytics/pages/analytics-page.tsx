'use client';

import React from 'react';
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Card, CardContent } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import {
  useGetAnalyticsOverviewQuery,
  useGetFinancialAnalyticsQuery,
  useGetRetentionAnalyticsQuery,
} from '@/store/services/analytics-api';
import { useAnalyticsWindow } from '../hooks/use-analytics-window';
import { isCompleteAnalyticsData } from '../utils/analytics-guards';
import type { AnalyticsOperationalData } from '../types/analytics.types';

function toWindow(preset: '7d' | '30d' | '90d'): { days: number } {
  return { days: preset === '7d' ? 7 : preset === '90d' ? 90 : 30 };
}

/** Analytics console entry: windowed overview/financial/retention queries composed into the dashboard view. */
export function AnalyticsPage({ locale }: { locale: Locale }) {
  const { preset, onDateRangeChange } = useAnalyticsWindow();
  const overview = useGetAnalyticsOverviewQuery(toWindow(preset));
  const financials = useGetFinancialAnalyticsQuery(toWindow(preset));
  const retention = useGetRetentionAnalyticsQuery(toWindow(preset));

  const loading = overview.isLoading || financials.isLoading || retention.isLoading;
  const queryError = overview.isError
    ? normalizeApiError(overview.error, locale).message
    : financials.isError
      ? normalizeApiError(financials.error, locale).message
      : retention.isError
        ? normalizeApiError(retention.error, locale).message
        : null;

  if (loading && !overview.data) {
    return (
      <AdminLayout locale={locale} title={locale === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}>
        <div className="py-10">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }
  if (queryError && !overview.data) {
    return (
      <AdminLayout locale={locale} title={locale === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}>
        <div className="py-10">
          <Card>
            <CardContent className="py-8 text-center text-sm text-rose-600">{queryError}</CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const merged: unknown = {
    ...((overview.data?.data ?? {}) as Record<string, unknown>),
    ...((financials.data?.data ?? {}) as Record<string, unknown>),
    ...((retention.data?.data ?? {}) as Record<string, unknown>),
  };
  // Incomplete payloads render the dashboard empty state — never NaN/crash.
  const initialData: AnalyticsOperationalData | null = isCompleteAnalyticsData(merged)
    ? merged
    : null;

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}>
      <AnalyticsDashboardView initialData={initialData} onDateRangeChange={onDateRangeChange} />
    </AdminLayout>
  );
}
