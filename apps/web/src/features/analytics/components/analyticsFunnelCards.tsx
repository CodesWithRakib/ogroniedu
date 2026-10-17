'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Booking conversion funnel + session reliability matrix. */
export function AnalyticsFunnelCards({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div
        className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
        data-testid="conversion-funnel-card"
      >
        <h3 className="text-base font-bold text-foreground">{t('conversionFunnelTitle')}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-foreground/80 font-medium mb-1">
              <span>{t('totalRequests')}</span>
              <span className="font-bold">{data.conversion.totalRequests}</span>
            </div>
            <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden">
              <div className="bg-muted-foreground/60 h-full w-full" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-primary font-medium mb-1">
              <span>{t('confirmedBookings')}</span>
              <span className="font-bold">{data.conversion.confirmedBookings}</span>
            </div>
            <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{
                  width: `${(data.conversion.confirmedBookings / (data.conversion.totalRequests || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
            <span>
              {t('cancelledRequests')}: {data.conversion.cancelledRequests}
            </span>
            <span>Declined: {data.conversion.declinedRequests}</span>
          </div>
        </div>
      </div>

      <div
        className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
        data-testid="session-reliability-card"
      >
        <h3 className="text-base font-bold text-foreground">{t('sessionReliabilityTitle')}</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">{t('completedSessions')}</p>
            <p className="text-xl font-bold text-primary  mt-1 font-sans">
              {data.sessions.completedSessions}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {data.sessions.completionRate}% of total
            </span>
          </div>
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">{t('noShowRate')}</p>
            <p className="text-xl font-bold text-warning mt-1 font-sans">
              {data.sessions.noShowRate}%
            </p>
            <span className="text-[10px] text-muted-foreground">
              {data.sessions.noShowSessions} instances
            </span>
          </div>
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">
              {t('sessionCancellationRate')}
            </p>
            <p className="text-xl font-bold text-destructive mt-1 font-sans">
              {data.sessions.sessionCancellationRate}%
            </p>
            <span className="text-[10px] text-muted-foreground">
              {data.sessions.cancelledSessions} cancelled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
