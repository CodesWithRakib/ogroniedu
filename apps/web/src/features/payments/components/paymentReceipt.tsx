'use client';

import React, { useState } from 'react';
import { CheckCircle2, Printer, Download, Copy, Check, ExternalLink } from 'lucide-react';
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

/** Success receipt card shown after verified payment with print, download and official invoice view. */
export function PaymentReceipt({ receipt, locale, onPrint, onClose }: PaymentReceiptProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const isBn = locale === 'bn';
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyRef = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(receipt.receiptId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadInvoice = async () => {
    setIsDownloading(true);
    try {
      const invoiceRef = receipt.invoiceNumber || receipt.invoiceId || receipt.receiptId;
      const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(
        `${apiOrigin}/api/v1/payments/invoices/${encodeURIComponent(invoiceRef)}/print?locale=${locale}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error('Invoice could not be loaded');
      const json = await res.json();
      const htmlContent = json?.data || (typeof json === 'string' ? json : '');
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        window.location.assign(blobUrl);
      }
    } catch {
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border border-border bg-card rounded-3xl overflow-hidden shadow-2xl text-card-foreground">
      <CardHeader className="pb-4 border-b border-border bg-surface-muted">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-success-soft border border-success/30 text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>{p.receiptTitle}</span>
          </CardTitle>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold rounded-xl border-border text-foreground hover:bg-surface-muted h-9"
              data-testid="print-receipt-btn"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{p.printReceipt}</span>
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-bold rounded-xl border-border text-foreground hover:bg-surface-muted h-9 px-3"
              >
                {isBn ? 'বন্ধ' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-4 text-xs sm:text-sm">
        {/* Receipt ID & Copy */}
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground font-semibold">{p.receiptNumber}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-foreground">{receipt.receiptId}</span>
            <button
              type="button"
              onClick={handleCopyRef}
              title={isBn ? 'কপি করুন' : 'Copy'}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Tutor & Course */}
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground font-semibold">
            {isBn ? 'শিক্ষক ও কোর্স' : 'Tutor & Course'}
          </span>
          <span className="font-bold text-foreground text-right truncate max-w-[220px]">
            {receipt.tutorName} • {receipt.subjectName}
          </span>
        </div>

        {/* Payment Gateway */}
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground font-semibold">{p.paymentMethod}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-primary-soft text-primary border border-primary/30 uppercase">
            {receipt.paymentMethod || 'SSLCOMMERZ'}
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground font-semibold">{p.paidAt}</span>
          <span className="font-medium text-foreground">
            {formatDateTime(receipt.paidAt, locale)}
          </span>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between py-3 items-baseline bg-surface-muted p-3 rounded-2xl border border-border">
          <span className="font-black text-foreground">{p.totalAmount}</span>
          <span className="text-2xl font-black text-success tabular-nums">
            ৳ {formatLocalizedNumber(receipt.amountBdt, locale)}{' '}
            <span className="text-xs font-bold text-muted-foreground">{receipt.currency}</span>
          </span>
        </div>

        {/* Actions Strip: Download HTML Invoice */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            onClick={handleDownloadInvoice}
            isLoading={isDownloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-colors"
            data-testid="download-official-invoice-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isBn ? 'অফিশিয়াল ইনভয়েস দেখুন / ডাউনলোড' : 'Official Invoice (HTML/PDF)'}
            </span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Button>

          <span className="text-[11px] font-semibold text-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            <span>{isBn ? 'এসক্রো অ্যাকাউন্টে সংরক্ষিত' : 'Funds Secured in Escrow'}</span>
          </span>
        </div>

        {/* Safety & Compliance Assurance */}
        <div className="pt-2 text-[11px] text-foreground bg-success-soft/50 p-3 rounded-2xl border border-success/30 text-center leading-relaxed font-medium">
          {isBn
            ? '✓ এই পেমেন্টটি বাংলাদেশ ব্যাংক ও এসক্রো নীতিমালার অধীনে সুরক্ষিত এবং যাচাইকৃত। ক্লাস সন্তোষজনক না হলে ১০০% রিফান্ড গ্যারান্টি প্রযোজ্য।'
            : '✓ Verified double-entry escrow transaction protected under platform consumer safety policies. 100% refund guarantee applies.'}
        </div>
      </CardContent>
    </Card>
  );
}
