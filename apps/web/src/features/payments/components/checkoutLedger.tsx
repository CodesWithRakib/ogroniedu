'use client';

import React from 'react';
import { Scale, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import {
  tutorShareBdt,
  platformShareBdt,
  type PaymentOrderDetails,
} from '../types/payment-checkout.types';

interface CheckoutLedgerProps {
  order: PaymentOrderDetails;
  locale: Locale;
}

/** Double-entry ledger breakdown plus system reconciliation status. */
export function CheckoutLedger({ order, locale }: CheckoutLedgerProps) {
  const dict = getDictionary(locale);
  const p = dict.payments;
  const isBn = locale === 'bn';
  const tutorShare = tutorShareBdt(order);
  const platformShare = platformShareBdt(order);

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 bg-white rounded-3xl shadow-sm text-slate-900 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-base font-black flex items-center gap-2 text-slate-900">
            <Scale className="w-5 h-5 text-blue-600" />
            <span>{p.ledgerBreakdownTitle}</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 font-medium">
            {p.escrowDepositNote}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <span className="text-xs font-bold text-slate-700">{p.tutorShare}</span>
              <span className="font-extrabold text-slate-900 tabular-nums">
                ৳ {formatLocalizedNumber(tutorShare, locale)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <span className="text-xs font-bold text-slate-700">{p.platformShare}</span>
              <span className="font-extrabold text-slate-900 tabular-nums">
                ৳ {formatLocalizedNumber(platformShare, locale)}
              </span>
            </div>
          </div>

          <div className="border border-blue-200 bg-blue-50/70 rounded-2xl p-3.5 text-xs text-slate-900 space-y-1">
            <div className="font-black flex items-center gap-1.5 text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{p.ledgerBalanced}</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed font-medium">
              {p.ledgerInvariantNote}
            </p>
          </div>

          <div className="text-xs text-slate-700 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{p.refundPolicyNotice}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white rounded-3xl shadow-sm text-slate-900 overflow-hidden">
        <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{p.reconciliationTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2.5 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600 font-semibold">{p.ledgerStatus}</span>
            <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {order.status === 'succeeded' ? p.statusSucceeded : p.statusPending}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-600 font-semibold">{p.ledgerPrecision}</span>
            <span className="font-mono font-bold text-slate-900">{p.minorUnitsNote}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
