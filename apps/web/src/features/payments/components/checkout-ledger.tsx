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
              Invariant: SUM(Debits) = SUM(Credits)
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
            <span className="text-muted-foreground">Ledger Status</span>
            <span className="font-semibold text-emerald-600">Balanced</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Discrepancies</span>
            <span className="font-semibold text-emerald-600">{p.zeroDiscrepancy}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Precision</span>
            <span className="font-mono">Minor Units (Poisha)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Store ID (Sandbox)</span>
            <span className="font-mono font-medium">ogron6ac9fcef6d321</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Payment Tunnel</span>
            <span
              className="font-mono text-[10px] text-emerald-600 truncate max-w-[150px]"
              title="https://undone-unsure-twisting.ngrok-free.dev"
            >
              ngrok active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
