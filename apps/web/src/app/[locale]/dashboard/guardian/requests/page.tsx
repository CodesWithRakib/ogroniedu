'use client';

import { use } from 'react';
import { RequestsPage } from '@/features/bookings/pages/requests-page';
import type { Locale } from '@/lib/i18n';

export default function GuardianRequestsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <RequestsPage locale={locale} />;
}
