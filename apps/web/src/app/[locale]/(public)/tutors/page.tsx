'use client';

import React, { Suspense, use } from 'react';
import { TutorsPage } from '@/features/tutor-discovery/pages/tutors-page';
import { LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';

interface TutorsRouteProps {
  params: Promise<{ locale: string }>;
}

export default function TutorsRoute({ params }: TutorsRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <Suspense
      fallback={
        <div className="py-10">
          <LoadingSpinner />
        </div>
      }
    >
      <TutorsPage locale={locale} />
    </Suspense>
  );
}
