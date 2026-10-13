'use client';

import React from 'react';
import { AnalyticsDashboardView, type AnalyticsOperationalData } from '@/components/analytics/AnalyticsDashboardView';
import { LoadingSpinner, Card, CardContent } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import {
  useGetAnalyticsOverviewQuery,
  useGetFinancialAnalyticsQuery,
  useGetRetentionAnalyticsQuery,
} from '@/store/services/analytics-api';
import { useAnalyticsWindow } from '../hooks/use-analytics-window';

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
  const error = overview.isError
    ? normalizeApiError(overview.error, locale).message
    : financials.isError
      ? normalizeApiError(financials.error, locale).message
      : retention.isError
        ? normalizeApiError(retention.error, locale).message
        : null;

  if (loading && !overview.data) {
    return <div className="py-10"><LoadingSpinner /></div>;
  }
  if (error && !overview.data) {
    return (
      <div className="py-10 px-6"><Card><CardContent className="py-8 text-center text-sm text-rose-600">{error}</CardContent></Card></div>
    );
  }

  const o = (overview.data?.data ?? {}) as Record<string, never>;
  const f = (financials.data?.data ?? {}) as Record<string, never>;
  const r = (retention.data?.data ?? {}) as Record<string, never>;
  void locale;

  return (
    <div className="py-6">
      <AnalyticsDashboardView
        initialData={{ ...(o as object), ...(f as object), ...(r as object) } as AnalyticsOperationalData}
        onDateRangeChange={onDateRangeChange}
      />
    </div>
  );
}
