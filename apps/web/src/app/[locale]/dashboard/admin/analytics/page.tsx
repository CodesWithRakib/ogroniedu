'use client';

import { use } from 'react';
import { AnalyticsPage } from '@/features/analytics/pages/analytics-page';
import type { Locale } from '@/lib/i18n';

export default function AdminAnalyticsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AnalyticsPage locale={locale} />;
}
