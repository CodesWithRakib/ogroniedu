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
    <div className="flex flex-col gap-6">
      <Card className="border border-border bg-card rounded-xl shadow-xs text-card-foreground overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-surface-muted">
          <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
            <Scale className="w-5 h-5 text-primary" />
            <span>{p.ledgerBreakdownTitle}</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-medium">
            {p.escrowDepositNote}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center bg-surface-muted border border-border p-3 rounded-xl">
              <span className="text-xs font-bold text-muted-foreground">{p.tutorShare}</span>
              <span className="font-extrabold text-foreground tabular-nums">
                ৳ {formatLocalizedNumber(tutorShare, locale)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-surface-muted border border-border p-3 rounded-xl">
              <span className="text-xs font-bold text-muted-foreground">{p.platformShare}</span>
              <span className="font-extrabold text-foreground tabular-nums">
                ৳ {formatLocalizedNumber(platformShare, locale)}
              </span>
            </div>
          </div>

          <div className="border border-info/30 bg-info-soft/40 rounded-xl p-3.5 text-xs text-foreground flex flex-col gap-1">
            <div className="font-black flex items-center gap-1.5 text-info">
              <CheckCircle2 className="w-4 h-4 text-info shrink-0" />
              <span>{p.ledgerBalanced}</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed font-medium">
              {p.ledgerInvariantNote}
            </p>
          </div>

          <div className="text-xs text-warning-foreground bg-warning-soft/40 p-3.5 rounded-xl border border-warning/30 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{p.refundPolicyNotice}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card rounded-xl shadow-xs text-card-foreground overflow-hidden">
        <CardHeader className="pb-2 border-b border-border bg-surface-muted">
          <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>{p.reconciliationTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 flex flex-col gap-2.5 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border">
            <span className="text-muted-foreground font-semibold">{p.ledgerStatus}</span>
            <span className="font-black text-success bg-success-soft px-2 py-0.5 rounded-md border border-success/30">
              {order.status === 'succeeded' ? p.statusSucceeded : p.statusPending}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground font-semibold">{p.ledgerPrecision}</span>
            <span className="font-mono font-bold text-foreground">{p.minorUnitsNote}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
