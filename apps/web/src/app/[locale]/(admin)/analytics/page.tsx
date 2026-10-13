'use client';

import { use } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { AnalyticsPage } from '@/features/analytics/pages/analytics-page';
import type { Locale } from '@/lib/i18n';

export default function AnalyticsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireRole locale={locale} allow={['admin', 'super_admin']}>
      <AnalyticsPage locale={locale} />
    </RequireRole>
  );
}
