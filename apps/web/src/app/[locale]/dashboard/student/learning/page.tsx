'use client';

import { use } from 'react';
import { LearningPage } from '@/features/learning/pages/learning-page';
import type { Locale } from '@/lib/i18n';

export default function StudentLearningRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <LearningPage locale={locale} />;
}
