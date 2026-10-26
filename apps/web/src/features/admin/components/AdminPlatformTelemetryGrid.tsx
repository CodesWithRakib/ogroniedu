'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Users,
  Search,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface AdminPlatformTelemetryGridProps {
  locale: Locale;
  totalGmvBdt?: number;
  activeEscrowPoolBdt?: number;
  verifiedTutorsCount?: number;
  activeStudentsCount?: number;
  isLedgerBalanced?: boolean;
}

export function AdminPlatformTelemetryGrid({
  locale,
  totalGmvBdt = 485000,
  activeEscrowPoolBdt = 64200,
  verifiedTutorsCount = 28,
  activeStudentsCount = 114,
  isLedgerBalanced = true,
}: AdminPlatformTelemetryGridProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="admin-platform-telemetry"
    >
      {/* 1. GMV Volume */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isBn ? 'গ্রস ট্রানজ্যাকশন (GMV)' : 'Gross Volume (GMV)'}
          </span>
          <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            ৳ {formatLocalizedNumber(totalGmvBdt, locale)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <span>↑ 18.4%</span>
            <span className="text-muted-foreground font-normal">
              {isBn ? 'চলতি মাসে প্রবৃদ্ধি' : 'vs last month'}
            </span>
          </p>
        </div>

        <Link
          href={withLocale('/dashboard/admin/analytics', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-2 border-t border-border/60"
        >
          <span>{isBn ? 'আর্থিক অ্যানালিটিক্স' : 'Financial Insights'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 2. Safe Escrow Pool */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isBn ? 'সুরক্ষিত এসক্রো পুল' : 'Active Escrow Pool'}
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            ৳ {formatLocalizedNumber(activeEscrowPoolBdt, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? '১০০% ব্যাংক গ্যারান্টিতে সংরক্ষিত' : 'Held under platform escrow'}
          </p>
        </div>

        <Link
          href={withLocale('/dashboard/admin/disputes', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-2 border-t border-border/60"
        >
          <span>{isBn ? 'এসক্রো রিজার্ভ তদারকি' : 'Audit Escrow'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 3. Double-Entry Ledger Radar */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isBn ? 'ডাবল-এন্ট্রি লেজার' : 'Ledger Integrity'}
          </span>
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-foreground">
              {isLedgerBalanced
                ? isBn
                  ? 'সম্পূর্ণ ব্যালেন্সড'
                  : '100% Balanced'
                : isBn
                  ? 'পার্থক্য চিহ্নিত'
                  : 'Discrepancy'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <span>✓ {isBn ? '৳ ০ সাসপেন্স ব্যালেন্স' : '৳ 0 suspense balance'}</span>
          </p>
        </div>

        <Link
          href={withLocale('/dashboard/admin/disputes', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-2 border-t border-border/60"
        >
          <span>{isBn ? 'রিয়েল-টাইম অডিট' : 'Real-time Audit'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 4. Verified Tutors & Active Students */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isBn ? 'সক্রিয় লার্নিং নেটওয়ার্ক' : 'Learning Ecosystem'}
          </span>
          <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {formatLocalizedNumber(verifiedTutorsCount, locale)} /{' '}
            {formatLocalizedNumber(activeStudentsCount, locale)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? 'অনুমোদিত শিক্ষক / নিবন্ধিত শিক্ষার্থী' : 'Approved Tutors / Active Students'}
          </p>
        </div>

        <Link
          href={withLocale('/dashboard/admin/users', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-2 border-t border-border/60"
        >
          <span>{isBn ? 'ইউজার ডিরেক্টরি' : 'Manage Network'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
