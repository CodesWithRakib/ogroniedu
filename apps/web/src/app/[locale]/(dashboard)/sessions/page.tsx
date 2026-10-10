'use client';

import React, { use } from 'react';
import { SessionScheduleCalendar } from '@/components/scheduling/SessionScheduleCalendar';
import { type Locale } from '@/lib/i18n';

interface SessionsPageProps {
  params: Promise<{ locale: string }>;
}

export default function SessionsPage({ params }: SessionsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="py-6">
      <SessionScheduleCalendar locale={locale} />
    </div>
  );
}
