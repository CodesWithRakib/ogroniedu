'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export function RequireAuth({
  children,
  locale,
  fallbackPath = '/login',
}: {
  children: React.ReactNode;
  locale: Locale;
  fallbackPath?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, token } = useAppSelector((s) => s.auth);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated && !isLoading && (!isAuthenticated || !token || !user)) {
      router.replace(withLocale(fallbackPath, locale));
    }
  }, [hydrated, isAuthenticated, isLoading, token, user, router, locale, fallbackPath]);

  if (!hydrated || isLoading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated || !token || !user) return null;
  return <>{children}</>;
}
