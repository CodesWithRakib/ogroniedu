'use client';

import React, { use } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import type { Locale } from '@/lib/i18n';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <div className="relative min-h-[90vh] flex flex-col justify-center mx-auto w-full max-w-7xl px-4 py-8 overflow-x-clip sm:px-6 lg:px-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-[100vw] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <main id="main-content" tabIndex={-1} className="w-full">
        <RegisterForm locale={locale} />
      </main>
    </div>
  );
}
