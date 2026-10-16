'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { OnboardingPage } from '@/features/onboarding/pages/onboarding-page';
import type { Locale } from '@/lib/i18n';

export default function OnboardingRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <main id="main-content" tabIndex={-1}>
        <RequireAuth locale={locale}>
          <OnboardingPage locale={locale} />
        </RequireAuth>
      </main>
    </div>
  );
}
