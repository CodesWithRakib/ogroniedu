'use client';

import { use } from 'react';
import { TutorDashboardPage } from '@/features/tutors/pages/tutor-dashboard-page';
import type { Locale } from '@/lib/i18n';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <TutorDashboardPage locale={locale} />;
}
