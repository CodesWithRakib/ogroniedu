'use client';

import React from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { orderAmountBdt, type PaymentOrderDetails } from '../types/payment-checkout.types';

interface CheckoutSummaryProps {
  order: PaymentOrderDetails;
  locale: Locale;
}

/** Order summary card: booking refs, parties, status badge, total. */
export function CheckoutSummary({ order, locale }: CheckoutSummaryProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const isBn = locale === 'bn';
  const amountBdt = orderAmountBdt(order);

  const isSuccess = order.status === 'succeeded';
  const isPending = order.status === 'pending';

  return (
    <Card className="border border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>{p.orderSummaryTitle}</span>
          </CardTitle>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
              isSuccess
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : isPending
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-rose-100 text-rose-900 border-rose-300'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            ) : isPending ? (
              <Clock className="w-3.5 h-3.5 text-amber-700" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
            )}
            <span>
              {isSuccess ? p.statusSucceeded : isPending ? p.statusPending : p.statusFailed}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
              {p.bookingRef}
            </span>
            <span className="font-mono font-black text-slate-900 mt-0.5 block truncate">
              #{order.bookingId}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
              {p.subject}
            </span>
            <span className="font-extrabold text-slate-900 mt-0.5 block truncate">
              {order.subjectName || (isBn ? 'টিউশন কোর্স' : 'Tuition Course')}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
              {p.tutor}
            </span>
            <span className="font-extrabold text-slate-900 mt-0.5 block truncate">
              {order.tutorName || (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor')}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
              {p.student}
            </span>
            <span className="font-extrabold text-slate-900 mt-0.5 block truncate">
              {order.studentName || order.payerName || (isBn ? 'শিক্ষার্থী' : 'Student')}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-baseline justify-between bg-slate-50 p-4 rounded-2xl border">
          <div>
            <span className="text-xs font-bold text-slate-600 block">{p.totalAmount}</span>
            <span className="text-xs text-slate-500 font-medium">
              {isBn ? 'কোনো অতিরিক্ত চার্জ নেই' : 'No hidden gateway fees'}
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-blue-700 tabular-nums">
            ৳ {formatLocalizedNumber(amountBdt, locale)}{' '}
            <span className="text-xs font-bold text-slate-600">{order.currency}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
