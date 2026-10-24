'use client';

import { use } from 'react';
import { AdminBookingDetailPage } from '@/features/admin';
import type { Locale } from '@/lib/i18n';

export default function AdminBookingDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminBookingDetailPage locale={locale} bookingId={resolved.id} />;
}
