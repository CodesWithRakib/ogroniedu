'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Lock,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

interface TutorEarningsCommandBarProps {
  locale: Locale;
  availableBdt: number;
  escrowPendingBdt: number;
  lifetimeNetBdt: number;
  minPayoutBdt?: number;
  isLoading?: boolean;
}

export function TutorEarningsCommandBar({
  locale,
  availableBdt = 14250,
  escrowPendingBdt = 8500,
  lifetimeNetBdt = 65000,
  minPayoutBdt = 500,
  isLoading,
}: TutorEarningsCommandBarProps) {
  const isBn = locale === 'bn';
  const isPayoutEligible = availableBdt >= minPayoutBdt;

  return (
    <div
      className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs"
      data-testid="tutor-earnings-command-bar"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Available Balance Box */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Wallet className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available for Payout'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>{isBn ? 'উত্তোলন প্রস্তুত' : 'Ready'}</span>
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 flex items-baseline gap-1.5">
              <span>৳ {formatLocalizedNumber(availableBdt, locale)}</span>
              <span className="text-xs font-medium text-muted-foreground">BDT</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isBn
                ? `নূন্যতম উত্তোলন: ৳ ${formatLocalizedNumber(minPayoutBdt, locale)} (বিকাশ, নগদ বা ব্যাংক ট্রান্সফার)`
                : `Min payout: ৳ ${minPayoutBdt} (bKash, Nagad, Bank)`}
            </p>
          </div>
        </div>

        {/* Escrow & Lifetime Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:border-l lg:border-border lg:pl-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{isBn ? 'এসক্রোতে সংরক্ষিত' : 'Locked in Escrow'}</span>
            </div>
            <div className="text-lg font-black text-foreground">
              ৳ {formatLocalizedNumber(escrowPendingBdt, locale)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isBn ? 'মাইলস্টোন সমাপ্তিতে ছাড়যোগ্য' : 'Releases on milestone'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>{isBn ? 'সর্বমোট অর্জিত আয়' : 'Lifetime Earnings'}</span>
            </div>
            <div className="text-lg font-black text-foreground">
              ৳ {formatLocalizedNumber(lifetimeNetBdt, locale)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isBn ? '১০০% স্বচ্ছ লেনদেন রেকর্ড' : '100% verified ledger'}
            </p>
          </div>
        </div>

        {/* Action Button: Direct Payout Launcher */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2 shrink-0">
          <Link
            href={withLocale('/dashboard/tutor/finance', locale)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isBn ? 'টাকা উত্তোলন করুন' : 'Withdraw Earnings'}</span>
            <ArrowUpRight className="w-4 h-4 ml-0.5" />
          </Link>

          <Link
            href={withLocale('/dashboard/tutor/finance', locale)}
            className="text-xs text-muted-foreground hover:text-foreground text-center lg:text-right font-medium hover:underline py-0.5"
          >
            {isBn ? 'পেমেন্ট মেথড ও হিস্ট্রি →' : 'Payment Methods & History →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
