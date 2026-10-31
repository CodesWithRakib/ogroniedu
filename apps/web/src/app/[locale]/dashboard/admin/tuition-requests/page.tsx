import React from 'react';
import { type Locale } from '@/lib/i18n';
import { AdminTuitionDeskPage } from '@/features/tuition-requests/pages/admin-tuition-desk-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  return <AdminTuitionDeskPage locale={locale} />;
}
