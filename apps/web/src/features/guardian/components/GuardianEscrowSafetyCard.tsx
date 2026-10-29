'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

interface GuardianEscrowSafetyCardProps {
  locale: Locale;
  heldEscrowBdt?: number;
  releasedBdt?: number;
  pendingMilestonesCount?: number;
  nextMilestoneAmountBdt?: number;
  nextMilestoneTutorName?: string;
  nextMilestoneSubject?: string;
}

export function GuardianEscrowSafetyCard({
  locale,
  heldEscrowBdt = 0,
  releasedBdt = 0,
  pendingMilestonesCount = 0,
  nextMilestoneAmountBdt = 0,
  nextMilestoneTutorName = '',
  nextMilestoneSubject = '',
}: GuardianEscrowSafetyCardProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between select-none"
      data-testid="guardian-escrow-safety-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isBn ? 'আর্থিক নিরাপত্তা ও ট্রাস্ট' : 'Financial Escrow Safety'}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                <Lock className="w-2.5 h-2.5" />
                <span>100% Escrow</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'অগ্রণী এসক্রো ও পেমেন্ট সুরক্ষা' : 'Ogroni Safe Escrow Pool'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/guardian/payments', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'লেজার হিসাব' : 'Ledger History'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Escrow Balance Visualization */}
      <div className="my-3.5 grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>{isBn ? 'এসক্রোতে সুরক্ষিত' : 'Safely Held in Escrow'}</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1 tabular-nums">
            ৳ {formatLocalizedNumber(heldEscrowBdt, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn
              ? 'ক্লাস সমাপ্তি নিশ্চিত হওয়া পর্যন্ত সংরক্ষিত'
              : 'Released only upon verification'}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isBn ? 'মোট ছাড়কৃত পারিশ্রমিক' : 'Total Released to Tutors'}</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1 tabular-nums">
            ৳ {formatLocalizedNumber(releasedBdt, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn
              ? 'যাচাইকৃত ক্লাস বাবদ শিক্ষকের ওয়ালেটে জমা'
              : 'Directly settled for attended classes'}
          </p>
        </div>
      </div>

      {/* Action / Notification Pill */}
      {pendingMilestonesCount > 0 ? (
        <div className="p-3 rounded-lg bg-warning-soft/40 border border-warning/30 mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-warning block">
              {isBn ? 'অনুমোদনের অপেক্ষায় মাইলস্টোন' : 'Pending Milestone Release'}
            </span>
            {nextMilestoneSubject && nextMilestoneTutorName ? (
              <p className="text-xs font-bold text-foreground truncate">
                {nextMilestoneSubject} • {nextMilestoneTutorName}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              {isBn
                ? `${formatLocalizedNumber(pendingMilestonesCount, locale)}টি ক্লাসের মাইলস্টোন সম্পন্ন হয়েছে। সম্মানী: ৳ ${formatLocalizedNumber(nextMilestoneAmountBdt, locale)}`
                : `${pendingMilestonesCount} session milestone(s) completed. Amount: ৳ ${nextMilestoneAmountBdt}`}
            </p>
          </div>

          <Button asChild size="sm" className="rounded-lg shrink-0 font-semibold text-xs">
            <Link href={withLocale('/dashboard/guardian/payments', locale)}>
              <span>{isBn ? 'সম্মানী ছাড়ুন' : 'Review & Settle'}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 mb-3.5 flex items-center gap-2 text-muted-foreground text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            {isBn
              ? 'সব টিউশন মাইলস্টোন আপ-টু-ডেট রয়েছে। কোনো অনিষ্পন্ন পেমেন্ট নেই।'
              : 'All tuition milestones are settled. Escrow is fully synchronized.'}
          </span>
        </div>
      )}

      {/* Trust Guarantees Footer */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {isBn
              ? '৩০ দিনের শিক্ষক প্রতিস্থাপন নিশ্চয়তা ও সার্বক্ষণিক অডিট'
              : '30-Day Tutor Replacement Guarantee included'}
          </span>
        </div>
        <Link
          href={withLocale('/safety', locale)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3" />
          <span>{isBn ? 'এসক্রো নীতি' : 'Escrow Policy'}</span>
        </Link>
      </div>
    </div>
  );
}
