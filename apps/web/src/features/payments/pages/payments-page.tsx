'use client';

import React from 'react';
import { ShieldCheck, CreditCard, Lock } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PaymentCheckoutView } from '@/components/payments/PaymentCheckoutView';
import { Button, Card, CardContent, Input, LoadingSpinner, EmptyState } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { usePaymentOrder, type PaymentProvider } from '../hooks/use-payment-order';

/**
 * Payments entry: order creation form, sandbox checkout view, and guardian/admin refund action.
 * Features human-friendly tuition selector, escrow security badges, and graceful empty states.
 */
function PaymentsContent({ locale }: { locale: Locale }) {
  const pay = usePaymentOrder(locale);
  const { dict, order, bookingOptions } = pay;

  return (
    <DashboardShell locale={locale} title={dict.payments.title} subtitle={dict.payments.subtitle}>
      {/* Security & Escrow Trust Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-cyan-950/20 to-slate-900/30 border border-emerald-500/20 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">
              {locale === 'bn'
                ? '১০০% নিরাপদ এসক্রো পেমেন্ট সুরক্ষা'
                : '100% Escrow Protected Payments'}
            </h3>
            <p className="text-slate-400 mt-0.5">
              {locale === 'bn'
                ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন না হওয়া পর্যন্ত আপনার অর্থ অগ্রণী এডু এসক্রো অ্যাকাউন্টে সুরক্ষিত থাকে।'
                : 'Your tuition fees remain safely in escrow until sessions are successfully conducted.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>bKash • Nagad • SSLCommerz</span>
        </div>
      </div>

      {pay.requests.isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : bookingOptions.length === 0 ? (
        <EmptyState
          title={
            pay.pendingCount > 0
              ? locale === 'bn'
                ? 'অনুমোদনের অপেক্ষায় রয়েছে'
                : 'Pending Tutor Acceptance'
              : locale === 'bn'
                ? 'পেমেন্ট করার জন্য কোনো সক্রিয় বুকিং নেই'
                : 'No Active Tutoring Bookings'
          }
          description={
            pay.pendingCount > 0
              ? locale === 'bn'
                ? 'আপনার পাঠানো টিউশন অনুরোধটি শিক্ষক অনুমোদন করার সাথে সাথে এখানে পেমেন্ট করার অপশন চলে আসবে।'
                : 'Your tuition request is pending tutor acceptance. Once accepted, payment options will appear here.'
              : locale === 'bn'
                ? 'টিউশন ফি পরিশোধ করার জন্য প্রথমে একজন শিক্ষক বেছে নিন এবং বুকিং অনুরোধ সম্পন্ন করুন।'
                : 'To make tuition payments, please connect with a tutor and complete a booking request first.'
          }
          actionLabel={
            pay.pendingCount > 0
              ? locale === 'bn'
                ? 'অনুরোধ তালিকা দেখুন'
                : 'View Requests'
              : locale === 'bn'
                ? 'টিউটর খুঁজুন'
                : 'Find a Tutor'
          }
          actionHref={
            pay.pendingCount > 0
              ? withLocale('/dashboard/student/requests', locale)
              : withLocale('/tutors', locale)
          }
        />
      ) : (
        <>
          <Card className="mb-6 border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
            <CardContent className="py-5">
              <form
                onSubmit={pay.handleCreateOrder}
                className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end"
                data-testid="create-order-form"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="pay-booking"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {locale === 'bn' ? 'টিউশন / কোর্স নির্বাচন করুন' : 'Select Tuition / Course'}
                  </label>
                  <select
                    id="pay-booking"
                    value={pay.bookingId}
                    onChange={(e) => pay.handleSelectBooking(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    data-testid="pay-booking-select"
                  >
                    {bookingOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="pay-amount"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {dict.payments.totalAmount} (BDT ৳)
                  </label>
                  <Input
                    id="pay-amount"
                    type="number"
                    min={1}
                    value={pay.amountBdt}
                    onChange={(e) => pay.setAmountBdt(e.target.value)}
                    className="h-10 text-xs font-semibold"
                    data-testid="pay-amount-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="pay-provider"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {dict.payments.selectGateway}
                  </label>
                  <select
                    id="pay-provider"
                    value={pay.provider}
                    onChange={(e) => pay.setProvider(e.target.value as PaymentProvider)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    data-testid="pay-provider-select"
                  >
                    <option value="bkash">{dict.payments.bkashTitle}</option>
                    <option value="nagad">{dict.payments.nagadTitle}</option>
                    <option value="sslcommerz">{dict.payments.sslTitle}</option>
                  </select>
                </div>

                <div className="sm:col-span-4 flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={pay.creating}
                    data-testid="create-order-btn"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 text-xs font-semibold h-10"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {locale === 'bn' ? 'পেমেন্ট গেটওয়েতে যান' : 'Proceed to Checkout'}
                  </Button>
                </div>
              </form>
              {pay.formError && (
                <p role="alert" className="mt-3 text-xs text-rose-600">
                  {pay.formError}
                </p>
              )}
            </CardContent>
          </Card>

          <PaymentCheckoutView
            locale={locale}
            initialOrder={order ?? undefined}
            onPay={pay.handlePay}
          />
        </>
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

export function PaymentsPage({ locale }: { locale: Locale }) {
  return (
    <React.Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <PaymentsContent locale={locale} />
    </React.Suspense>
  );
}
