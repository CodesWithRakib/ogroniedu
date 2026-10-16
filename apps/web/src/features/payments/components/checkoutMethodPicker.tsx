'use client';

import { CreditCard, Lock } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
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

/** Gateway selection (bKash / Nagad / SSLCommerz) plus pay action. */
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
  const amountBdt = orderAmountBdt(order);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          {p.selectGateway}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* SSLCOMMERZ (Recommended) */}
        <div
          onClick={() => onSelectGateway('sslcommerz')}
          className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'sslcommerz'
              ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30'
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          data-testid="gateway-picker-sslcommerz"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-black flex items-center justify-center text-[10px] tracking-tight shadow-sm">
              SSL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{p.sslTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {locale === 'bn' ? 'সুপারিশকৃত' : 'Recommended'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.sslDesc}</div>
            </div>
          </div>
          <input
            type="radio"
            name="gateway"
            checked={selectedGateway === 'sslcommerz'}
            onChange={() => onSelectGateway('sslcommerz')}
            className="w-4 h-4 text-cyan-600"
          />
        </div>

        {/* bKash */}
        <div
          onClick={() => onSelectGateway('bkash')}
          className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'bkash'
              ? 'border-pink-500 bg-pink-500/5 ring-2 ring-pink-500/30'
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          data-testid="gateway-picker-bkash"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              বিকাশ
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{p.bkashTitle}</div>
              <div className="text-xs text-muted-foreground">{p.bkashDesc}</div>
            </div>
          </div>
          <input
            type="radio"
            name="gateway"
            checked={selectedGateway === 'bkash'}
            onChange={() => onSelectGateway('bkash')}
            className="w-4 h-4 text-pink-600"
          />
        </div>

        {/* Nagad */}
        <div
          onClick={() => onSelectGateway('nagad')}
          className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
            selectedGateway === 'nagad'
              ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/30'
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          data-testid="gateway-picker-nagad"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              নগদ
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{p.nagadTitle}</div>
              <div className="text-xs text-muted-foreground">{p.nagadDesc}</div>
            </div>
          </div>
          <input
            type="radio"
            name="gateway"
            checked={selectedGateway === 'nagad'}
            onChange={() => onSelectGateway('nagad')}
            className="w-4 h-4 text-orange-600"
          />
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        {payError && (
          <div
            role="alert"
            className="mb-3 w-full rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700"
            data-testid="payment-error"
          >
            {payError}
          </div>
        )}
        <Button
          onClick={onPay}
          disabled={isProcessing || Boolean(payDisabledReason) || order.status !== 'pending'}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-base flex items-center justify-center gap-2"
          data-testid="pay-now-btn"
        >
          {isProcessing ? (
            <span>{dict.common.loading}</span>
          ) : payDisabledReason ? (
            <span className="text-sm">{payDisabledReason}</span>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {p.payNow} (৳ {formatLocalizedNumber(amountBdt, locale)})
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
