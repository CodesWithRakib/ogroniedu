'use client';

import React, { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { PaymentResultView } from '@/features/payments/components/payment-result-view';
import type { Locale } from '@/lib/i18n';

interface PaymentResultRouteProps {
  params: Promise<{ locale: string }>;
}

export default function PaymentResultPage({ params }: PaymentResultRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const searchParams = useSearchParams();

  const orderId = searchParams?.get('orderId') || '';
  const status = searchParams?.get('status') || undefined;
  const bookingId = searchParams?.get('bookingId') || undefined;

  return (
    <RequireAuth locale={locale}>
      <div className="py-6">
        <PaymentResultView
          orderId={orderId}
          locale={locale}
          initialStatus={status}
          bookingId={bookingId}
        />
      </div>
    </RequireAuth>
  );
}
