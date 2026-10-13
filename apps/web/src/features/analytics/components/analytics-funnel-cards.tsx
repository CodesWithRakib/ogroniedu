'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Booking conversion funnel + session reliability matrix. */
export function AnalyticsFunnelCards({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        data-testid="conversion-funnel-card"
      >
        <h3 className="text-base font-bold text-slate-200">{t('conversionFunnelTitle')}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>{t('totalRequests')}</span>
              <span className="font-bold">{data.conversion.totalRequests}</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div className="bg-slate-600 h-full w-full" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-teal-300 font-medium mb-1">
              <span>{t('confirmedBookings')}</span>
              <span className="font-bold">{data.conversion.confirmedBookings}</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full"
                style={{
                  width: `${(data.conversion.confirmedBookings / (data.conversion.totalRequests || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>
              {t('cancelledRequests')}: {data.conversion.cancelledRequests}
            </span>
            <span>Declined: {data.conversion.declinedRequests}</span>
          </div>
        </div>
      </div>

      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        data-testid="session-reliability-card"
      >
        <h3 className="text-base font-bold text-slate-200">{t('sessionReliabilityTitle')}</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('completedSessions')}</p>
            <p className="text-xl font-bold text-indigo-400 mt-1">
              {data.sessions.completedSessions}
            </p>
            <span className="text-[10px] text-slate-500">
              {data.sessions.completionRate}% of total
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('noShowRate')}</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{data.sessions.noShowRate}%</p>
            <span className="text-[10px] text-slate-500">
              {data.sessions.noShowSessions} instances
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('sessionCancellationRate')}</p>
            <p className="text-xl font-bold text-rose-400 mt-1">
              {data.sessions.sessionCancellationRate}%
            </p>
            <span className="text-[10px] text-slate-500">
              {data.sessions.cancelledSessions} cancelled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
