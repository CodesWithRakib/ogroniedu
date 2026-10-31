'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Tag,
  CreditCard,
  Phone,
  FileText,
  LayoutDashboard,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { formatBDTMinor } from '@/lib/format';
import { withLocale } from '@/lib/auth';

export type PaymentMethodId = 'any' | 'bkash' | 'nagad' | 'rocket' | 'card';

export interface SaasCheckoutFlowProps {
  bookingId: string;
  orderId?: string;
  amountMinor: number;
  currency?: string;
  locale?: Locale;
  bookingDetails?: {
    tutorName?: string;
    subjectName?: string;
    educationLevel?: string;
    sessionCount?: number;
    studentPhone?: string;
  };
  isProcessing?: boolean;
  errorText?: string | null;
  onInitiatePayment: (payload: {
    method: PaymentMethodId;
    payerPhone?: string;
    discountMinor: number;
    finalAmountMinor: number;
  }) => Promise<{ checkoutUrl?: string; gatewayPageUrl?: string; sessionKey?: string } | void>;
  onSuccessReturn?: () => void;
  verifiedSuccess?: boolean;
  transactionId?: string;
}

// Brand SVG Logos
function SslcommerzLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 font-black text-xs ${className}`}>
      <span className="w-5 h-5 rounded-md bg-[#0052CC] text-white flex items-center justify-center font-black text-[10px]">
        S
      </span>
      <span className="font-extrabold text-[#002D62] tracking-tight">SSLCOMMERZ</span>
    </div>
  );
}

function BkashLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#E2136E" />
      <path
        d="M26 66L42 22L74 38L52 50L66 74L42 58L34 78L26 66Z"
        fill="white"
      />
    </svg>
  );
}

function NagadLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#F7941D" />
      <path
        d="M50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80C66.5685 80 80 66.5685 80 50C80 33.4315 66.5685 20 50 20ZM50 30C61.0457 30 70 38.9543 70 50C70 61.0457 61.0457 70 50 70C38.9543 70 30 61.0457 30 50C30 38.9543 38.9543 30 50 30Z"
        fill="white"
      />
      <circle cx="50" cy="50" r="12" fill="#ED1C24" />
    </svg>
  );
}

function RocketLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#8C3494" />
      <path
        d="M50 22L64 48H36L50 22ZM36 54H64L68 68H32L36 54ZM38 72H62L58 78H42L38 72Z"
        fill="white"
      />
    </svg>
  );
}

function UpayLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#0066B3" />
      <circle cx="50" cy="50" r="26" fill="#FEE100" />
      <path d="M40 40H60V60H40V40Z" fill="#0066B3" />
    </svg>
  );
}

function VisaBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[10px] tracking-wider">
      VISA
    </span>
  );
}

function MastercardBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block -mr-1 opacity-90" />
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-90" />
      <span className="ml-0.5 text-[9px] font-black">MC</span>
    </span>
  );
}

function AmexBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-800 font-black text-[10px]">
      AMEX
    </span>
  );
}

export function SaasCheckoutFlow({
  bookingId,
  orderId,
  amountMinor,
  currency = 'BDT',
  locale = 'bn',
  bookingDetails,
  isProcessing = false,
  errorText = null,
  onInitiatePayment,
  onSuccessReturn,
  verifiedSuccess = false,
  transactionId,
}: SaasCheckoutFlowProps) {
  const isBn = locale === 'bn';

  // Step state: 1: 'checkout', 2: 'payment', 3: 'confirmation'
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(verifiedSuccess ? 3 : 1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('bkash');
  const [payerPhone, setPayerPhone] = useState(bookingDetails?.studentPhone || '01700000000');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Card simulated inputs for Step 2 Card screen
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // 10-minute countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState(585); // 09:45
  useEffect(() => {
    if (currentStep === 3) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsRemaining]);

  // Sync verifiedSuccess from parent
  useEffect(() => {
    if (verifiedSuccess) {
      setCurrentStep(3);
    }
  }, [verifiedSuccess]);

  // Financial calculations
  const subtotalBdt = amountMinor / 100;
  const discountBdt = useMemo(() => {
    if (appliedPromo === 'SAVE10' || appliedPromo === 'OGRONI10') {
      return Math.round(subtotalBdt * 0.1);
    }
    if (appliedPromo === 'WELCOME') {
      return Math.min(200, subtotalBdt);
    }
    return 0;
  }, [appliedPromo, subtotalBdt]);

  const totalBdt = Math.max(0, subtotalBdt - discountBdt);
  const totalMinor = Math.round(totalBdt * 100);

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCode.trim().toUpperCase();
    if (code === 'SAVE10' || code === 'OGRONI10' || code === 'WELCOME') {
      setAppliedPromo(code);
    } else {
      setPromoError(isBn ? 'মেয়াদোত্তীর্ণ বা ভুল প্রোমো কোড' : 'Invalid or expired promo code');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
  };

  // Trigger Payment Submission from Step 2
  const handleProceedToPayment = async () => {
    const result = await onInitiatePayment({
      method: selectedMethod,
      payerPhone: payerPhone.trim() || undefined,
      discountMinor: Math.round(discountBdt * 100),
      finalAmountMinor: totalMinor,
    });

    if (result && (result.gatewayPageUrl || result.checkoutUrl)) {
      const url = result.gatewayPageUrl || result.checkoutUrl;
      if (url) {
        window.location.href = url;
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-8 px-4 text-foreground flex flex-col gap-6" data-testid="saas-checkout-flow">
      {/* Top Stepper Indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-6 py-2">
        {/* Step 1 */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 1
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
          </div>
          <span
            className={`text-xs sm:text-sm font-bold ${
              currentStep === 1 ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {isBn ? 'চেকআউট' : 'Checkout'}
          </span>
        </div>

        <div className={`w-8 sm:w-16 h-0.5 ${currentStep > 1 ? 'bg-emerald-600' : 'bg-border'}`} />

        {/* Step 2 */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 2
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
          </div>
          <span
            className={`text-xs sm:text-sm font-bold ${
              currentStep === 2 ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {isBn ? 'পেমেন্ট' : 'Payment'}
          </span>
        </div>

        <div className={`w-8 sm:w-16 h-0.5 ${currentStep > 2 ? 'bg-emerald-600' : 'bg-border'}`} />

        {/* Step 3 */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 3
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep === 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
          </div>
          <span
            className={`text-xs sm:text-sm font-bold ${
              currentStep === 3 ? 'text-emerald-600' : 'text-muted-foreground'
            }`}
          >
            {isBn ? 'নিশ্চিতকরণ' : 'Confirmation'}
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorText && (
        <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* =========================================================================
          STEP 1: CHECKOUT OVERVIEW & METHOD SELECTION (Image 1 Screen 1 & Image 2)
         ========================================================================= */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Card: Order Summary */}
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-5">
              {/* Product Info */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center text-base shrink-0 shadow-xs">
                  OE
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {bookingDetails?.educationLevel || (isBn ? 'টিউশন কোর্স' : 'Tuition Class')}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-foreground truncate">
                    {bookingDetails?.subjectName || (isBn ? 'উচ্চতর গণিত ও বিজ্ঞান' : 'Tuition Session')}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                    {isBn ? 'শিক্ষক: ' : 'Tutor: '}
                    {bookingDetails?.tutorName || (isBn ? 'অগ্রণী এডু ভেরিফাইড শিক্ষক' : 'Verified Tutor')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm sm:text-base font-black text-foreground tabular-nums">
                    ৳{subtotalBdt.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Financial Ledger Breakdown */}
              <div className="flex flex-col gap-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{isBn ? 'সাবটোটাল' : 'Subtotal'}</span>
                  <span className="text-foreground font-bold tabular-nums">৳{subtotalBdt.toLocaleString()}</span>
                </div>

                {appliedPromo && (
                  <div className="flex items-center justify-between text-emerald-600 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ডিসকাউন্ট' : 'Discount'} ({appliedPromo})</span>
                    </span>
                    <span className="tabular-nums">- ৳{discountBdt.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{isBn ? 'ভ্যাট / ট্যাক্স (০%)' : 'Tax (0%)'}</span>
                  <span className="text-foreground font-bold tabular-nums">৳০.০০</span>
                </div>

                {/* Promo Code Input */}
                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  {!appliedPromo ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder={isBn ? 'প্রোমো কোড (যেমন: SAVE10)' : 'Promo Code (e.g. SAVE10)'}
                        className="flex-1 h-9 px-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim()}
                        className="h-9 px-3 text-xs font-bold rounded-xl"
                      >
                        {isBn ? 'প্রয়োগ' : 'Apply'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {appliedPromo} {isBn ? 'প্রয়োগ হয়েছে' : 'Applied'} (-৳{discountBdt})
                      </span>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-muted-foreground hover:text-destructive text-[11px] font-bold"
                      >
                        {isBn ? 'বাতিল' : 'Remove'}
                      </button>
                    </div>
                  )}
                  {promoError && (
                    <span className="text-[11px] text-destructive font-semibold">{promoError}</span>
                  )}
                </div>

                {/* Total */}
                <div className="pt-3 border-t-2 border-border flex items-center justify-between">
                  <span className="text-sm sm:text-base font-black text-foreground">
                    {isBn ? 'সর্বমোট প্রদেয়' : 'Total Amount'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                    ৳{totalBdt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Reassurance Footer */}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {isBn
                    ? 'আপনার পেমেন্ট SSLCommerz ও শতভাগ এসক্রো দ্বারা সুরক্ষিত।'
                    : 'Your payment information is secure and encrypted with SSLCommerz.'}
                </span>
              </div>
              <Link
                href={withLocale('/dashboard/student/payments', locale)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
              </Link>
            </div>
          </div>

          {/* Right Card: Choose Payment Method (Image 1 Screen 1 & Image 2) */}
          <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  {isBn ? 'পেমেন্ট মাধ্যম বেছে নিন' : 'Choose Payment Method'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBn ? 'নিরাপদ লেনদেনের জন্য যেকোনো মাধ্যম নির্বাচন করুন' : 'Select your preferred payment method'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border px-2.5 py-1 rounded-xl text-xs font-bold text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="tabular-nums">{formattedTimer}</span>
              </div>
            </div>

            {/* Payment Method Option Cards */}
            <div className="flex flex-col gap-3">
              {/* Option 1: Any Card / Mobile Banking (Recommended) */}
              <div
                onClick={() => setSelectedMethod('any')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedMethod === 'any'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'any' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedMethod === 'any' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {isBn ? 'যেকোনো কার্ড / মোবাইল ব্যাংকিং' : 'Any Card / Mobile Banking'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase">
                        {isBn ? 'সুপারিশকৃত' : 'Recommended'}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      Visa, MasterCard, AMEX, bKash, Nagad
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <VisaBadge />
                  <MastercardBadge />
                  <AmexBadge />
                </div>
              </div>

              {/* Option 2: bKash (Popular) */}
              <div
                onClick={() => setSelectedMethod('bkash')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedMethod === 'bkash'
                    ? 'border-[#E2136E] bg-[#E2136E]/5 shadow-xs'
                    : 'border-border hover:border-[#E2136E]/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'bkash' ? 'border-[#E2136E]' : 'border-muted-foreground'
                  }`}>
                    {selectedMethod === 'bkash' && <div className="w-2.5 h-2.5 rounded-full bg-[#E2136E]" />}
                  </div>
                  <BkashLogo className="w-9 h-9 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-foreground">bKash</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#E2136E]/15 text-[#E2136E] text-[10px] font-black uppercase">
                        {isBn ? 'জনপ্রিয়' : 'Popular'}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {isBn ? 'বিকাশ ওয়ালেট দিয়ে দ্রুত পেমেন্ট' : 'Pay instantly with your bKash wallet'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#E2136E]">bKash</span>
              </div>

              {/* Option 3: Nagad */}
              <div
                onClick={() => setSelectedMethod('nagad')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedMethod === 'nagad'
                    ? 'border-[#F7941D] bg-[#F7941D]/5 shadow-xs'
                    : 'border-border hover:border-[#F7941D]/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'nagad' ? 'border-[#F7941D]' : 'border-muted-foreground'
                  }`}>
                    {selectedMethod === 'nagad' && <div className="w-2.5 h-2.5 rounded-full bg-[#F7941D]" />}
                  </div>
                  <NagadLogo className="w-9 h-9 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">Nagad</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {isBn ? 'নগদ ওয়ালেট দিয়ে পেমেন্ট' : 'Pay with Nagad account'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#F7941D]">নগদ</span>
              </div>

              {/* Option 4: Rocket */}
              <div
                onClick={() => setSelectedMethod('rocket')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedMethod === 'rocket'
                    ? 'border-[#8C3494] bg-[#8C3494]/5 shadow-xs'
                    : 'border-border hover:border-[#8C3494]/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'rocket' ? 'border-[#8C3494]' : 'border-muted-foreground'
                  }`}>
                    {selectedMethod === 'rocket' && <div className="w-2.5 h-2.5 rounded-full bg-[#8C3494]" />}
                  </div>
                  <RocketLogo className="w-9 h-9 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">Rocket</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {isBn ? 'ডাচ-বাংলা রকেট ওয়ালেট' : 'Pay with DBBL Rocket'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#8C3494]">রকেট</span>
              </div>

              {/* Option 5: Card Payment */}
              <div
                onClick={() => setSelectedMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedMethod === 'card'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'card' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedMethod === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      {isBn ? 'ডেবিট ও ক্রেডিট কার্ড' : 'Card Payment'}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Visa, Mastercard, AMEX
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <VisaBadge />
                  <MastercardBadge />
                </div>
              </div>
            </div>

            {/* Action Button: Continue to Payment */}
            <div className="pt-2 flex flex-col gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => setCurrentStep(2)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <span>{isBn ? 'পেমেন্টে এগিয়ে যান' : 'Continue to Payment'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Powered by</span>
                <SslcommerzLogo />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: PAYMENT ACTION SCREEN (Image 1 Screen 2: bKash & Screen 3: Card)
         ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm flex flex-col gap-8">
          {/* Back to Step 1 */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isBn ? 'পেমেন্ট মাধ্যম পরিবর্তনে ফিরে যান' : 'Back to payment methods'}</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>{isBn ? 'প্রদেয় এমাউন্ট:' : 'Payable Amount:'}</span>
              <span className="text-sm font-black text-foreground tabular-nums">৳{totalBdt.toLocaleString()}</span>
            </div>
          </div>

          {/* Sub-view A: bKash Dedicated Payment Flow (Image 1 Screen 2) */}
          {selectedMethod === 'bkash' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left bKash Phone Graphic */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/40 rounded-2xl relative overflow-hidden">
                <div className="w-44 h-72 bg-card border-4 border-slate-800 rounded-3xl shadow-xl flex flex-col items-center justify-between p-4 relative z-10">
                  <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto" />
                  <div className="flex flex-col items-center gap-3">
                    <BkashLogo className="w-14 h-14" />
                    <span className="font-black text-[#E2136E] text-sm tracking-wide">bKash Payment</span>
                    <span className="text-[11px] text-muted-foreground text-center">
                      {isBn ? 'অগ্রণী এডু নিরাপদ ফি' : 'OgroniEdu Tuition Escrow'}
                    </span>
                  </div>
                  <div className="w-full bg-[#E2136E]/10 rounded-lg py-1.5 text-center text-[#E2136E] font-bold text-xs">
                    ৳{totalBdt.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Right bKash Input & Trigger */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">
                    {isBn ? 'বিকাশ দিয়ে পেমেন্ট করুন' : 'Pay with bKash'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {isBn
                      ? 'নিরাপদ পেমেন্ট সম্পন্ন করতে আপনার বিকাশ একাউন্ট নাম্বারটি লিখুন।'
                      : 'Enter your bKash account number to proceed with the payment securely.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">
                    {isBn ? 'বিকাশ মোবাইল নম্বর' : 'bKash Account Number'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-muted/20 text-sm font-bold font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-[#E2136E]"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={isProcessing}
                  onClick={handleProceedToPayment}
                  className="w-full h-12 bg-[#E2136E] hover:bg-[#E2136E]/90 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-99"
                >
                  {isProcessing ? (
                    <span>{isBn ? 'গেটওয়ে লোড হচ্ছে...' : 'Connecting to bKash...'}</span>
                  ) : (
                    <>
                      <span>{isBn ? `৳${totalBdt.toLocaleString()} পরিশোধ করুন` : 'Proceed to Pay →'}</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isBn
                      ? 'আপনাকে সুরক্ষিত SSLCommerz / বিকাশ পোর্টালে নিয়ে যাওয়া হবে ওটিপি/পিন দ্বারা পেমেন্ট সম্পন্ন করতে।'
                      : 'You will be redirected to bKash to complete your payment securely.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view B: Card Payment Flow (Image 1 Screen 3) */}
          {selectedMethod === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left 3D Card Graphic */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl shadow-xl text-white relative overflow-hidden">
                <div className="w-full max-w-[280px] h-44 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between shadow-2xl relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider opacity-80">OGRONI PAY</span>
                    <VisaBadge />
                  </div>
                  <div className="font-mono text-base tracking-widest text-center my-2">
                    {cardNumber ? cardNumber : '•••• •••• •••• 4242'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                    <div>
                      <span>EXPIRES</span>
                      <p className="font-bold">{cardExpiry ? cardExpiry : '12/28'}</p>
                    </div>
                    <div>
                      <span>CVV</span>
                      <p className="font-bold">{cardCvv ? cardCvv : '•••'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card Fields & Trigger */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">
                    {isBn ? 'কার্ডের তথ্য দিন' : 'Enter Card Details'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {isBn
                      ? 'ভিসা, মাস্টারকার্ড বা অ্যামেক্স কার্ড দিয়ে নিরাপদে পরিশোধ করুন।'
                      : 'Pay securely with your Visa, Mastercard or AMEX card.'}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      {isBn ? 'কার্ড নম্বর' : 'Card Number'}
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        {isBn ? 'মেয়াদ (MM/YY)' : 'Expiry Date'}
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={isProcessing}
                  onClick={handleProceedToPayment}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-99"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isBn ? `৳${totalBdt.toLocaleString()} পরিশোধ করুন` : `Pay ৳${totalBdt.toLocaleString()} →`}</span>
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>Secured by</span>
                  <SslcommerzLogo />
                </div>
              </div>
            </div>
          )}

          {/* Sub-view C: General Gateway / Other MFS (Nagad, Rocket, Any) */}
          {(selectedMethod === 'any' || selectedMethod === 'nagad' || selectedMethod === 'rocket') && (
            <div className="flex flex-col items-center justify-center text-center py-6 px-4 gap-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                {isBn ? 'সুরক্ষিত গেটওয়েতে যান' : 'Proceed to Secure Payment Gateway'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isBn
                  ? 'আপনি SSLCommerz অফিসিয়াল পেমেন্ট পোর্টালে সরাসরি রিডাইরেক্ট হবেন এবং পছন্দমতো চ্যানেল দিয়ে নিরাপদে পেমেন্ট সম্পন্ন করতে পারবেন।'
                  : 'You will be connected to the official SSLCommerz portal to authenticate your payment securely.'}
              </p>

              <Button
                type="button"
                size="lg"
                disabled={isProcessing}
                onClick={handleProceedToPayment}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <span>{isBn ? `৳${totalBdt.toLocaleString()} পরিশোধ করুন` : `Pay ৳${totalBdt.toLocaleString()} >`}</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 3: CONFIRMATION SCREEN (Image 1 Screen 4: Payment Successful!)
         ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-14 shadow-sm flex flex-col items-center justify-center text-center gap-6 max-w-2xl mx-auto relative overflow-hidden" data-testid="payment-success-card">
          {/* Confetti Animation Background Accents */}
          <div className="absolute top-4 left-6 text-emerald-400 opacity-60">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="absolute top-6 right-8 text-amber-400 opacity-60">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="absolute bottom-8 left-10 text-primary opacity-60">
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Big Green Check Circle */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-4 border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Successful!'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {isBn
                ? 'আপনার টিউশন বুকিংটি নিশ্চিত করা হয়েছে এবং ফি শতভাগ সুরক্ষিত এসক্রোতে জমা হয়েছে।'
                : 'Your tuition booking has been confirmed successfully and funds are securely held in escrow.'}
            </p>
          </div>

          {/* Transaction ID Pill */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-4 py-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Transaction ID: {transactionId || orderId || 'SSLC-' + Math.random().toString(36).substring(2, 11).toUpperCase()}
            </span>
          </div>

          {/* Action Buttons: Go to Dashboard & View Receipt */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 w-full max-w-sm">
            <Link
              href={withLocale('/dashboard/student', locale)}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard →'}</span>
            </Link>

            {orderId && (
              <Link
                href={withLocale(`/dashboard/student/payments?receiptOrder=${orderId}`, locale)}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs sm:text-sm transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>{isBn ? 'রসিদ দেখুন' : 'View Receipt'}</span>
              </Link>
            )}
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border/60 w-full max-w-xs">
            <span>Powered by</span>
            <SslcommerzLogo />
          </div>
        </div>
      )}
    </div>
  );
}

