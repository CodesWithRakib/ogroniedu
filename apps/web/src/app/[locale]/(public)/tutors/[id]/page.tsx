'use client';

import React, { Suspense, use } from 'react';
import { TutorDetailsPage } from '@/features/tutors/pages/tutor-details-page';
import { LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';

interface TutorDetailsRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function TutorDetailsRoute({ params }: TutorDetailsRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const tutorId = resolved.id;

  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center items-center bg-[#031317]">
          <LoadingSpinner />
        </div>
      }
    >
      <TutorDetailsPage tutorId={tutorId} locale={locale} />
    </Suspense>
  );
}
