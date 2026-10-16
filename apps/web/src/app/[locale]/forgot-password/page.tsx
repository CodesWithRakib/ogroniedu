'use client';

import React, { Suspense, use } from 'react';
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import type { Locale } from '@/lib/i18n';

export default function ForgotPasswordRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <main id="main-content" tabIndex={-1} className="w-full">
        <Suspense>
          <ForgotPasswordPage locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
