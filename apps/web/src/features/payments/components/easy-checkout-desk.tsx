'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  Copy,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  QrCode,
  Building2,
  Smartphone,
  Grid,
  Info,
  Gift,
  AlertTriangle,
  ArrowLeft,
  X,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { Button, LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import { formatBDTMinor } from '@/lib/format';
import { type Locale, formatLocalizedNumber } from '@/lib/i18n';

export interface EasyCheckoutDeskProps {
  bookingId: string;
  orderId?: string;
  amountMinor: number;
  currency?: string;
  locale: Locale;
  bookingDetails?: {
    tutorName?: string;
    subjectName?: string;
    educationLevel?: string;
    sessionCount?: number;
  };
  isProcessing: boolean;
  errorText: string | null;
  onPayNow: (payload: {
    method: 'card' | 'mobile_banking' | 'net_banking' | 'more';
    selectedChannel: string;
    emiTenure?: string;
    discountMinor: number;
    finalAmountMinor: number;
    cardDetails?: {
      cardNumber: string;
      expiry: string;
      cvv: string;
      holderName: string;
      remember: boolean;
    };
  }) => Promise<void> | void;
  onCancel?: () => void;
  targetIframeUrl?: string;
  iframeLoading?: boolean;
  onIframeLoaded?: () => void;
  showIframeModal?: boolean;
  onCloseIframeModal?: () => void;
}

// -------------------------------------------------------------
// Official Brand SVGs & Icons
// -------------------------------------------------------------
function VisaLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.14 15.34L21.84 0.66H26.16L23.46 15.34H19.14ZM36.5 0.94C35.58 0.6 34.14 0.28 32.4 0.28C27.94 0.28 24.8 2.5 24.78 5.72C24.74 8.08 27.02 9.4 28.74 10.18C30.5 10.98 31.1 11.48 31.1 12.2C31.1 13.3 29.68 13.8 28.34 13.8C26.54 13.8 25.5 13.52 24.08 12.94L23.46 12.68L22.8 16.24C23.86 16.7 25.82 17.08 27.84 17.1C32.58 17.1 35.68 14.92 35.72 11.58C35.74 9.54 34.34 7.98 31.76 6.82C30.2 6.08 29.24 5.56 29.26 4.76C29.26 4.04 30.12 3.28 32.06 3.28C33.64 3.26 34.8 3.58 35.66 3.96L36.08 4.16L36.5 0.94ZM47.28 0.66H43.94C42.92 0.66 42.14 0.94 41.7 1.94L35.62 15.34H40.16L41.06 12.86H46.6L47.12 15.34H51.12L47.28 0.66ZM42.28 9.54L44.66 3.02L46.04 9.54H42.28ZM15.16 0.66L11.08 10.74L10.64 8.66C9.88 6.26 7.64 3.6 5.16 2.38L8.86 15.34H13.44L20.26 0.66H15.16ZM7.1 0.66H0.44L0.34 1.16C5.54 2.42 8.94 5.5 10.36 9.06L8.88 1.98C8.62 0.96 7.96 0.68 7.1 0.66Z"
        fill="#1434CB"
      />
    </svg>
  );
}

function MastercardLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#EB001B" />
      <circle cx="24" cy="12" r="10" fill="#F79E1B" fillOpacity="0.88" />
    </svg>
  );
}

function AmexLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="20" rx="3" fill="#007BC1" />
      <path
        d="M6 14L9 6H12L9.5 12.5L12 14H10L8.5 12.8L7 14H6ZM14 14L16.5 6H18.5L20 11.5L21.5 6H23.5L26 14H24L22.5 8.5L20.8 14H19.2L17.5 8.5L16 14H14Z"
        fill="white"
      />
    </svg>
  );
}

function BkashLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#E2136E" />
      <path
        d="M6 19L14 8L15 15L23 10L17 21L12 17L8 24L6 19Z"
        fill="white"
      />
    </svg>
  );
}

function NagadLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#F7921E" />
      <circle cx="16" cy="16" r="8" fill="#ED1C24" />
      <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="white" />
    </svg>
  );
}

function GPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 font-bold tracking-tight text-white ${className}`}>
      <span className="text-white text-sm font-black">G</span>
      <span className="text-white/90 text-sm font-semibold tracking-wide">Pay</span>
    </div>
  );
}

export function EasyCheckoutDesk({
  bookingId,
  orderId,
  amountMinor,
  locale,
  bookingDetails,
  isProcessing,
  errorText,
  onPayNow,
  onCancel,
  targetIframeUrl,
  iframeLoading,
  onIframeLoaded,
  showIframeModal,
  onCloseIframeModal,
}: EasyCheckoutDeskProps) {
  const isBn = locale === 'bn';

  // 1. Transaction reference with copy status
  const trxId = useMemo(() => {
    if (orderId) return orderId.slice(0, 10).toUpperCase();
    return `9K0609${bookingId.slice(0, 4).toUpperCase()}`;
  }, [orderId, bookingId]);

  const [copiedTrx, setCopiedTrx] = useState(false);
  const handleCopyTrx = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(trxId);
      setCopiedTrx(true);
      setTimeout(() => setCopiedTrx(false), 2000);
    }
  };

  // 2. Countdown session timer (06:29 format matching reference)
  const [timeLeft, setTimeLeft] = useState(389); // 6 mins 29 secs = 389s
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Amount, Breakdown & Expand Toggle
  const baseAmountBdt = amountMinor > 0 ? amountMinor / 100 : 3200;
  const convenienceChargeBdt = 30.0; // ৳30.00 Convenience charge as shown in screenshot
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

  // 4. Promo Code & Offers State
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountMinor: number;
    description: string;
  } | null>(null);

  // 5. Selected Special Offer
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>('visa-10');

  // Calculate discount based on offer or promo
  const discountBdt = useMemo(() => {
    if (appliedPromo) {
      return appliedPromo.discountMinor / 100;
    }
    if (selectedOfferId === 'visa-10') {
      // 10% discount capped at 5000 BDT
      return Math.min(baseAmountBdt * 0.1, 5000);
    }
    if (selectedOfferId === 'mc-5') {
      // 5% discount
      return Math.min(baseAmountBdt * 0.05, 2500);
    }
    return 0;
  }, [appliedPromo, selectedOfferId, baseAmountBdt]);

  const totalAmountBdt = Math.max(0, baseAmountBdt + convenienceChargeBdt - discountBdt);
  const totalAmountMinor = Math.round(totalAmountBdt * 100);

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError(isBn ? 'প্রোমো কোড লিখুন' : 'Please enter a promo code');
      return;
    }

    if (code === 'OGRONI10' || code === 'SAVE10') {
      const disc = Math.round(baseAmountBdt * 0.1 * 100);
      setAppliedPromo({
        code,
        discountMinor: disc,
        description: isBn ? '১০% বিশেষ ছাড় সক্রিয়!' : '10% Exclusive discount applied!',
      });
      setSelectedOfferId(null);
    } else if (code === 'WELCOME') {
      setAppliedPromo({
        code,
        discountMinor: 20000,
        description: isBn ? '৳২০০ ওয়েলকাম বোনাস ছাড়!' : '৳200 Welcome bonus discount!',
      });
      setSelectedOfferId(null);
    } else {
      setPromoError(isBn ? 'অকার্যকর প্রোমো কোড।' : 'Invalid or expired promo code.');
    }
  };

  // 6. Payment Method Tabs: 'card' | 'mobile_banking' | 'net_banking' | 'more'
  const [activeTab, setActiveTab] = useState<'card' | 'mobile_banking' | 'net_banking' | 'more'>('card');
  const [selectedMfs, setSelectedMfs] = useState<'bkash' | 'nagad' | 'rocket' | 'upay'>('bkash');
  const [selectedBank, setSelectedBank] = useState<string>('city');

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(bookingDetails?.tutorName ? 'Learner / Guardian' : '');
  const [rememberCard, setRememberCard] = useState(false);
  const [emiTenure, setEmiTenure] = useState('none');

  // Card Number formatting (16 digits with 4-digit groups)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Expiry formatting (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setCardExpiry(raw);
  };

  // Detected card brand
  const detectedBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return null;
  }, [cardNumber]);

  // Modals state: QR Modal & Bank Details Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  // Trigger Pay Now
  const handlePayClick = useCallback(() => {
    void onPayNow({
      method: activeTab,
      selectedChannel:
        activeTab === 'card'
          ? detectedBrand || 'card'
          : activeTab === 'mobile_banking'
            ? selectedMfs
            : selectedBank,
      emiTenure: emiTenure !== 'none' ? emiTenure : undefined,
      discountMinor: Math.round(discountBdt * 100),
      finalAmountMinor: totalAmountMinor,
      cardDetails:
        activeTab === 'card'
          ? {
              cardNumber: cardNumber.replace(/\s/g, ''),
              expiry: cardExpiry,
              cvv: cardCvv,
              holderName: cardHolder,
              remember: rememberCard,
            }
          : undefined,
    });
  }, [
    activeTab,
    detectedBrand,
    selectedMfs,
    selectedBank,
    emiTenure,
    discountBdt,
    totalAmountMinor,
    cardNumber,
    cardExpiry,
    cardCvv,
    cardHolder,
    rememberCard,
    onPayNow,
  ]);

  return (
    <div
      className="w-full max-w-5xl mx-auto my-4 sm:my-8 bg-card rounded-2xl shadow-xl border border-border overflow-hidden text-foreground flex flex-col"
      data-testid="easy-checkout-desk-container"
    >
      {/* ======================================================== */}
      {/* 1. TOP HEADER: BRAND, TRX ID, TIMER & ACTIONS            */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-8 py-4 border-b border-border bg-card flex items-center justify-between gap-3">
        {/* Left: Back + Brand Logo */}
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={isBn ? 'ফিরে যান' : 'Back'}
              data-testid="easy-checkout-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-xs flex items-center justify-center tracking-tighter">
              easy
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground">
                Easy<span className="text-primary font-normal">.com.bd</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-md">
                OgroniEdu Escrow
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Trx ID with Copy & Timer */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border">
            <span>Trx ID:</span>
            <span className="font-bold text-foreground">{trxId}</span>
            <button
              type="button"
              onClick={handleCopyTrx}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title={isBn ? 'কপি করুন' : 'Copy Trx ID'}
              data-testid="copy-trx-btn"
            >
              {copiedTrx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className={`tabular-nums ${timeLeft < 120 ? 'text-rose-600 font-extrabold animate-pulse' : ''}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Error alert banner if any */}
      {errorText && (
        <div className="mx-5 sm:mx-8 mt-4">
          <Alert variant="destructive" className="rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs font-bold">{errorText}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE: DUAL COLUMN (DESKTOP) / STACK (MOBILE)*/}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* ====================================================== */}
        {/* LEFT COLUMN: ORDER SUMMARY, OFFERS & TOTAL (45%)       */}
        {/* ====================================================== */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-muted/15 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-5">
            {/* You are paying Header */}
            <div>
              <span className="text-xs font-medium text-muted-foreground block">
                {isBn ? 'আপনি পরিশোধ করছেন' : 'You are paying'}
              </span>
              <div className="flex items-center justify-between mt-1">
                <button
                  type="button"
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="flex items-center gap-1.5 text-2xl sm:text-3xl font-black text-foreground tabular-nums hover:opacity-90 transition-opacity"
                  data-testid="toggle-amount-breakdown"
                >
                  <span>৳{formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)}</span>
                  {isDetailsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {/* Pay with QR Button */}
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
                  data-testid="pay-with-qr-btn"
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">Pay With</span>
                  <QrCode className="w-4 h-4 text-primary" />
                </button>
              </div>

              {/* EMI info link */}
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{isBn ? 'ইএমআই সুবিধা উপলব্ধ রয়েছে।' : 'EMI is available for this payment.'}</span>
                <button
                  type="button"
                  onClick={() => setBankModalOpen(true)}
                  className="text-primary hover:underline font-bold"
                  data-testid="view-emi-banks-btn"
                >
                  {isBn ? 'ব্যাংক তালিকা' : 'Participating Banks'}
                </button>
              </div>
            </div>

            {/* Financial Breakdown (Collapsible) */}
            {isDetailsExpanded && (
              <div className="rounded-xl bg-card border border-border p-4 flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{isBn ? 'সাবটোটাল (টিউশন কোর্স)' : 'Subtotal'}</span>
                  <span className="font-semibold text-foreground">
                    ৳{formatLocalizedNumber(baseAmountBdt.toFixed(2), locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span>{isBn ? 'কনভেনিয়েন্স চার্জ' : 'Convenience Charge'}</span>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </span>
                  <span className="font-semibold text-foreground">
                    ৳{formatLocalizedNumber(convenienceChargeBdt.toFixed(2), locale)}
                  </span>
                </div>

                {/* Promo Code section */}
                <div className="pt-1">
                  {!promoExpanded && !appliedPromo && (
                    <button
                      type="button"
                      onClick={() => setPromoExpanded(true)}
                      className="text-primary hover:underline font-bold flex items-center gap-1 text-[11px]"
                      data-testid="open-promo-code-btn"
                    >
                      <span>+ {isBn ? 'প্রোমো কোড যুক্ত করুন' : 'Add promo code'}</span>
                    </button>
                  )}

                  {promoExpanded && !appliedPromo && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="e.g. OGRONI10"
                          className="flex-1 px-2.5 py-1.5 text-xs uppercase font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplyPromo}
                          className="h-8 px-3 text-xs font-bold"
                          data-testid="apply-promo-btn"
                        >
                          {isBn ? 'প্রয়োগ' : 'Apply'}
                        </Button>
                      </div>
                      {promoError && <span className="text-[10px] text-destructive font-medium">{promoError}</span>}
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="flex items-center justify-between bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg text-xs font-bold">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        <span>{appliedPromo.code} (-৳{formatLocalizedNumber((appliedPromo.discountMinor / 100).toFixed(2), locale)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-muted-foreground hover:text-foreground text-[10px] underline"
                      >
                        {isBn ? 'বাতিল' : 'Remove'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-2.5 flex items-center justify-between text-sm font-black text-foreground">
                  <span>{isBn ? 'সর্বমোট প্রদেয়' : 'Total Amount'}</span>
                  <span className="text-lg font-black text-primary tabular-nums">
                    ৳{formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)}
                  </span>
                </div>
              </div>
            )}

            {/* Special Offers and Savings */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-foreground">
                    {isBn ? 'বিশেষ অফার ও সেভিংস' : 'Special Offers and Savings'}
                  </h4>
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    6
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {isBn ? 'স্বয়ংক্রিয়ভাবে প্রযোজ্য' : 'Auto-applied'}
                </span>
              </div>

              {/* Offer Card 1: VISA */}
              <div
                onClick={() => {
                  setSelectedOfferId(selectedOfferId === 'visa-10' ? null : 'visa-10');
                  setActiveTab('card');
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedOfferId === 'visa-10'
                    ? 'border-primary bg-primary/5 shadow-2xs'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
                data-testid="offer-card-visa"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-6 bg-card border border-border rounded flex items-center justify-center p-1 shrink-0">
                    <VisaLogo className="h-3 w-auto" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {isBn ? 'ভিসা কার্ড পেমেন্টে ১০% ইনস্ট্যান্ট ডিসকাউন্ট' : 'Enjoy 10% Discount on Visa card payment'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isBn ? 'সর্বোচ্চ ৫০,০০০ টাকা পর্যন্ত | মেয়াদ ১৪ ফেব্রুয়ারি' : 'Upto 50,000 TK | Ends on Feb 14'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-emerald-600 tabular-nums block">
                    ৳{formatLocalizedNumber((baseAmountBdt * 0.9 + convenienceChargeBdt).toFixed(2), locale)}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-through tabular-nums block">
                    ৳{formatLocalizedNumber((baseAmountBdt + convenienceChargeBdt).toFixed(2), locale)}
                  </span>
                </div>
              </div>

              {/* Offer Card 2: Mastercard */}
              <div
                onClick={() => {
                  setSelectedOfferId(selectedOfferId === 'mc-5' ? null : 'mc-5');
                  setActiveTab('card');
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedOfferId === 'mc-5'
                    ? 'border-primary bg-primary/5 shadow-2xs'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
                data-testid="offer-card-mastercard"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-6 bg-card border border-border rounded flex items-center justify-center p-1 shrink-0">
                    <MastercardLogo className="h-4 w-auto" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {isBn ? 'মাস্টারকার্ড পেমেন্টে ৫% ডিসকাউন্ট' : 'Enjoy 5% Discount on Mastercard payment'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isBn ? 'সকল মাস্টারকার্ডে প্রযোজ্য' : 'Eligible on all Mastercards'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-emerald-600 tabular-nums block">
                    ৳{formatLocalizedNumber((baseAmountBdt * 0.95 + convenienceChargeBdt).toFixed(2), locale)}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-through tabular-nums block">
                    ৳{formatLocalizedNumber((baseAmountBdt + convenienceChargeBdt).toFixed(2), locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer Links */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <a href="#support" className="hover:text-foreground transition-colors">
                Support
              </a>
              <span>·</span>
              <a href="#faq" className="hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <span>🌐</span>
              <span>{isBn ? 'বাংলা' : 'English'}</span>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE EASY CHECKOUT DESK (55%)     */}
        {/* ====================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            {/* Welcome banner */}
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                {isBn ? 'স্বাগতম!' : 'Welcome back!'}
              </h3>
            </div>

            {/* Pay with GPay Quick Button */}
            <button
              type="button"
              onClick={handlePayClick}
              disabled={isProcessing}
              className="w-full h-11 bg-black hover:bg-neutral-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-99 shadow-xs"
              data-testid="pay-with-gpay-btn"
            >
              <GPayLogo />
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-border w-full" />
              <span className="bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider absolute">
                {isBn ? 'অথবা' : 'Or'}
              </span>
            </div>

            {/* 4 Method Selector Tabs (Horizontal pill row) */}
            <div className="grid grid-cols-4 gap-2">
              {/* Tab 1: Card */}
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'card'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
                data-testid="tab-card"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isBn ? 'কার্ড' : 'Card'}</span>
              </button>

              {/* Tab 2: Mobile Banking */}
              <button
                type="button"
                onClick={() => setActiveTab('mobile_banking')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all truncate px-1 ${
                  activeTab === 'mobile_banking'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
                data-testid="tab-mobile-banking"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span className="truncate">{isBn ? 'মোবাইল' : 'Mobile Ba...'}</span>
              </button>

              {/* Tab 3: Net Banking */}
              <button
                type="button"
                onClick={() => setActiveTab('net_banking')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all truncate px-1 ${
                  activeTab === 'net_banking'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
                data-testid="tab-net-banking"
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{isBn ? 'নেট ব্যাংকিং' : 'Net Banking'}</span>
              </button>

              {/* Tab 4: More */}
              <button
                type="button"
                onClick={() => setActiveTab('more')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'more'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
                data-testid="tab-more"
              >
                <Grid className="w-4 h-4" />
                <span>{isBn ? 'অন্যান্য' : 'More'}</span>
              </button>
            </div>

            {/* TAB CONTENT: CARD */}
            {activeTab === 'card' && (
              <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{isBn ? 'কার্ড দিয়ে পরিশোধ করুন' : 'Pay with Cards'}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('more')}
                    className="text-primary hover:underline text-[11px] font-semibold"
                  >
                    {isBn ? 'অন্যান্য কার্ড' : 'Other cards'}
                  </button>
                </div>

                {/* Card Number Input with Embedded Logos */}
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="Card Number"
                    maxLength={19}
                    className="w-full h-11 pl-3.5 pr-28 rounded-xl border border-border bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    data-testid="card-number-input"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <VisaLogo className={`h-3 w-auto ${detectedBrand && detectedBrand !== 'visa' ? 'opacity-30' : ''}`} />
                    <MastercardLogo
                      className={`h-3.5 w-auto ${detectedBrand && detectedBrand !== 'mastercard' ? 'opacity-30' : ''}`}
                    />
                    <AmexLogo className={`h-3 w-auto ${detectedBrand && detectedBrand !== 'amex' ? 'opacity-30' : ''}`} />
                  </div>
                </div>

                {/* MM/YY and CVC/CVV row */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="h-11 px-3.5 rounded-xl border border-border bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    data-testid="card-expiry-input"
                  />
                  <div className="relative">
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVC/CVV"
                      maxLength={4}
                      className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-border bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      data-testid="card-cvv-input"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <CreditCard className="w-4 h-4 opacity-60" />
                    </div>
                  </div>
                </div>

                {/* Card Holder Name */}
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Card Holder Name"
                  className="h-11 px-3.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  data-testid="card-holder-input"
                />

                {/* Remember this card checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="remember-card"
                    checked={rememberCard}
                    onChange={(e) => setRememberCard(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-background"
                  />
                  <label htmlFor="remember-card" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    <span>{isBn ? 'এই কার্ডটি সংরক্ষণ করুন' : 'Remember this Card'}</span>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </label>
                </div>

                {/* EMI Tenure Dropdown */}
                <div className="pt-1 flex items-center justify-between text-xs border-t border-border/60">
                  <span className="text-muted-foreground font-medium">
                    {isBn ? 'কিস্তিতে পরিশোধ করতে চান?' : 'Want to pay in instalments?'}
                  </span>
                  <select
                    value={emiTenure}
                    onChange={(e) => setEmiTenure(e.target.value)}
                    className="text-primary font-bold text-xs bg-transparent border-0 focus:ring-0 cursor-pointer text-right"
                    data-testid="emi-tenure-select"
                  >
                    <option value="none">Select EMI Tenure ⌵</option>
                    <option value="3">3 Months (৳{Math.round(totalAmountBdt / 3)}/mo)</option>
                    <option value="6">6 Months (৳{Math.round(totalAmountBdt / 6)}/mo)</option>
                    <option value="9">9 Months (৳{Math.round(totalAmountBdt / 9)}/mo)</option>
                    <option value="12">12 Months (৳{Math.round(totalAmountBdt / 12)}/mo)</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MOBILE BANKING */}
            {activeTab === 'mobile_banking' && (
              <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-foreground">
                  {isBn ? 'মোবাইল ব্যাংকিং অ্যাকাউন্ট বেছে নিন' : 'Select Mobile Banking'}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMfs('bkash')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMfs === 'bkash'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <BkashLogo />
                    <span className="text-xs font-bold">bKash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMfs('nagad')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMfs === 'nagad'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <NagadLogo />
                    <span className="text-xs font-bold">Nagad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMfs('rocket')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMfs === 'rocket'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-700 text-white font-black text-xs flex items-center justify-center">
                      R
                    </div>
                    <span className="text-xs font-bold">Rocket</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMfs('upay')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedMfs === 'upay'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      U
                    </div>
                    <span className="text-xs font-bold">Upay</span>
                  </button>
                </div>

                <div className="rounded-xl bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {isBn
                      ? `‘পরিশোধ করুন’ বাটনে চাপলে সরাসরি ${selectedMfs.toUpperCase()} গেটওয়েতে সুরক্ষিতভাবে সংযোগ করা হবে।`
                      : `Clicking ‘Pay Now’ will seamlessly connect to official ${selectedMfs.toUpperCase()} gateway to enter PIN.`}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NET BANKING */}
            {activeTab === 'net_banking' && (
              <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-foreground">
                  {isBn ? 'ইন্টারনেট ব্যাংকিং নির্বাচন করুন' : 'Select Internet Banking'}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'city', name: 'City Touch (City Bank)' },
                    { id: 'brac', name: 'BRAC Bank Astha' },
                    { id: 'ibbl', name: 'Islami Bank CellFin' },
                    { id: 'dbbl', name: 'Dutch-Bangla Bank' },
                    { id: 'ebl', name: 'EBL Skybanking' },
                    { id: 'bankasia', name: 'Bank Asia' },
                  ].map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedBank === bank.id
                          ? 'border-primary bg-primary/10 shadow-2xs'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-primary mb-1" />
                      <span className="text-xs font-bold text-foreground block truncate">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: MORE */}
            {activeTab === 'more' && (
              <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-foreground">{isBn ? 'অন্যান্য পেমেন্ট মাধ্যম' : 'Other Payment Channels'}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-border bg-card flex items-center gap-2">
                    <Grid className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold">NexusPay Card</p>
                      <p className="text-[10px] text-muted-foreground">DBBL Nexus</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold">UnionPay</p>
                      <p className="text-[10px] text-muted-foreground">International Cards</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button & Security Footer */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Primary Pay Button */}
            <Button
              type="button"
              onClick={handlePayClick}
              disabled={isProcessing}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl transition-all shadow-md active:scale-99 flex items-center justify-center gap-2"
              data-testid="sslcommerz-easy-pay-now-btn"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-1 text-primary-foreground" />
                  <span>{isBn ? 'গেটওয়েতে সংযোগ করা হচ্ছে…' : 'Connecting to SSLCommerz…'}</span>
                </>
              ) : (
                <span>
                  {isBn
                    ? `৳${formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)} পরিশোধ করুন`
                    : `Pay ৳${formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)}`}
                </span>
              )}
            </Button>

            {/* Terms Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground leading-normal px-2">
              {isBn
                ? "‘পরিশোধ করুন’ বাটনে চাপার মাধ্যমে আপনি আমাদের সেবার শর্তাবলীতে সম্মতি জানাচ্ছেন যা ogroniedu.com-এ আপনার নিরাপদ পেমেন্ট নিশ্চিত করে।"
                : "By clicking the 'Pay Now', button you agree to our Terms of Service which is limited to facilitating your payment to easy.com.bd / ogroniedu.com"}
            </p>

            {/* Compliance & SSLCommerz Badges */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-[10px] text-muted-foreground">Powered by</span>
                <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-black text-[10px] tracking-tight">
                  SSLCOMMERZ
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground/80">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PCI DSS</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-primary" />
                  <span>128-bit SSL</span>
                </span>
              </div>
            </div>

            {/* Secondary footer links */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-3">
                <a href="#support" className="hover:text-foreground">
                  Support
                </a>
                <span>·</span>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </div>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <span>🌐</span>
                <span>English ▾</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. QR CODE PAYMENT MODAL                                 */}
      {/* ======================================================== */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-muted-foreground">Scan to Pay</span>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-border flex items-center justify-center shadow-xs">
              <QrCode className="w-40 h-40 text-slate-900" />
            </div>

            <div>
              <p className="text-sm font-black text-foreground">
                ৳{formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'আপনার বিকাশ বা নগদ অ্যাপ দিয়ে কিউআর কোড স্ক্যান করে পেমেন্ট সম্পন্ন করুন।'
                  : 'Scan this QR code using bKash or Nagad App to complete your payment.'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQrModalOpen(false)}
              className="w-full rounded-xl"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. PARTICIPATING EMI BANKS MODAL                         */}
      {/* ======================================================== */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-extrabold text-foreground">Participating EMI Banks</h4>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isBn
                ? 'অগ্রণী এডুর সাথে নিম্নোক্ত ব্যাংকের ক্রেডিট কার্ডে ৩ থেকে ১২ মাসের ০% সুদে ইএমআই সুবিধা পাওয়া যাচ্ছে:'
                : '0% Interest EMI available on Credit Cards for 3, 6, 9, 12 months with participating banks:'}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">BRAC Bank Limited</div>
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">The City Bank (Amex)</div>
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">Eastern Bank Ltd (EBL)</div>
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">Standard Chartered</div>
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">Dutch-Bangla Bank</div>
              <div className="p-2.5 rounded-xl border border-border bg-muted/20">Mutual Trust Bank</div>
            </div>

            <Button
              type="button"
              onClick={() => setBankModalOpen(false)}
              className="w-full rounded-xl font-bold mt-2"
            >
              {isBn ? 'বুঝেছি' : 'Got it'}
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SEAMLESS SSLCOMMERZ EASY CHECKOUT MODAL IFRAME        */}
      {/* ======================================================== */}
      {showIframeModal && targetIframeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          data-testid="sslcommerz-easy-checkout-modal"
        >
          <div className="relative w-full max-w-xl h-[88vh] max-h-[760px] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border text-foreground">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center">
                  SSL
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    {isBn ? 'এসএসএলকমার্জ সিকিউর ইজি চেকআউট' : 'SSLCOMMERZ Easy Checkout'}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Trx ID: {trxId} · ৳{formatLocalizedNumber(totalAmountBdt.toFixed(2), locale)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={targetIframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={isBn ? 'নতুন উইন্ডোতে খুলুন' : 'Open in new window'}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={onCloseIframeModal}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="close-sslcommerz-iframe-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="relative flex-1 w-full bg-slate-100 overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
                  <LoadingSpinner className="w-8 h-8 text-primary" />
                  <p className="text-xs font-bold text-slate-700">
                    {isBn ? 'নিরাপদ পেমেন্ট গেটওয়ে লোড হচ্ছে…' : 'Loading SSLCommerz Easy Checkout…'}
                  </p>
                </div>
              )}

              <iframe
                src={targetIframeUrl}
                title="SSLCOMMERZ Easy Checkout"
                className="w-full h-full border-0"
                onLoad={onIframeLoaded}
                allow="payment *; camera *; microphone *"
                data-testid="sslcommerz-easy-checkout-iframe"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 font-medium">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isBn ? '১০০% এসক্রো সুরক্ষিত' : '100% Escrow Protected'}</span>
              </span>
              <button
                type="button"
                onClick={onCloseIframeModal}
                className="text-muted-foreground hover:text-foreground underline"
              >
                {isBn ? 'পেমেন্ট বাতিল করুন' : 'Cancel Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
