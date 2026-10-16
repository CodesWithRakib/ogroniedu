'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

interface BookingPayProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Dedicated redirect for `booking.accepted` notification target:
 * Directs user to role-specific escrow payment checkout with bookingId pre-selected.
 */
export default function BookingPayRoute({ params }: BookingPayProps) {
  const router = useRouter();
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const bookingId = resolved.id;
  const user = useAppSelector((s) => s.auth.user);

  React.useEffect(() => {
    const isGuardian = user?.roles?.includes('guardian');
    const targetPath = isGuardian
      ? `/dashboard/guardian/payments?bookingId=${bookingId}`
      : `/dashboard/student/payments?bookingId=${bookingId}`;

    router.replace(withLocale(targetPath, locale));
  }, [user, bookingId, locale, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner />
      <p className="text-xs text-slate-500">
        {locale === 'bn' ? 'পেমেন্ট চেকআউটে নিয়ে যাওয়া হচ্ছে...' : 'Redirecting to payment checkout...'}
      </p>
    </div>
  );
}
