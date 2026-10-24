'use client';

import { use } from 'react';
import { AdminTutorVerificationDetailPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminTutorVerificationDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminTutorVerificationDetailPage locale={locale} tutorId={resolved.id} />;
}
