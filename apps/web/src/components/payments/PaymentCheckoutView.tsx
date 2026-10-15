'use client';

import { ShieldCheck } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useCheckoutFlow } from '@/features/payments/hooks/use-checkout-flow';
import { CheckoutSummary } from '@/features/payments/components/checkoutSummary';
import { CheckoutMethodPicker } from '@/features/payments/components/checkoutMethodPicker';
import { PaymentReceipt } from '@/features/payments/components/paymentReceipt';
import { CheckoutLedger } from '@/features/payments/components/checkoutLedger';
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
  onSimulateWebhook?: (orderId: string, provider: string) => Promise<void>;
}

export function PaymentCheckoutView({
  locale,
  initialOrder,
  receipt: receiptProp,
  payDisabledReason,
  onPay,
  onSimulateWebhook,
}: PaymentCheckoutViewProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const flow = useCheckoutFlow({ locale, initialOrder, receiptProp, onPay, onSimulateWebhook });
  const { order, receipt } = flow;

  if (!order) {
    return (
      <div
        className="space-y-8 max-w-5xl mx-auto py-6 px-4 sm:px-6"
        data-testid="payment-empty-state"
      >
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
          {locale === 'bn'
            ? 'পেমেন্ট অর্ডার তৈরি করতে একটি বুকিং নির্বাচন করুন।'
            : 'Select a booking to create a payment order.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-sm font-medium">
            <span className="font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded mr-2 text-xs">
              {p.sandboxBadge}
            </span>
            {p.noSuccessOnRedirectNotice}
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {p.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{p.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CheckoutSummary order={order} locale={locale} />

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
