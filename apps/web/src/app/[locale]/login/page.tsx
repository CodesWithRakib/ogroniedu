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
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <main id="main-content">
        <Suspense>
          <LoginPageInner locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
