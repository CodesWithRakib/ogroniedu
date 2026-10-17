'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

interface PaymentDetailProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Dedicated route for `payment.succeeded` navigation target:
 * Directs user to payment dashboard with verifiable order receipt.
 */
export default function PaymentDetailRoute({ params }: PaymentDetailProps) {
  const router = useRouter();
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const paymentId = resolved.id;
  const user = useAppSelector((s) => s.auth.user);

  React.useEffect(() => {
    const isGuardian = user?.roles?.includes('guardian');
    const targetPath = isGuardian
      ? `/dashboard/guardian/payments?orderId=${paymentId}`
      : `/dashboard/student/payments?orderId=${paymentId}`;

    router.replace(withLocale(targetPath, locale));
  }, [user, paymentId, locale, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner />
      <p className="text-xs text-muted-foreground">
        {locale === 'bn'
          ? 'পেমেন্ট রসিদে নিয়ে যাওয়া হচ্ছে...'
          : 'Redirecting to payment receipt...'}
      </p>
    </div>
  );
}
