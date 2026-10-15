'use client';

import { use } from 'react';
import { StudentDashboardPage } from '@/features/student/pages/student-dashboard-page';
import type { Locale } from '@/lib/i18n';

export default function StudentDashboardRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <StudentDashboardPage locale={locale} />;
}
