import React from 'react';
import { type Locale } from '@/lib/i18n';
import { AdminTuitionDetailPage } from '@/features/tuition-requests/pages/admin-tuition-detail-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  return <AdminTuitionDetailPage id={resolvedParams.id} locale={locale} />;
}
