'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { NewReplacementRequestPage } from '@/features/trust/pages/tutor-replacement-create-page';
import type { Locale } from '@/lib/i18n';

export default function NewReplacementRequestRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <NewReplacementRequestPage locale={locale} />
    </RequireAuth>
  );
}
