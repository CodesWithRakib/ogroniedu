'use client';

import React, { use } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import type { Locale } from '@/lib/i18n';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <main id="main-content">
        <RegisterForm locale={locale} />
      </main>
    </div>
  );
}
