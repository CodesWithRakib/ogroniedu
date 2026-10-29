'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useCheckoutFlow } from '@/features/payments/hooks/use-checkout-flow';
import { CheckoutSummary } from '@/features/payments/components/checkoutSummary';
import { CheckoutMethodPicker } from '@/features/payments/components/checkoutMethodPicker';
import { PaymentReceipt } from '@/features/payments/components/paymentReceipt';
import { CheckoutLedger } from '@/features/payments/components/checkoutLedger';
import { EmbeddedEasyCheckout } from '@/features/payments/components/embedded-easy-checkout';
import type {
  PaymentOrderDetails,
  PaymentReceiptData,
  PaymentProvider,
} from '@/features/payments/types/payment-checkout.types';

export type { PaymentOrderDetails, PaymentReceiptData, PaymentProvider };

interface PaymentCheckoutViewProps {
  locale: Locale;
  initialOrder?: PaymentOrderDetails;
  receipt?: PaymentReceiptData | null;
  payDisabledReason?: string | null;
  onPay?: (provider: PaymentProvider) => Promise<PaymentReceiptData>;
}

export function PaymentCheckoutView({
  locale,
  initialOrder,
  receipt: receiptProp,
  payDisabledReason,
  onPay,
}: PaymentCheckoutViewProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const isBn = locale === 'bn';
  const flow = useCheckoutFlow({ locale, initialOrder, receiptProp, onPay });
  const { order, receipt } = flow;

  if (!order) {
    return (
      <div className="flex flex-col gap-6 w-full py-2" data-testid="payment-empty-state">
        <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center text-foreground shadow-xs">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h4 className="text-base sm:text-lg font-black text-foreground">
            {isBn ? 'নিরাপদ এসক্রো পেমেন্ট ডিপোজিট' : 'Safe Escrow Payment Deposit'}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mt-1.5 leading-relaxed font-medium">
            {isBn
              ? 'উপরের তালিকা থেকে আপনার টিউশন কোর্স নির্বাচন করে "পেমেন্ট গেটওয়েতে যান" বাটনে ক্লিক করুন।'
              : 'Select your tuition course above and click "Proceed to Checkout" to initialize secure escrow payment via bKash, Nagad or Cards.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full py-4 text-foreground">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          {p.title}
        </h2>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{p.subtitle}</p>
      </div>

      {/* Sandbox Notice Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-foreground shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <ShieldCheck className="w-5 h-5 shrink-0" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-foreground">
            <span className="font-black uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md mr-2 text-[10px] border border-amber-300">
              {p.sandboxBadge}
            </span>
            <span>{p.noSuccessOnRedirectNotice}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <CheckoutSummary order={order} locale={locale} />

          {order.status === 'pending' &&
            order.checkoutUrl &&
            flow.selectedGateway === 'sslcommerz' && (
              <EmbeddedEasyCheckout
                orderId={order.id}
                checkoutUrl={order.checkoutUrl}
                amountMinor={order.amountMinor}
                locale={locale}
              />
            )}

          {order.status === 'pending' && (
            <CheckoutMethodPicker
              order={order}
              locale={locale}
              selectedGateway={flow.selectedGateway}
              onSelectGateway={flow.setSelectedGateway}
              onPay={flow.handlePay}
              isProcessing={flow.isProcessing}
              payError={flow.payError}
              payDisabledReason={payDisabledReason}
            />
          )}

          {order.status === 'succeeded' && receipt && (
            <PaymentReceipt receipt={receipt} locale={locale} onPrint={flow.handlePrint} />
          )}
        </div>

        <CheckoutLedger order={order} locale={locale} />
      </div>
    </div>
  );
}
