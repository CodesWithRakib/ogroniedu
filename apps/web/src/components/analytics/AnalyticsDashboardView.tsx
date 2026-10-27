'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  AnalyticsDashboardViewProps,
  AnalyticsOperationalData,
} from '@/features/analytics/types/analytics.types';
import { AnalyticsHeader } from '@/features/analytics/components/analyticsHeader';
import { AnalyticsKpiGrid } from '@/features/analytics/components/analyticsKpiGrid';
import { AnalyticsFunnelCards } from '@/features/analytics/components/analyticsFunnelCards';
import { AnalyticsIntegrityCards } from '@/features/analytics/components/analyticsIntegrityCards';
import { AnalyticsTrendsCard } from '@/features/analytics/components/analyticsTrendsCard';
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
    <div className="flex flex-col gap-6" data-testid="analytics-dashboard-view">
      <AnalyticsHeader
        selectedPreset={selectedPreset}
        onPreset={handlePresetSelect}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-primary font-medium">
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
