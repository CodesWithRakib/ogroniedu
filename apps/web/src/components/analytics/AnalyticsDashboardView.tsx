'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  AnalyticsDashboardViewProps,
  AnalyticsOperationalData,
} from '@/features/analytics/types/analytics.types';
import { AnalyticsHeader } from '@/features/analytics/components/analytics-header';
import { AnalyticsKpiGrid } from '@/features/analytics/components/analytics-kpi-grid';
import { AnalyticsFunnelCards } from '@/features/analytics/components/analytics-funnel-cards';
import { AnalyticsIntegrityCards } from '@/features/analytics/components/analytics-integrity-cards';
import { AnalyticsTrendsCard } from '@/features/analytics/components/analytics-trends-card';
import { buildExportRows, downloadFile, toCsv } from '@/features/analytics/utils/analytics-export';
import type { AnalyticsWindowPreset } from '@/features/analytics/hooks/use-analytics-window';

export type { AnalyticsOperationalData, AnalyticsDashboardViewProps };

/**
 * Analytics console composer. Renders an explicit empty state when no data
 * is provided — the previous hardcoded sample dataset default was removed
 * (no fabricated operational metrics).
 */
export function AnalyticsDashboardView({
  initialData = null,
  onDateRangeChange,
}: AnalyticsDashboardViewProps) {
  const t = useTranslations('analytics');

  const [data, setData] = useState<AnalyticsOperationalData | null>(initialData);
  const [selectedPreset, setSelectedPreset] = useState<AnalyticsWindowPreset>('30d');

  React.useEffect(() => {
    setData(initialData ?? null);
  }, [initialData]);

  const handlePresetSelect = async (preset: AnalyticsWindowPreset) => {
    setSelectedPreset(preset);
    if (onDateRangeChange) {
      await onDateRangeChange(preset);
    }
  };

  const handleExportJson = () => {
    if (!data) return;
    downloadFile(
      `ogroniedu-analytics-${selectedPreset}.json`,
      'application/json',
      JSON.stringify(data, null, 2),
    );
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadFile(
      `ogroniedu-operational-report-${selectedPreset}.csv`,
      'text/csv',
      toCsv(buildExportRows(data)),
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6"
      data-testid="analytics-dashboard-view"
    >
      <AnalyticsHeader
        selectedPreset={selectedPreset}
        onPreset={handlePresetSelect}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-3 text-xs text-emerald-300">
        <span className="text-base">🛡️</span>
        <span>{t('sourceOfTruthNotice')}</span>
      </div>

      {!data ? (
        <div data-testid="analytics-empty">
          <EmptyState title={t('noDataTitle')} description={t('noDataDesc')} />
        </div>
      ) : (
        <>
          <AnalyticsKpiGrid data={data} />
          <AnalyticsFunnelCards data={data} />
          <AnalyticsIntegrityCards data={data} />
          <AnalyticsTrendsCard data={data} />
        </>
      )}
    </div>
  );
}
