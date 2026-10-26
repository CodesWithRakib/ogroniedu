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
    <Card className="border border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>{p.selectGateway}</span>
          </CardTitle>
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isBn ? 'এনক্রিপ্টেড ও সুরক্ষিত' : 'Encrypted & Secure'}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-3">
        {/* SSLCOMMERZ (Recommended) */}
        <div
          onClick={() => onSelectGateway('sslcommerz')}
          className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'sslcommerz'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          data-testid="gateway-picker-sslcommerz"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs">
              SSL
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm">{p.sslTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                  {isBn ? 'সর্বাধিক জনপ্রিয় ও সুপারিশকৃত' : 'Recommended & Most Popular'}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                {isBn
                  ? 'বিকাশ, নগদ, রকেট, ডেবিট/ক্রেডিট কার্ড ও ইন্টারনেট ব্যাংকিং সমর্থিত'
                  : 'Instant pay via bKash, Nagad, Rocket, Visa, Mastercard & Internet Banking'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'sslcommerz'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedGateway === 'sslcommerz' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* bKash */}
        <div
          onClick={() => onSelectGateway('bkash')}
          className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'bkash'
              ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          data-testid="gateway-picker-bkash"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-pink-600 text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs">
              bKash
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">{p.bkashTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-200">
                  MFS
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                {isBn ? 'সরাসরি বিকাশ গেটওয়ে চেকআউট' : 'Direct bKash payment gateway checkout'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'bkash'
                  ? 'border-pink-600 bg-pink-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedGateway === 'bkash' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Nagad */}
        <div
          onClick={() => onSelectGateway('nagad')}
          className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'nagad'
              ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          data-testid="gateway-picker-nagad"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs">
              Nagad
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">{p.nagadTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  MFS
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                {isBn
                  ? 'ডাক বিভাগের ডিজিটাল লেনদেন সেবা নগদ'
                  : 'Bangladesh Post Office Digital Financial Service Nagad'}
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedGateway === 'nagad'
                  ? 'border-amber-600 bg-amber-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedGateway === 'nagad' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Errors & Alerts */}
        {payError && (
          <Alert
            variant="destructive"
            className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900"
          >
            <AlertDescription role="alert" className="font-semibold text-xs">
              {payError}
            </AlertDescription>
          </Alert>
        )}

        {payDisabledReason && (
          <Alert className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription className="text-xs font-semibold">
              {payDisabledReason}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isBn
              ? 'নিরাপদ এসক্রো ডিপোজিট: টিউশন সন্তোষজনক না হলে শতভাগ ফেরত'
              : 'Escrow Guarantee: 100% refund if session is not conducted'}
          </span>
        </div>

        <Button
          type="button"
          onClick={onPay}
          disabled={isProcessing || !!payDisabledReason}
          isLoading={isProcessing}
          data-testid="pay-submit-btn"
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm h-11 px-8 rounded-2xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          {isProcessing
            ? isBn
              ? 'পেমেন্ট প্রক্রিয়াধীন...'
              : 'Processing...'
            : isBn
              ? `৳ ${formatLocalizedNumber(amountBdt, locale)} পরিশোধ করুন`
              : `Pay ৳ ${formatLocalizedNumber(amountBdt, locale)} Now`}
        </Button>
      </CardFooter>
    </Card>
  );
}
