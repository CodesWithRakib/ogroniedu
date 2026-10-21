'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface AdminTriageCommandCenterProps {
  locale: Locale;
  pendingVerifications: number;
  activeReplacements: number;
  openSafetyReports: number;
}

export function AdminTriageCommandCenter({
  locale,
  pendingVerifications = 4,
  activeReplacements = 1,
  openSafetyReports = 0,
}: AdminTriageCommandCenterProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs"
      data-testid="admin-triage-command-center"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isBn ? 'অপারেশনাল ট্রায়াজ কিউ' : 'Priority Action Queues'}
          </span>
          <h3 className="text-base font-bold text-foreground">
            {isBn ? 'প্রশাসনিক ট্রায়াজ কমান্ড সেন্টার' : 'Platform Triage Command Center'}
          </h3>
        </div>
        <span className="text-xs font-semibold text-primary">
          {isBn ? 'সক্রিয় পর্যবেক্ষণ চালু' : 'Live SLA Monitoring'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* 1. Tutor Verification Queue */}
        <div className="p-4 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                {isBn ? 'শিক্ষক যাচাই কিউ' : 'Tutor Verifications'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold text-xs">
                {formatLocalizedNumber(pendingVerifications, locale)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isBn
                ? 'এনআইডি ও ডিগ্রি সনদের মুল কপি নিরীক্ষা ও প্ল্যাটফর্মে উন্মুক্তকরণ।'
                : 'Inspect NID documents and academic certificates for publication.'}
            </p>
          </div>

          <Link
            href={withLocale('/dashboard/admin/verification', locale)}
            className="mt-3.5 inline-flex items-center justify-between px-3 py-2 rounded-xl bg-primary-soft hover:bg-primary-soft/80 text-primary font-bold text-xs transition-colors"
          >
            <span>{isBn ? 'দস্তাবেজ পর্যালোচনা করুন' : 'Review Dossiers'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2. Replacement & Dispute Mediation */}
        <div className="p-4 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-warning" />
                {isBn ? 'রিপ্লেসমেন্ট ও বিরোধ' : 'Disputes & Replacements'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-warning-soft text-warning font-bold text-xs">
                {formatLocalizedNumber(activeReplacements, locale)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isBn
                ? '৩০ দিনের শিক্ষক প্রতিস্থাপন বা এসক্রো রিফান্ড আবেদন ট্রায়াজ।'
                : '30-day tutor replacement claims or escrow refund mediation.'}
            </p>
          </div>

          <Link
            href={withLocale('/dashboard/admin/disputes', locale)}
            className="mt-3.5 inline-flex items-center justify-between px-3 py-2 rounded-xl bg-warning-soft hover:bg-warning-soft/80 text-warning font-bold text-xs transition-colors"
          >
            <span>{isBn ? 'বিরোধ মীমাংসা করুন' : 'Mediate Cases'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3. Child Safeguarding Alerts */}
        <div className="p-4 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                {isBn ? 'শিশু সুরক্ষা রেড অ্যালার্ট' : 'Safeguarding Alerts'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                  openSafetyReports > 0
                    ? 'bg-destructive-soft text-destructive animate-pulse'
                    : 'bg-success-soft text-success'
                }`}
              >
                {openSafetyReports > 0
                  ? formatLocalizedNumber(openSafetyReports, locale)
                  : isBn
                    ? 'সব নিরাপদ ✓'
                    : 'Clear ✓'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isBn
                ? 'অপ্রীতিকর আচরণ বা যোগাযোগের অসঙ্গতির স্বয়ংক্রিয় ফ্ল্যাগিং নজরদারি।'
                : 'Automated flags on communication anomalies or misconduct reports.'}
            </p>
          </div>

          <Link
            href={withLocale('/safety-reports', locale)}
            className="mt-3.5 inline-flex items-center justify-between px-3 py-2 rounded-xl bg-destructive-soft hover:bg-destructive-soft/80 text-destructive font-bold text-xs transition-colors"
          >
            <span>{isBn ? 'সেফটি লগ পরীক্ষা' : 'Audit Safety Logs'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
