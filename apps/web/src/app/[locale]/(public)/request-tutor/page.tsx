import React from 'react';
import { type Locale } from '@/lib/i18n';
import { RequestTutorPage } from '@/features/tuition-requests/pages/request-tutor-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  return <RequestTutorPage locale={locale} />;
}
