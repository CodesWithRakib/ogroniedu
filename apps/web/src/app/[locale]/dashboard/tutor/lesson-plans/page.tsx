'use client';

import { use } from 'react';
import { LessonPlannerPage } from '@/features/learning/pages/lesson-planner-page';
import type { Locale } from '@/lib/i18n';

export default function TutorLessonPlansRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <LessonPlannerPage locale={locale} />;
}
