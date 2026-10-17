'use client';

import { use } from 'react';
import { AdminSettingsSecurityPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminSettingsSecurityRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminSettingsSecurityPage locale={locale} />;
}
