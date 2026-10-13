'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Financial flow + trust/quality guarantee metrics. */
export function AnalyticsIntegrityCards({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        data-testid="financial-overview-card"
      >
        <h3 className="text-base font-bold text-slate-200">{t('financialOverviewTitle')}</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('grossMerchandiseValue')}</span>
            <span className="font-mono font-bold text-slate-200">
              {data.financials.grossMerchandiseValueBdt.toLocaleString()} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('totalRefunded')}</span>
            <span className="font-mono font-bold text-rose-400">
              - {data.financials.totalRefundedBdt.toLocaleString()} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('netVolume')}</span>
            <span className="font-mono font-bold text-emerald-400">
              {data.financials.netProcessedVolumeBdt.toLocaleString()} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 font-semibold text-slate-300">
            <span>{t('refundRate')}</span>
            <span className="font-mono">{data.financials.refundRate}%</span>
          </div>
        </div>
      </div>

      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        data-testid="trust-quality-card"
      >
        <h3 className="text-base font-bold text-slate-200">{t('qualityTitle')}</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('averageRating')}</span>
            <span className="font-bold text-amber-400">
              ★ {data.trustAndQuality.averageRating} / 5.0
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('replacementRate')}</span>
            <span className="font-bold text-slate-200">
              {data.trustAndQuality.replacementRate}% ({data.trustAndQuality.replacementCasesCount}{' '}
              cases)
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">{t('criticalSafetyIncidents')}</span>
            <span className="font-bold text-rose-400">
              {data.trustAndQuality.criticalSafetyCount} critical alerts
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-400">
            <span>Total Verified Reviews</span>
            <span className="font-semibold text-slate-300">
              {data.trustAndQuality.totalReviews} reviews
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
