'use client';

import React from 'react';
import { CreditCard, Lock, ShieldCheck, Check } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import {
  orderAmountBdt,
  type PaymentOrderDetails,
  type PaymentProvider,
} from '../types/payment-checkout.types';

export interface CheckoutMethodPickerProps {
  order: PaymentOrderDetails;
  locale: Locale;
  selectedGateway: PaymentProvider;
  onSelectGateway: (gateway: PaymentProvider) => void;
  onPay: () => void;
  isProcessing: boolean;
  payError: string | null;
  payDisabledReason?: string | null;
}

/** Gateway selection (SSLCommerz / bKash / Nagad) plus pay action. */
export function CheckoutMethodPicker({
  order,
  locale,
  selectedGateway,
  onSelectGateway,
  onPay,
  isProcessing,
  payError,
  payDisabledReason,
}: CheckoutMethodPickerProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const isBn = locale === 'bn';
  const amountBdt = orderAmountBdt(order);

  return (
    <Card className="border border-border bg-card rounded-xl text-card-foreground">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-primary" />
            <span>{p.selectGateway}</span>
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? 'এনক্রিপ্টেড ও সুরক্ষিত' : 'Encrypted & Secure'}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 flex flex-col gap-3">
        {/* SSLCOMMERZ (Recommended) */}
        <div
          onClick={() => onSelectGateway('sslcommerz')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-colors flex items-center justify-between ${
            selectedGateway === 'sslcommerz'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-muted/40'
          }`}
          data-testid="gateway-picker-sslcommerz"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
              SSL
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-sm">{p.sslTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
                  {isBn ? 'জনপ্রিয় ও সুপারিশকৃত' : 'Recommended'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                {isBn
                  ? 'বিকাশ, নগদ, রকেট, কার্ড ও ইন্টারনেট ব্যাংকিং'
                  : 'bKash, Nagad, Rocket, Cards & Internet Banking'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'sslcommerz'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card'
              }`}
            >
              {selectedGateway === 'sslcommerz' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* bKash */}
        <div
          onClick={() => onSelectGateway('bkash')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-colors flex items-center justify-between ${
            selectedGateway === 'bkash'
              ? 'border-rose-500 bg-rose-500/10'
              : 'border-border bg-card hover:bg-muted/40'
          }`}
          data-testid="gateway-picker-bkash"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-600 text-white font-bold flex items-center justify-center text-xs">
              bKash
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{p.bkashTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-100 text-pink-900 border border-pink-200">
                  MFS
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                {isBn ? 'সরাসরি বিকাশ পেমেন্ট' : 'Direct bKash payment checkout'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'bkash'
                  ? 'border-pink-600 bg-pink-600 text-white'
                  : 'border-border bg-card'
              }`}
            >
              {selectedGateway === 'bkash' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Nagad */}
        <div
          onClick={() => onSelectGateway('nagad')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-colors flex items-center justify-between ${
            selectedGateway === 'nagad'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-border bg-card hover:bg-muted/40'
          }`}
          data-testid="gateway-picker-nagad"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
              Nagad
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{p.nagadTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-200">
                  MFS
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                {isBn
                  ? 'ডাক বিভাগের ডিজিটাল নগদ সেবা'
                  : 'Bangladesh Post Office Digital Financial Service Nagad'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'nagad'
                  ? 'border-amber-600 bg-amber-600 text-white'
                  : 'border-border bg-card'
              }`}
            >
              {selectedGateway === 'nagad' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Errors & Alerts */}
        {payError && (
          <Alert
            variant="destructive"
            className="rounded-xl border-destructive/30 bg-destructive/10 text-destructive"
          >
            <AlertDescription role="alert" className="font-medium text-xs">
              {payError}
            </AlertDescription>
          </Alert>
        )}

        {payDisabledReason && (
          <Alert className="rounded-xl border-warning/30 bg-warning/10 text-warning">
            <AlertDescription className="text-xs font-medium">
              {payDisabledReason}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-muted/20">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>
            {isBn
              ? 'এসক্রো সুরক্ষা গ্যারান্টি: ক্লাস না হলে ১০০% রিফান্ড'
              : 'Escrow Guarantee: 100% refund if session is not conducted'}
          </span>
        </div>

        <Button
          type="button"
          onClick={onPay}
          disabled={isProcessing || !!payDisabledReason}
          isLoading={isProcessing}
          data-testid="pay-submit-btn"
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm h-11 px-8 rounded-xl transition-colors"
        >
          {isProcessing
            ? isBn
              ? 'প্রক্রিয়াধীন...'
              : 'Processing...'
            : isBn
              ? `৳ ${formatLocalizedNumber(amountBdt, locale)} পরিশোধ করুন`
              : `Pay ৳ ${formatLocalizedNumber(amountBdt, locale)} Now`}
        </Button>
      </CardFooter>
    </Card>
  );
}
