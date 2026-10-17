'use client';

import { CheckCircle2, Printer, X } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { PaymentReceiptData } from '../types/payment-checkout.types';

interface PaymentReceiptProps {
  receipt: PaymentReceiptData;
  locale: Locale;
  onPrint?: () => void;
  onClose?: () => void;
}

/** Success receipt card shown after verified payment with print and download capability. */
export function PaymentReceipt({ receipt, locale, onPrint, onClose }: PaymentReceiptProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Card className="border border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-3.5 border-b border-border/70 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{p.receiptTitle}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-xl"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{p.printReceipt}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3 text-xs sm:text-sm">
        <div className="flex justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground font-medium">{p.receiptNumber}</span>
          <span className="font-mono font-bold text-foreground">{receipt.receiptId}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground font-medium">
            {locale === 'bn' ? 'শিক্ষক ও কোর্স' : 'Tutor & Course'}
          </span>
          <span className="font-bold text-foreground text-right truncate max-w-[200px]">
            {receipt.tutorName} • {receipt.subjectName}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground font-medium">{p.paymentMethod}</span>
          <span className="font-bold text-foreground uppercase">{receipt.paymentMethod}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground font-medium">{p.paidAt}</span>
          <span className="font-medium text-foreground">
            {formatDateTime(receipt.paidAt, locale)}
          </span>
        </div>
        <div className="flex justify-between py-2.5 items-baseline">
          <span className="font-bold text-foreground">{p.totalAmount}</span>
          <span className="text-xl font-black text-primary">
            ৳ {formatLocalizedNumber(receipt.amountBdt, locale)} {receipt.currency}
          </span>
        </div>
        <div className="pt-2 text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/50 text-center">
          {locale === 'bn'
            ? '✓ এই পেমেন্টটি বাংলাদেশ ব্যাংক ও এসক্রো নীতিমালার অধীনে সুরক্ষিত এবং যাচাইকৃত।'
            : '✓ Verified double-entry escrow transaction protected under platform consumer safety policies.'}
        </div>
      </CardContent>
    </Card>
  );
}
