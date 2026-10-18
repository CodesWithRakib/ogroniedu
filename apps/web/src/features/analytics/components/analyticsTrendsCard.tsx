'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Daily activity trend visuals. Renders nothing when there are no trend points. */
export function AnalyticsTrendsCard({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  if (data.trends.length === 0) return null;

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
      data-testid="trends-card"
    >
      <h3 className="text-base font-bold text-foreground">{t('trendTitle')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.trends.map((point) => (
          <div
            key={point.date}
            className="bg-surface/75 p-4 rounded-2xl border border-border space-y-2"
          >
            <span className="text-[11px] font-mono text-muted-foreground block">{point.date}</span>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Requests:</span>
              <span className="font-bold text-foreground">{point.requests}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-primary  font-semibold">Confirmed:</span>
              <span className="font-bold text-primary ">{point.confirmed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
