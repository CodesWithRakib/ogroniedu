'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

interface TutorBookingProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Dedicated route for `booking.requested` navigation target:
 * Directs tutor to requests dashboard with the specific request highlighted.
 */
export default function TutorBookingRoute({ params }: TutorBookingProps) {
  const router = useRouter();
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const bookingId = resolved.id;

  React.useEffect(() => {
    router.replace(withLocale(`/dashboard/tutor/requests?highlight=${bookingId}`, locale));
  }, [bookingId, locale, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner />
      <p className="text-xs text-slate-500">
        {locale === 'bn'
          ? 'টিউশন অনুরোধে নিয়ে যাওয়া হচ্ছে...'
          : 'Redirecting to booking request...'}
      </p>
    </div>
  );
}
