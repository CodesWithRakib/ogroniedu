'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TutorReplacementsListPage } from '@/features/trust/pages/tutor-replacements-list-page';
import type { Locale } from '@/lib/i18n';

export default function GuardianTutorReplacementsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <TutorReplacementsListPage locale={locale} />
    </RequireAuth>
  );
}
