'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LearningPage } from '@/features/learning/pages/learning-page';
import { type Locale } from '@/lib/i18n';

export default function LearningRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <div className="py-6">
        <LearningPage locale={locale} />
      </div>
    </RequireAuth>
  );
}
