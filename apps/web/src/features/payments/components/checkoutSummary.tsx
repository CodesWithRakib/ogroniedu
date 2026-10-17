'use client';

import { FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
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
  const amountBdt = orderAmountBdt(order);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {p.orderSummaryTitle}
          </CardTitle>
          <Badge
            variant={
              order.status === 'succeeded'
                ? 'success'
                : order.status === 'pending'
                  ? 'warning'
                  : 'destructive'
            }
          >
            {order.status === 'succeeded'
              ? p.statusSucceeded
              : order.status === 'pending'
                ? p.statusPending
                : p.statusFailed}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">{p.bookingRef}</span>
            <span className="font-mono font-medium">{order.bookingId}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">{p.subject}</span>
            <span className="font-medium text-foreground ">{order.subjectName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">{p.tutor}</span>
            <span className="font-medium">{order.tutorName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">{p.student}</span>
            <span className="font-medium">
              {order.studentName} ({order.payerName})
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex items-baseline justify-between">
          <span className="text-base font-semibold text-foreground ">{p.totalAmount}</span>
          <span className="text-2xl font-black text-primary ">
            ৳ {formatLocalizedNumber(amountBdt, locale)} {order.currency}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
