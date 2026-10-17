'use client';

import { use } from 'react';
import { AdminUsersTutorsPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminUsersTutorsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminUsersTutorsPage locale={locale} />;
}
