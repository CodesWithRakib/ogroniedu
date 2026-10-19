'use client';

import { use } from 'react';
import { TutorProfileSettingsPage } from '@/features/tutors';
import type { Locale } from '@/lib/i18n';

export default function TutorProfileSettingsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <TutorProfileSettingsPage locale={locale} />;
}
