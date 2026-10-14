'use client';

import { CheckCircle2, Printer } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { PaymentReceiptData } from '../types/payment-checkout.types';

interface PaymentReceiptProps {
  receipt: PaymentReceiptData;
  locale: Locale;
  onPrint: () => void;
}

/** Success receipt card shown only after webhook-confirmed payment. */
export function PaymentReceipt({ receipt, locale, onPrint }: PaymentReceiptProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;

  return (
    <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-md">
      <CardHeader className="pb-3 border-b border-emerald-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {p.receiptTitle}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            {p.printReceipt}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3 text-sm">
        <div className="flex justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground">{p.receiptNumber}</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {receipt.receiptId}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground">{p.paymentMethod}</span>
          <span className="font-semibold">{receipt.paymentMethod}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground">{p.paidAt}</span>
          <span>{formatDateTime(receipt.paidAt, locale)}</span>
        </div>
        <div className="flex justify-between py-2 items-baseline">
          <span className="font-semibold text-slate-900 dark:text-white">{p.totalAmount}</span>
          <span className="text-xl font-black text-emerald-600">
            ৳ {formatLocalizedNumber(receipt.amountBdt, locale)} {receipt.currency}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
