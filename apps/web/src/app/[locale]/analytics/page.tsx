'use client';

import React, { use } from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { type Locale } from '@/lib/i18n';

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar locale={locale} />
      <main className="flex-1">
        <AnalyticsDashboardView />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
