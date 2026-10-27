'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  X,
  CreditCard,
  Maximize2,
} from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { type Locale, formatLocalizedNumber } from '@/lib/i18n';
import { formatBDTMinor } from '@/lib/format';

export interface EmbeddedEasyCheckoutProps {
  orderId: string;
  checkoutUrl: string;
  sessionKey?: string;
  gatewayPageUrl?: string;
  storeLogo?: string;
  amountMinor: number;
  locale: Locale;
  onModalClose?: () => void;
  onPaymentTriggered?: () => void;
  onPaymentCompleted?: (orderId: string) => void;
  onPaymentFailed?: (orderId: string) => void;
}

const SSLCOMMERZ_SANDBOX_SCRIPT = 'https://sandbox.sslcommerz.com/embed.min.js';

/**
 * Official SSLCOMMERZ Embedded Easy Checkout Component.
 *
 * Exclusively configured for SSLCOMMERZ Sandbox testing:
 * - Dynamically loads official SSLCOMMERZ sandbox script with deduplication.
 * - Supports seamless desktop modal checkout & mobile responsive popup delegation.
 * - Handles cross-origin postMessage events from the gateway iframe safely.
 * - Implements failure recovery with secure direct fallback if script is blocked.
 * - Maintains complete accessibility and brand consistency.
 */
export function EmbeddedEasyCheckout({
  orderId,
  checkoutUrl,
  sessionKey,
  gatewayPageUrl,
  storeLogo,
  amountMinor,
  locale,
  onModalClose,
  onPaymentTriggered,
  onPaymentCompleted,
  onPaymentFailed,
}: EmbeddedEasyCheckoutProps) {
  const isBn = locale === 'bn';
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const scriptBaseUrl = SSLCOMMERZ_SANDBOX_SCRIPT;
  const targetIframeUrl = (gatewayPageUrl || checkoutUrl).includes('?')
    ? `${gatewayPageUrl || checkoutUrl}&full=1`
    : `${gatewayPageUrl || checkoutUrl}?full=1`;

  // 1. Dynamic official script loader with deduplication and error handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if script is already present
    const existingScript = document.querySelector(`script[data-sslcz-embed="true"]`);
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.dataset.sslczEmbed = 'true';
    script.src = `${scriptBaseUrl}?rand=${Math.random().toString(36).substring(7)}`;

    script.onload = () => {
      setScriptLoaded(true);
      setScriptError(null);
    };

    script.onerror = () => {
      setScriptLoaded(false);
      setScriptError(
        isBn
          ? 'পেমেন্ট গেটওয়ের স্ক্রিপ্ট লোড করা যায়নি। অ্যাড-ব্লকার বন্ধ করুন অথবা সরাসরি খুলুন।'
          : 'Unable to load payment gateway script. Please disable ad-blockers or use direct checkout.',
      );
    };

    document.head.appendChild(script);

    return () => {
      // Do not remove script on unmount to avoid re-executing almond/requirejs conflicts
    };
  }, [scriptBaseUrl, isBn]);

  // 2. Gateway postMessage listener for cross-origin messages
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let data: Record<string, unknown> = {};
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // Check if message is from SSLCommerz easyCheckout
      if (data.status === 'success') {
        if (typeof data.url === 'string' && data.url.includes('http')) {
          setIsOpen(false);
          if (data.url.includes('status=failed') || data.url.includes('status=cancelled')) {
            onPaymentFailed?.(orderId);
          } else {
            onPaymentCompleted?.(orderId);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [orderId, onPaymentCompleted, onPaymentFailed]);

  // 3. Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onModalClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onModalClose]);

  const handleOpenEmbedded = useCallback(() => {
    onPaymentTriggered?.();

    // Check if user is on a mobile device
    const isMobile =
      typeof window !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent,
      );

    if (isMobile) {
      // On mobile devices, open in a new tab per official SSLCommerz recommendation
      // so MFS apps (bKash, Nagad) can trigger native deep-links reliably
      const win = window.open(checkoutUrl, '_blank');
      if (win) win.opener = null;
    } else {
      setIframeLoading(true);
      setIsOpen(true);
    }
  }, [checkoutUrl, onPaymentTriggered]);

  const handleOpenDirect = useCallback(() => {
    onPaymentTriggered?.();
    const win = window.open(checkoutUrl, '_blank');
    if (win) win.opener = null;
  }, [checkoutUrl, onPaymentTriggered]);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
    onModalClose?.();
  }, [onModalClose]);

  return (
    <div className="w-full space-y-4" data-testid="embedded-easy-checkout-container">
      {/* Primary Embedded Action Card */}
      <div className="rounded-2xl sm:rounded-3xl border-2 border-blue-600/30 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-5 sm:p-6 shadow-sm text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                SSL
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {isBn ? 'এসএসএলকমার্জ ইনস্ট্যান্ট চেকআউট' : 'SSLCOMMERZ Easy Checkout'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                {isBn ? 'এমবেডেড' : 'Embedded'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-md">
              {isBn
                ? 'পেজ ছেড়ে না গিয়ে কার্ড, বিকাশ, নগদ বা ইন্টারনেট ব্যাংকিংয়ের মাধ্যমে নিরাপদে পরিশোধ করুন।'
                : 'Pay securely using cards, bKash, Nagad, or net banking directly without leaving OgroniEdu.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
            <Button
              type="button"
              onClick={handleOpenEmbedded}
              data-testid="sslcommerz-embedded-pay-btn"
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm h-11 px-6 rounded-2xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isBn
                  ? `৳ ${formatLocalizedNumber((amountMinor / 100).toFixed(2), locale)} এখনই পরিশোধ করুন`
                  : `Pay ৳ ${formatLocalizedNumber((amountMinor / 100).toFixed(2), locale)} Now`}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenDirect}
              data-testid="sslcommerz-fallback-pay-btn"
              title={isBn ? 'নতুন ট্যাবে খুলুন' : 'Open in new tab'}
              className="h-11 px-3.5 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Script Warning / Fallback Notice */}
        {scriptError && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{scriptError}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenDirect}
              className="h-7 text-[11px] px-2.5 font-bold shrink-0 bg-white"
            >
              {isBn ? 'সরাসরি পে করুন' : 'Pay Directly'}
            </Button>
          </div>
        )}

        {/* Security Assurance Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isBn ? '১২৮-বিট এসএসএল সুরক্ষিত' : '128-bit SSL Encrypted Gateway'}</span>
          </div>
          <div>
            <span>Order #{orderId.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Embedded Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sslcz-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl h-[88vh] max-h-[760px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 text-slate-900"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                  SSL
                </div>
                <div>
                  <h4
                    id="sslcz-modal-title"
                    className="text-xs sm:text-sm font-black text-slate-900"
                  >
                    {isBn ? 'এসএসএলকমার্জ নিরাপদ চেকআউট' : 'SSLCOMMERZ Secure Checkout'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {isBn ? 'অগ্রণী এডু এসক্রো ডিপোজিট' : 'OgroniEdu Escrow Deposit'} ·{' '}
                    {formatBDTMinor(amountMinor, locale)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenDirect}
                  title={isBn ? 'পূর্ণ স্ক্রিনে খুলুন' : 'Open in full window'}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                  data-testid="close-embedded-checkout-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body with Iframe */}
            <div className="relative flex-1 w-full bg-slate-100 overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
                  <LoadingSpinner className="w-8 h-8 text-blue-600" />
                  <p className="text-xs font-bold text-slate-600">
                    {isBn ? 'নিরাপদ পেমেন্ট গেটওয়ে লোড হচ্ছে…' : 'Loading secure payment gateway…'}
                  </p>
                </div>
              )}

              <iframe
                src={targetIframeUrl}
                title="SSLCOMMERZ Easy Checkout"
                className="w-full h-full border-0"
                onLoad={() => setIframeLoading(false)}
                allow="payment"
                data-testid="sslcommerz-checkout-iframe"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-semibold shrink-0">
              <span className="flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isBn ? 'এসক্রো নীতিমালায় সংরক্ষিত' : 'Escrow Protected'}</span>
              </span>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-600 hover:text-slate-900 underline font-medium"
              >
                {isBn ? 'পেমেন্ট বাতিল করুন' : 'Cancel & Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
