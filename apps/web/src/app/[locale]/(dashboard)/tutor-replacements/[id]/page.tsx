'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ReplacementCaseDetailPageView } from '@/features/trust/pages/tutor-replacement-detail-page';
import type { Locale } from '@/lib/i18n';

export default function ReplacementCaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <ReplacementCaseDetailPageView locale={locale} caseId={resolved.id} />
    </RequireAuth>
  );
}
