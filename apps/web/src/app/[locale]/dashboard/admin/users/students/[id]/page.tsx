'use client';

import { use } from 'react';
import { AdminStudentDetailPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminStudentDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminStudentDetailPage locale={locale} userId={resolved.id} />;
}
