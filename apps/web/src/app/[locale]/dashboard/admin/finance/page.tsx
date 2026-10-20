'use client';

import { use } from 'react';
import { AdminFinancePage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminFinanceRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminFinancePage locale={locale} />;
}
