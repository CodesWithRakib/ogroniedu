'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import type { AdminDashboardMetrics } from '../types/admin.types';

interface MetricCard {
  key: string;
  label: string;
  value: number;
  caption: string;
  valueClass: string;
  testId: string;
  isHero?: boolean;
}

/** Operational metrics strip — values come from the admin dashboard API only. Styled like Donezo/Shopeers. */
export function AdminMetricsGrid({ metrics }: { metrics: AdminDashboardMetrics }) {
  const t = useTranslations('admin');

  const cards: MetricCard[] = [
    {
      key: 'tutors',
      label: t('tutorVerificationQueue'),
      value: metrics.pendingTutorVerifications,
      caption: 'Pending Dossiers',
      valueClass: 'text-primary-foreground',
      testId: 'metric-pending-tutors',
      isHero: true,
    },
    {
      key: 'replacements',
      label: t('replacementQueue'),
      value: metrics.activeReplacementCases,
      caption: 'Active Cases',
      valueClass: 'text-warning',
      testId: 'metric-replacement-cases',
    },
    {
      key: 'safety',
      label: t('safetyQueue'),
      value: metrics.openSafetyReports,
      caption: 'Open Reports',
      valueClass: 'text-destructive',
      testId: 'metric-safety-reports',
    },
    {
      key: 'bookings',
      label: t('activeBookings'),
      value: metrics.activeBookingsCount,
      caption: 'In Progress',
      valueClass: 'text-primary',
      testId: 'metric-active-bookings',
    },
    {
      key: 'users',
      label: t('totalUsers'),
      value: metrics.totalRegisteredUsers,
      caption: 'Total Catalog',
      valueClass: 'text-foreground',
      testId: 'metric-total-users',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="operational-metrics-grid">
      {cards.map((card) => {
        if (card.isHero) {
          return (
            <div
              key={card.key}
              className="bg-gradient-to-br from-primary via-primary/95 to-primary-hover text-primary-foreground border border-primary/20 rounded-2xl p-5 shadow-primary/20 col-span-2 md:col-span-1 transition-all hover:-translate-y-0.5 relative overflow-hidden group select-none"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary-foreground/90 truncate">
                  {card.label}
                </p>
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <p
                className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight font-sans leading-none text-foreground"
                data-testid={card.testId}
              >
                {card.value}
              </p>
              <span className="text-[10px] text-muted-foreground font-semibold mt-2 inline-block px-2 py-0.5 rounded-full bg-muted">
                {card.caption}
              </span>
            </div>
          );
        }

        return (
          <div
            key={card.key}
            className="bg-card border border-border rounded-2xl p-5 shadow-xs col-span-2 md:col-span-1 transition-all hover:shadow-sm hover:-translate-y-0.5 group select-none"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground truncate">{card.label}</p>
              <div className="h-7 w-7 rounded-full border border-border bg-surface/75 text-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
            <p
              className={`text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight font-sans leading-none ${card.valueClass}`}
              data-testid={card.testId}
            >
              {card.value}
            </p>
            <span className="text-[10px] text-muted-foreground font-medium mt-2 inline-block px-2 py-0.5 rounded-full bg-surface border border-border">
              {card.caption}
            </span>
          </div>
        );
      })}
    </div>
  );
}
