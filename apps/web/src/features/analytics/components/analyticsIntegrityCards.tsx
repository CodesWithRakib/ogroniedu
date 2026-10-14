'use client';

import { useTranslations, useLocale } from 'next-intl';
import { formatGroupedNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Financial flow + trust/quality guarantee metrics. */
export function AnalyticsIntegrityCards({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');
  const locale = useLocale() as Locale;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div
        className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
        data-testid="financial-overview-card"
      >
        <h3 className="text-base font-bold text-foreground">{t('financialOverviewTitle')}</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('grossMerchandiseValue')}</span>
            <span className="font-mono font-bold text-foreground">
              {formatGroupedNumber(data.financials.grossMerchandiseValueBdt, locale)} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('totalRefunded')}</span>
            <span className="font-mono font-bold text-rose-500">
              - {formatGroupedNumber(data.financials.totalRefundedBdt, locale)} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('netVolume')}</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatGroupedNumber(data.financials.netProcessedVolumeBdt, locale)} BDT
            </span>
          </div>
          <div className="flex justify-between py-1.5 font-semibold text-foreground">
            <span>{t('refundRate')}</span>
            <span className="font-mono">{data.financials.refundRate}%</span>
          </div>
        </div>
      </div>

      <div
        className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
        data-testid="trust-quality-card"
      >
        <h3 className="text-base font-bold text-foreground">{t('qualityTitle')}</h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('averageRating')}</span>
            <span className="font-bold text-amber-500">
              ★ {data.trustAndQuality.averageRating} / 5.0
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('replacementRate')}</span>
            <span className="font-bold text-foreground">
              {data.trustAndQuality.replacementRate}% ({data.trustAndQuality.replacementCasesCount}{' '}
              cases)
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">{t('criticalSafetyIncidents')}</span>
            <span className="font-bold text-rose-500">
              {data.trustAndQuality.criticalSafetyCount} critical alerts
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-muted-foreground">
            <span>Total Verified Reviews</span>
            <span className="font-semibold text-foreground">
              {data.trustAndQuality.totalReviews} reviews
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
