'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { useGetMyOnboardingQuery } from '@/store/services/onboarding-api';
import { withLocale } from '@/lib/auth';
import { onboardingRequiredForPath } from '@/lib/route-policy';
import type { Locale } from '@/lib/i18n';

/**
 * Diverts a signed-in user with an incomplete onboarding track to `/onboarding`.
 *
 * This is supplementary UX: onboarding state is persisted and evaluated
 * server-side (`GET /api/v1/onboarding/me`). Accounts that predate the
 * onboarding records report `not_started` and are never diverted, so existing
 * flows keep working while new registrations are guided through the track.
 */
export function OnboardingGate({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data } = useGetMyOnboardingQuery(undefined, { skip: !isAuthenticated });

  React.useEffect(() => {
    if (!data || !pathname) return;
    if (!onboardingRequiredForPath(pathname)) return;
    if (data.status === 'not_started' || data.isComplete || data.status === 'pending_review')
      return;
    router.replace(withLocale('/onboarding', locale));
  }, [data, pathname, router, locale]);

  return <>{children}</>;
}
