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
    <Card className="border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-2xl text-slate-900">
      <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
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
              className="flex items-center gap-1.5 text-xs font-bold rounded-xl border-slate-300 text-slate-800 hover:bg-slate-100 h-9"
              data-testid="print-receipt-btn"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>{p.printReceipt}</span>
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-bold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 h-9 px-3"
              >
                {isBn ? 'বন্ধ' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4 text-xs sm:text-sm">
        {/* Receipt ID & Copy */}
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 font-semibold">{p.receiptNumber}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-slate-900">{receipt.receiptId}</span>
            <button
              type="button"
              onClick={handleCopyRef}
              title={isBn ? 'কপি করুন' : 'Copy'}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Tutor & Course */}
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 font-semibold">
            {isBn ? 'শিক্ষক ও কোর্স' : 'Tutor & Course'}
          </span>
          <span className="font-bold text-slate-900 text-right truncate max-w-[220px]">
            {receipt.tutorName} • {receipt.subjectName}
          </span>
        </div>

        {/* Payment Gateway */}
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 font-semibold">{p.paymentMethod}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-900 border border-blue-200 uppercase">
            {receipt.paymentMethod || 'SSLCOMMERZ'}
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 font-semibold">{p.paidAt}</span>
          <span className="font-medium text-slate-900">
            {formatDateTime(receipt.paidAt, locale)}
          </span>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between py-3 items-baseline bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <span className="font-black text-slate-900">{p.totalAmount}</span>
          <span className="text-2xl font-black text-emerald-800 tabular-nums">
            ৳ {formatLocalizedNumber(receipt.amountBdt, locale)}{' '}
            <span className="text-xs font-bold text-slate-600">{receipt.currency}</span>
          </span>
        </div>

        {/* Actions Strip: Download HTML Invoice */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            onClick={handleDownloadInvoice}
            isLoading={isDownloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            data-testid="download-official-invoice-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBn ? 'অফিশিয়াল ইনভয়েস দেখুন / ডাউনলোড' : 'Official Invoice (HTML/PDF)'}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Button>

          <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{isBn ? 'এসক্রো অ্যাকাউন্টে সংরক্ষিত' : 'Funds Secured in Escrow'}</span>
          </span>
        </div>

        {/* Safety & Compliance Assurance */}
        <div className="pt-2 text-[11px] text-slate-700 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-center leading-relaxed font-medium">
          {isBn
            ? '✓ এই পেমেন্টটি বাংলাদেশ ব্যাংক ও এসক্রো নীতিমালার অধীনে সুরক্ষিত এবং যাচাইকৃত। ক্লাস সন্তোষজনক না হলে ১০০% রিফান্ড গ্যারান্টি প্রযোজ্য।'
            : '✓ Verified double-entry escrow transaction protected under platform consumer safety policies. 100% refund guarantee applies.'}
        </div>
      </CardContent>
    </Card>
  );
}
