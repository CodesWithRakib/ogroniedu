'use client';

import React, { Suspense, use } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import type { Locale } from '@/lib/i18n';

function LoginPageInner({ locale }: { locale: Locale }) {
  const [notice, setNotice] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem('ogroniedu.signedOut') === 'all') {
        sessionStorage.removeItem('ogroniedu.signedOut');
        setNotice(
          locale === 'bn'
            ? 'সব ডিভাইস থেকে সাইন-আউট সম্পন্ন হয়েছে। অনুগ্রহ করে আবার লগইন করুন।'
            : 'Signed out on all devices. Please sign in again.',
        );
      }
    } catch {
      // Private mode: notice simply won't show.
    }
  }, [locale]);
  return <LoginForm locale={locale} notice={notice} />;
}

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <div className="relative min-h-[90vh] flex flex-col justify-center mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <main id="main-content" className="w-full">
        <Suspense>
          <LoginPageInner locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
