'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

interface BookingDetailProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Dedicated route for `booking.confirmed` / `booking.cancelled` navigation target:
 * Directs user to their appropriate requests or bookings overview.
 */
export default function BookingDetailRoute({ params }: BookingDetailProps) {
  const router = useRouter();
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const bookingId = resolved.id;
  const user = useAppSelector((s) => s.auth.user);

  React.useEffect(() => {
    let targetPath = `/dashboard/student/requests?highlight=${bookingId}`;
    if (user?.roles?.includes('tutor')) {
      targetPath = `/dashboard/tutor/requests?highlight=${bookingId}`;
    } else if (user?.roles?.includes('guardian')) {
      targetPath = `/dashboard/guardian/requests?highlight=${bookingId}`;
    }

    router.replace(withLocale(targetPath, locale));
  }, [user, bookingId, locale, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner />
      <p className="text-xs text-slate-500">
        {locale === 'bn' ? 'বুকিংয়ের তথ্যে নিয়ে যাওয়া হচ্ছে...' : 'Redirecting to booking details...'}
      </p>
    </div>
  );
}
