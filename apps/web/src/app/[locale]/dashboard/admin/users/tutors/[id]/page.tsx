'use client';

import { use } from 'react';
import { AdminTutorDetailPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminTutorDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminTutorDetailPage locale={locale} tutorId={resolved.id} />;
}
