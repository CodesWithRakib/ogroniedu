'use client';

import { use } from 'react';
import { TutorDashboardPage } from '@/features/tutors';
import type { Locale } from '@/lib/i18n';

export default function TutorDashboardRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <TutorDashboardPage locale={locale} />;
}
