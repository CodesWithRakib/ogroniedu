'use client';

import { use } from 'react';
import { AdminOverviewPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminDashboardRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminOverviewPage locale={locale} />;
}
