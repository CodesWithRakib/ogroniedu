'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PaymentCheckoutView, type PaymentOrderDetails } from '@/components/payments/PaymentCheckoutView';
import { Button, Card, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError, newIdempotencyKey } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import {
  useCreatePaymentOrderMutation,
  useLazyGetPaymentReceiptQuery,
  useProcessRefundMutation,
} from '@/store/services/payments-api';

function PaymentsContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const requests = useGetBookingRequestsQuery();
  const bookingIds = (requests.data?.data ?? []).map((r) => r.id);
  const [bookingId, setBookingId] = React.useState('');
  const [amountBdt, setAmountBdt] = React.useState('1000');
  const [provider, setProvider] = React.useState<'bkash' | 'nagad' | 'sslcommerz'>('bkash');
  const [order, setOrder] = React.useState<PaymentOrderDetails | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [createOrder, { isLoading: creating }] = useCreatePaymentOrderMutation();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [processRefund, { isLoading: refunding }] = useProcessRefundMutation();
  const canRefund = user?.roles?.some((r) => r === 'admin' || r === 'super_admin' || r === 'guardian');

  React.useEffect(() => {
    if (!bookingId && bookingIds[0]) setBookingId(bookingIds[0]);
  }, [bookingIds, bookingId]);

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!bookingId) return;
    const amountMinor = Math.round(Number(amountBdt) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setFormError(locale === 'bn' ? 'সঠিক পরিমাণ দিন।' : 'Enter a valid amount.');
      return;
    }
    try {
      const res = await createOrder({
        body: { bookingId, amountMinor, provider },
        idempotencyKey: newIdempotencyKey('order'),
      }).unwrap();
      const created = (res.data ?? res) as Record<string, unknown>;
      setOrder({
        id: String(created.id ?? created.orderId ?? `ord-${Date.now()}`),
        bookingId,
        payerName: user?.displayName ?? '',
        studentName: '',
        tutorName: '',
        subjectName: '',
        amountMinor,
        currency: 'BDT',
        status: 'pending',
        provider,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setFormError(normalizeApiError(err as never, locale).message);
    }
  }

  return (
    <DashboardShell locale={locale} title={dict.payments.title} subtitle={dict.payments.subtitle}>
      <Card className="mb-4">
        <CardContent className="py-4">
          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end" data-testid="create-order-form">
            <div className="space-y-1">
              <label htmlFor="pay-booking" className="text-xs font-medium">{dict.payments.bookingRef}</label>
              <select id="pay-booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="h-10 w-full rounded-xl border px-3 text-sm" data-testid="pay-booking-select">
                {bookingIds.map((id) => (<option key={id} value={id}>{id.slice(0, 8)}…</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-amount" className="text-xs font-medium">{dict.payments.totalAmount} (BDT)</label>
              <Input id="pay-amount" type="number" min={1} value={amountBdt} onChange={(e) => setAmountBdt(e.target.value)} data-testid="pay-amount-input" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pay-provider" className="text-xs font-medium">{dict.payments.selectGateway}</label>
              <select id="pay-provider" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)} className="h-10 w-full rounded-xl border px-3 text-sm" data-testid="pay-provider-select">
                <option value="bkash">{dict.payments.bkashTitle}</option>
                <option value="nagad">{dict.payments.nagadTitle}</option>
                <option value="sslcommerz">{dict.payments.sslTitle}</option>
              </select>
            </div>
            <Button type="submit" isLoading={creating} data-testid="create-order-btn">{dict.payments.payNow}</Button>
          </form>
          {formError && <p role="alert" className="mt-2 text-xs text-rose-600">{formError}</p>}
        </CardContent>
      </Card>

      {requests.isLoading ? (
        <LoadingSpinner />
      ) : (
        <PaymentCheckoutView
          locale={locale}
          initialOrder={order ?? undefined}
          onPay={async (gateway) => {
            if (!order) throw new Error('No order');
            setOrder({ ...order, provider: gateway });
            // Sandbox: the provider confirms via signed server webhook. The
            // receipt endpoint only succeeds once that webhook has been
            // processed — we never fabricate a receipt locally.
            const receiptRes = await fetchReceipt(order.id).unwrap().catch((err: unknown) => {
              throw new Error(normalizeApiError(err as never, locale).message);
            });
            const receipt = receiptRes.data;
            if (receipt.status !== 'succeeded') {
              throw new Error(
                locale === 'bn'
                  ? 'পেমেন্ট এখনও নিশ্চিত হয়নি। ওয়েবহুক নিশ্চিতকরণের পর রসিদ পাওয়া যাবে।'
                  : 'Payment not yet confirmed. The receipt appears after webhook confirmation.',
              );
            }
            return receipt;
          }}
        />
      )}

      {canRefund && order && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            isLoading={refunding}
            onClick={async () => {
              try {
                await processRefund({
                  paymentOrderId: order.id,
                  amountMinor: order.amountMinor,
                  reason: 'customer_request_refund',
                }).unwrap();
              } catch (err) {
                setFormError(normalizeApiError(err as never, locale).message);
              }
            }}
            data-testid="refund-btn"
          >
            {locale === 'bn' ? 'রিফান্ড অনুরোধ' : 'Request refund'}
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}

export default function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <div className="py-6">
        <PaymentsContent locale={locale} />
      </div>
    </RequireAuth>
  );
}
