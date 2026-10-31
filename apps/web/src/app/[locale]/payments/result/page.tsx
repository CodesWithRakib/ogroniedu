'use client';

import React, { use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentResultView } from '@/features/payments/components/payment-result-view';
import type { Locale } from '@/lib/i18n';

interface PaymentResultRouteProps {
  params: Promise<{ locale: string }>;
}

export default function PaymentResultRoute({ params }: PaymentResultRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId') || '';
  const initialStatus = searchParams.get('status') || undefined;
  const bookingId = searchParams.get('bookingId') || undefined;

  // If inside an iframe (such as SSLCommerz in-page checkout frame), postMessage to parent
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'PAYMENT_RESULT',
          orderId,
          status: initialStatus,
          bookingId,
        },
        '*',
      );
    }
  }, [orderId, initialStatus, bookingId]);

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <PaymentResultView
        orderId={orderId}
        locale={locale}
        initialStatus={initialStatus}
        bookingId={bookingId}
      />
    </div>
  );
}
