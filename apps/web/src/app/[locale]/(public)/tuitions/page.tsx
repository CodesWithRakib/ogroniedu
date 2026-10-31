import React from 'react';
import { type Locale } from '@/lib/i18n';
import { TuitionJobBoardPage } from '@/features/tuition-requests/pages/tuition-job-board-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  return <TuitionJobBoardPage locale={locale} />;
}
