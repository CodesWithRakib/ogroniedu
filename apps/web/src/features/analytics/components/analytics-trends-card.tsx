'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Daily activity trend visuals. Renders nothing when there are no trend points. */
export function AnalyticsTrendsCard({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  if (data.trends.length === 0) return null;

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      data-testid="trends-card"
    >
      <h3 className="text-base font-bold text-slate-200">{t('trendTitle')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.trends.map((point) => (
          <div
            key={point.date}
            className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2"
          >
            <span className="text-[11px] font-mono text-slate-500 block">{point.date}</span>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Requests:</span>
              <span className="font-bold text-slate-200">{point.requests}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-teal-400">Confirmed:</span>
              <span className="font-bold text-teal-300">{point.confirmed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
