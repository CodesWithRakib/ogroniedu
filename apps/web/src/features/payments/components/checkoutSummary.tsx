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
    <Card className="border border-border bg-card rounded-xl text-card-foreground">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>{p.orderSummaryTitle}</span>
          </CardTitle>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isSuccess
                ? 'bg-success/10 text-success border-success/30'
                : isPending
                  ? 'bg-warning/10 text-warning border-warning/30'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : isPending ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>
              {isSuccess ? p.statusSucceeded : isPending ? p.statusPending : p.statusFailed}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
              {p.bookingRef}
            </span>
            <span className="font-mono font-bold text-foreground mt-0.5 block truncate">
              #{order.bookingId}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
              {p.subject}
            </span>
            <span className="font-semibold text-foreground mt-0.5 block truncate">
              {order.subjectName || (isBn ? 'টিউশন কোর্স' : 'Tuition Course')}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
              {p.tutor}
            </span>
            <span className="font-semibold text-foreground mt-0.5 block truncate">
              {order.tutorName || (isBn ? 'ভেরিফাইড টিউটর' : 'Verified Tutor')}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
              {p.student}
            </span>
            <span className="font-semibold text-foreground mt-0.5 block truncate">
              {order.studentName || order.payerName || (isBn ? 'শিক্ষার্থী' : 'Student')}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex items-baseline justify-between bg-muted/20 p-4 rounded-xl border border-border">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block">{p.totalAmount}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {isBn ? 'কোনো গোপন গেটওয়ে ফি নেই' : 'No hidden gateway fees'}
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
            ৳ {formatLocalizedNumber(amountBdt, locale)}{' '}
            <span className="text-xs font-semibold text-muted-foreground">{order.currency}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
