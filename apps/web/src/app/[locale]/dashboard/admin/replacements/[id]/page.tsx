'use client';

import React, { use } from 'react';
import { AdminReplacementDetailPageView } from '@/features/admin/pages/admin-replacement-detail-page';
import type { Locale } from '@/lib/i18n';

export default function AdminReplacementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return <AdminReplacementDetailPageView locale={locale} caseId={resolved.id} />;
}
