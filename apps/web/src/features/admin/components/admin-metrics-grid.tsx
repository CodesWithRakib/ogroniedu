'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminDashboardMetrics } from '../types/admin.types';

interface MetricCard {
  key: string;
  label: string;
  value: number;
  caption: string;
  valueClass: string;
  testId: string;
}

/** Operational metrics strip — values come from the admin dashboard API only. */
export function AdminMetricsGrid({ metrics }: { metrics: AdminDashboardMetrics }) {
  const t = useTranslations('admin');

  const cards: MetricCard[] = [
    {
      key: 'tutors',
      label: t('tutorVerificationQueue'),
      value: metrics.pendingTutorVerifications,
      caption: 'Pending Dossiers',
      valueClass: 'text-teal-400',
      testId: 'metric-pending-tutors',
    },
    {
      key: 'replacements',
      label: t('replacementQueue'),
      value: metrics.activeReplacementCases,
      caption: 'Active Cases',
      valueClass: 'text-amber-400',
      testId: 'metric-replacement-cases',
    },
    {
      key: 'safety',
      label: t('safetyQueue'),
      value: metrics.openSafetyReports,
      caption: 'Open Reports',
      valueClass: 'text-rose-400',
      testId: 'metric-safety-reports',
    },
    {
      key: 'bookings',
      label: t('activeBookings'),
      value: metrics.activeBookingsCount,
      caption: 'In Progress',
      valueClass: 'text-blue-400',
      testId: 'metric-active-bookings',
    },
    {
      key: 'users',
      label: t('totalUsers'),
      value: metrics.totalRegisteredUsers,
      caption: 'Total Catalog',
      valueClass: 'text-slate-200',
      testId: 'metric-total-users',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="operational-metrics-grid">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1"
        >
          <p className="text-xs font-medium text-slate-400">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.valueClass}`} data-testid={card.testId}>
            {card.value}
          </p>
          <span className="text-[10px] text-slate-500">{card.caption}</span>
        </div>
      ))}
    </div>
  );
}
