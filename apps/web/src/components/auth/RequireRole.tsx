'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import type { UserRole } from '@/store/slices/auth-slice';
import type { Locale } from '@/lib/i18n';

export function RequireRole({
  children,
  locale,
  allow,
  fallbackPath = '/dashboard',
}: {
  children: React.ReactNode;
  locale: Locale;
  allow: UserRole[];
  fallbackPath?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, token } = useAppSelector((s) => s.auth);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const allowed = Boolean(
    user?.roles?.some((r) => allow.includes(r)),
  );

  React.useEffect(() => {
    if (!hydrated || isLoading) return;
    if (!isAuthenticated || !token || !user) {
      router.replace(withLocale('/login', locale));
      return;
    }
    if (!allowed) {
      router.replace(withLocale(fallbackPath, locale));
    }
  }, [hydrated, isLoading, isAuthenticated, token, user, allowed, router, locale, fallbackPath]);

  if (!hydrated || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
