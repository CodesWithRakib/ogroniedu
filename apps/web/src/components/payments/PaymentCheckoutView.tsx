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
      <div className="space-y-6 max-w-5xl mx-auto py-2" data-testid="payment-empty-state">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center text-foreground">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-extrabold text-foreground">
            {locale === 'bn' ? 'নিরাপদ এসক্রো পেমেন্ট ডিপোজিট' : 'Safe Escrow Payment Deposit'}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
            {locale === 'bn'
              ? 'উপরের তালিকা থেকে আপনার টিউশন কোর্স নির্বাচন করে "পেমেন্ট গেটওয়েতে যান" বাটনে ক্লিক করুন।'
              : 'Select your tuition course above and click "Proceed to Checkout" to initialize secure escrow payment via bKash, Nagad or Cards.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-warning ">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-warning  shrink-0" />
          <div className="text-sm font-medium">
            <span className="font-bold uppercase tracking-wider bg-warning/20 px-2 py-0.5 rounded mr-2 text-xs">
              {p.sandboxBadge}
            </span>
            {p.noSuccessOnRedirectNotice}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground ">{p.title}</h2>
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
