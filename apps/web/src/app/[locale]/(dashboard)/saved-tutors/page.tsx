'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SavedTutorsPage } from '@/features/tutors/pages/saved-tutors-page';
import type { Locale } from '@/lib/i18n';

export default function SavedTutorsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <SavedTutorsPage locale={locale} />
    </RequireAuth>
  );
}
