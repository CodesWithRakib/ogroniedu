'use client';

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
  const tutorShare = tutorShareBdt(order);
  const platformShare = platformShareBdt(order);

  return (
    <div className="space-y-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            {p.ledgerBreakdownTitle}
          </CardTitle>
          <CardDescription className="text-xs">{p.escrowDepositNote}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {p.tutorShare}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ৳ {formatLocalizedNumber(tutorShare, locale)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {p.platformShare}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ৳ {formatLocalizedNumber(platformShare, locale)}
              </span>
            </div>
          </div>

          <div className="border border-emerald-500/20 bg-emerald-500/10 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {p.ledgerBalanced}
            </div>
            <div className="text-muted-foreground text-[11px]">
              {p.ledgerInvariantNote}
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-border flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>{p.refundPolicyNotice}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {p.reconciliationTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">{p.ledgerStatus}</span>
            <span className="font-semibold text-emerald-600">
              {order.status === 'succeeded' ? p.statusSucceeded : p.statusPending}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">{p.ledgerPrecision}</span>
            <span className="font-mono">{p.minorUnitsNote}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
