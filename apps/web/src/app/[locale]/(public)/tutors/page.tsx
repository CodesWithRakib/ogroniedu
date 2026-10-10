'use client';

import React, { use } from 'react';
import { TutorSearchCatalog } from '@/components/discovery/TutorSearchCatalog';
import { type Locale } from '@/lib/i18n';

interface TutorsPageProps {
  params: Promise<{ locale: string }>;
}

export default function TutorsPage({ params }: TutorsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="py-6">
      <TutorSearchCatalog locale={locale} />
    </div>
  );
}
