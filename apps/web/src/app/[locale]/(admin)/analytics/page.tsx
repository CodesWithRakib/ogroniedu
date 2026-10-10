'use client';

import React, { use } from 'react';
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { type Locale } from '@/lib/i18n';

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="py-6">
      <AnalyticsDashboardView />
    </div>
  );
}
