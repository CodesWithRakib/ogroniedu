'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatGroupedNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import type { AnalyticsOperationalData } from '../types/analytics.types';

/** Top-line KPI cards: conversion, completion, GMV, retention styled with Donezo/Shopeers aesthetics. */
export function AnalyticsKpiGrid({ data }: { data: AnalyticsOperationalData }) {
  const t = useTranslations('analytics');
  const locale = useLocale() as Locale;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      data-testid="kpi-cards-grid"
    >
      {/* Card 1: Conversion Rate (Featured Hero Card) */}
      <div className="bg-gradient-to-br from-primary via-primary/95 to-primary-hover text-primary-foreground border border-primary/20 rounded-3xl p-5 sm:p-6 shadow-lg shadow-primary/20 flex flex-col justify-between transition-all hover:-translate-y-0.5 relative overflow-hidden group select-none">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-primary-foreground/90">{t('conversionRate')}</p>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <p
              className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight font-sans"
              data-testid="kpi-conversion-rate"
            >
              {data.conversion.conversionRate}%
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({data.conversion.confirmedBookings} / {data.conversion.totalRequests})
            </span>
          </div>
          <div className="w-full bg-white/25 rounded-full h-1.5 overflow-hidden mt-3">
            <div
              className="bg-white h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.conversion.conversionRate, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted w-fit">
          <TrendingUp className="h-3 w-3" />
          <span>Active Inflow</span>
        </span>
      </div>

      {/* Card 2: Completion Rate */}
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group select-none">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">{t('completionRate')}</p>
          <div className="h-8 w-8 rounded-full border border-border/80 bg-surface/75 text-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <p
              className="text-3xl sm:text-4xl font-extrabold text-primary  tabular-nums tracking-tight font-sans"
              data-testid="kpi-completion-rate"
            >
              {data.sessions.completionRate}%
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({data.sessions.completedSessions} / {data.sessions.totalSessions})
            </span>
          </div>
          <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden mt-3">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.sessions.completionRate, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-primary  font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/40 w-fit">
          Verified Sessions
        </span>
      </div>

      {/* Card 3: GMV */}
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group select-none">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {t('grossMerchandiseValue')}
          </p>
          <div className="h-8 w-8 rounded-full border border-border/80 bg-surface/75 text-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="my-3">
          <div className="flex items-baseline gap-1.5">
            <p
              className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono tabular-nums tracking-tight"
              data-testid="kpi-gmv"
            >
              {formatGroupedNumber(data.financials.grossMerchandiseValueBdt, locale)}
            </p>
            <span className="text-xs text-muted-foreground font-bold">BDT</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium mt-2">
            {t('platformRevenue')}:{' '}
            <span className="text-foreground font-bold">
              {formatGroupedNumber(data.financials.platformCommissionRevenueBdt, locale)} BDT
            </span>
          </p>
        </div>
        <span className="text-[11px] text-success-soft-foreground  font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/40 w-fit">
          Escrow Reconciled
        </span>
      </div>

      {/* Card 4: Retention Rate */}
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group select-none">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">{t('retentionRate')}</p>
          <div className="h-8 w-8 rounded-full border border-border/80 bg-surface/75 text-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <p
              className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight font-sans"
              data-testid="kpi-retention-rate"
            >
              {data.retention.retentionRate}%
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({data.retention.repeatLearners} / {data.retention.totalUniqueLearners})
            </span>
          </div>
          <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden mt-3">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.retention.retentionRate, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border/70 w-fit">
          Returning Cohort
        </span>
      </div>
    </div>
  );
}
