'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Top-line KPI cards: conversion, completion, GMV, retention. */
export function AnalyticsKpiGrid({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="kpi-cards-grid"
    >
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <p className="text-xs font-medium text-slate-400">{t('conversionRate')}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-teal-400" data-testid="kpi-conversion-rate">
            {data.conversion.conversionRate}%
          </p>
          <span className="text-xs text-slate-500">
            ({data.conversion.confirmedBookings} / {data.conversion.totalRequests})
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-teal-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(data.conversion.conversionRate, 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <p className="text-xs font-medium text-slate-400">{t('completionRate')}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-indigo-400" data-testid="kpi-completion-rate">
            {data.sessions.completionRate}%
          </p>
          <span className="text-xs text-slate-500">
            ({data.sessions.completedSessions} / {data.sessions.totalSessions})
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(data.sessions.completionRate, 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <p className="text-xs font-medium text-slate-400">{t('grossMerchandiseValue')}</p>
        <div className="flex items-baseline space-x-1">
          <p className="text-3xl font-extrabold text-emerald-400 font-mono" data-testid="kpi-gmv">
            {data.financials.grossMerchandiseValueBdt.toLocaleString()}
          </p>
          <span className="text-xs text-slate-400 font-semibold">BDT</span>
        </div>
        <p className="text-[11px] text-emerald-400/80">
          {t('platformRevenue')}: {data.financials.platformCommissionRevenueBdt.toLocaleString()}{' '}
          BDT
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <p className="text-xs font-medium text-slate-400">{t('retentionRate')}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-amber-400" data-testid="kpi-retention-rate">
            {data.retention.retentionRate}%
          </p>
          <span className="text-xs text-slate-500">
            ({data.retention.repeatLearners} repeat / {data.retention.totalUniqueLearners})
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(data.retention.retentionRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
