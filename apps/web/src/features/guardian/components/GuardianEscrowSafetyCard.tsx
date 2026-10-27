'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RefreshCw,
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
  heldEscrowBdt = 8500,
  releasedBdt = 12000,
  pendingMilestonesCount = 1,
  nextMilestoneAmountBdt = 4500,
  nextMilestoneTutorName = 'ড. মো. আনিসুর রহমান',
  nextMilestoneSubject = 'উচ্চতর গণিত ও পদার্থবিজ্ঞান',
}: GuardianEscrowSafetyCardProps) {
  const isBn = locale === 'bn';
  const [isApproving, setIsApproving] = React.useState(false);
  const [approved, setApproved] = React.useState(false);

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setApproved(true);
    }, 800);
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
      data-testid="guardian-escrow-safety-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
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
      <div className="my-4 grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>{isBn ? 'এসক্রোতে সুরক্ষিত' : 'Safely Held in Escrow'}</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-foreground mt-1">
            ৳ {formatLocalizedNumber(heldEscrowBdt, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn
              ? 'ক্লাস সমাপ্তি নিশ্চিত হওয়া পর্যন্ত সংরক্ষিত'
              : 'Released only upon verification'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isBn ? 'সফলভাবে পরিশোধিত' : 'Released This Term'}</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-foreground mt-1">
            ৳ {formatLocalizedNumber(releasedBdt, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? 'শিক্ষকের একাউন্টে সরাসরি স্থানান্তরিত' : 'Directly settled to tutor'}
          </p>
        </div>
      </div>

      {/* Pending Milestone Approval Queue */}
      {pendingMilestonesCount > 0 && !approved ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {isBn ? 'অভিভাবকের অনুমোদনের অপেক্ষায়' : 'Action Required: Release Milestone'}
              </span>
              <p className="text-xs font-bold text-foreground">
                {nextMilestoneSubject} • {nextMilestoneTutorName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? `১২টি ক্লাসের মাইলস্টোন সম্পন্ন হয়েছে। সম্মানী: ৳ ${formatLocalizedNumber(nextMilestoneAmountBdt, locale)}`
                  : `Monthly milestone completed. Amount: ৳ ${nextMilestoneAmountBdt}`}
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isApproving}
              className="rounded-xl shrink-0 font-bold text-xs"
            >
              {isApproving
                ? isBn
                  ? 'প্রসেসিং...'
                  : 'Processing...'
                : isBn
                  ? 'সম্মানী ছাড়ুন'
                  : 'Approve & Release'}
            </Button>
          </div>
        </div>
      ) : approved ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isBn
              ? 'মাইলস্টোন সম্মানী সফলভাবে শিক্ষকের একাউন্টে পাঠানো হয়েছে!'
              : 'Milestone released successfully to the tutor!'}
          </span>
        </div>
      ) : null}

      {/* Trust Guarantees Footer */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
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
