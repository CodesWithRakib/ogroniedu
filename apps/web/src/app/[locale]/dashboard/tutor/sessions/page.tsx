'use client';

import { use } from 'react';
import { SessionsPage } from '@/features/bookings/pages/sessions-page';
import type { Locale } from '@/lib/i18n';

export default function TutorSessionsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <SessionsPage locale={locale} />;
}
