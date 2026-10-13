'use client';

import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PaymentCheckoutView } from '@/components/payments/PaymentCheckoutView';
import { Button, Card, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { usePaymentOrder, type PaymentProvider } from '../hooks/use-payment-order';

/** Payments entry: order creation form, sandbox checkout view, and guardian/admin refund action. */
export function PaymentsPage({ locale }: { locale: Locale }) {
  const pay = usePaymentOrder(locale);
  const { dict, order } = pay;

  return (
    <DashboardShell locale={locale} title={dict.payments.title} subtitle={dict.payments.subtitle}>
      <Card className="mb-4">
        <CardContent className="py-4">
          <form onSubmit={pay.handleCreateOrder} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end" data-testid="create-order-form">
            <div className="space-y-1">
              <label htmlFor="pay-booking" className="text-xs font-medium">{dict.payments.bookingRef}</label>
              <select id="pay-booking" value={pay.bookingId} onChange={(e) => pay.setBookingId(e.target.value)} className="h-10 w-full rounded-xl border px-3 text-sm" data-testid="pay-booking-select">
                {pay.bookingIds.map((id) => (<option key={id} value={id}>{id.slice(0, 8)}…</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-amount" className="text-xs font-medium">{dict.payments.totalAmount} (BDT)</label>
              <Input id="pay-amount" type="number" min={1} value={pay.amountBdt} onChange={(e) => pay.setAmountBdt(e.target.value)} data-testid="pay-amount-input" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-provider" className="text-xs font-medium">{dict.payments.selectGateway}</label>
              <select id="pay-provider" value={pay.provider} onChange={(e) => pay.setProvider(e.target.value as PaymentProvider)} className="h-10 w-full rounded-xl border px-3 text-sm" data-testid="pay-provider-select">
                <option value="bkash">{dict.payments.bkashTitle}</option>
                <option value="nagad">{dict.payments.nagadTitle}</option>
                <option value="sslcommerz">{dict.payments.sslTitle}</option>
              </select>
            </div>
            <Button type="submit" isLoading={pay.creating} data-testid="create-order-btn">{dict.payments.payNow}</Button>
          </form>
          {pay.formError && <p role="alert" className="mt-2 text-xs text-rose-600">{pay.formError}</p>}
        </CardContent>
      </Card>

      {pay.requests.isLoading ? (
        <LoadingSpinner />
      ) : (
        <PaymentCheckoutView
          locale={locale}
          initialOrder={order ?? undefined}
          onPay={pay.handlePay}
        />
      )}

      {pay.canRefund && order && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            isLoading={pay.refunding}
            onClick={pay.handleRefund}
            data-testid="refund-btn"
          >
            {locale === 'bn' ? 'রিফান্ড অনুরোধ' : 'Request refund'}
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
