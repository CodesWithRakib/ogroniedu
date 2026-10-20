'use client';

import { use } from 'react';
import { AdminLearningPage } from '@/features/admin/pages/admin-learning-page';
import type { Locale } from '@/lib/i18n';

export default function AdminLearningRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminLearningPage locale={locale} />;
}
