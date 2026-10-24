'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ProgressReportDetailPage } from '@/features/learning/pages/progress-detail-page';
import type { Locale } from '@/lib/i18n';

interface ProgressReportParams {
  locale: string;
  id: string;
}

export default function ProgressReportDetailRoute({
  params,
}: {
  params: Promise<ProgressReportParams>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const reportId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <ProgressReportDetailPage locale={locale} reportId={reportId} />
    </RequireAuth>
  );
}
