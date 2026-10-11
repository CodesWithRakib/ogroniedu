'use client';

import React, { use } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import type { Locale } from '@/lib/i18n';

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LoginForm locale={locale} />
    </div>
  );
}
