'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  PhoneCall,
  Clock,
  UserCheck,
  FileCheck,
  Headphones,
} from 'lucide-react';
import { type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface GuardianChildSafetyRadarProps {
  locale: Locale;
  childName?: string;
  tutorVerified?: boolean;
  lastSessionCheckIn?: string;
}

export function GuardianChildSafetyRadar({
  locale,
  childName = 'আপনার সন্তান',
  tutorVerified = true,
  lastSessionCheckIn,
}: GuardianChildSafetyRadarProps) {
  const isBn = locale === 'bn';
  const displayCheckIn =
    lastSessionCheckIn || (isBn ? 'কোনো সাম্প্রতিক ক্লাস রেকর্ড নেই' : 'No recent session check-in');

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between select-none"
      data-testid="guardian-child-safety-radar"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isBn ? 'শিশু সুরক্ষা ও নিরাপত্তা' : 'Child Safeguarding & Safety'}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                <UserCheck className="w-2.5 h-2.5" />
                <span>NID Verified</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'সেফগার্ড রেডার ও জরুরি সহায়তা' : 'Safety Radar & Direct Helplines'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/safety', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'নিরাপত্তা নীতিমালা' : 'Safety Rules'}</span>
        </Link>
      </div>

      {/* Safety Verification Badges */}
      <div className="my-3.5 flex flex-col gap-2.5">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {isBn ? '১০০% জাতীয় পরিচয়পত্র ও সনদ যাচাইকৃত' : '100% NID & Background Checked'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? 'গৃহশিক্ষকের জাতীয় পরিচয়পত্র ও বিশ্ববিদ্যালয় সনদ অনুমোদিত'
                  : 'NID and degree credentials verified by Ogroni Trust Desk'}
              </p>
            </div>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
            ✓ {isBn ? 'নিরাপদ' : 'Verified'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {isBn ? 'ক্লাস উপস্থিতি ও চেক-ইন লগ' : 'Class Attendance & Entry Log'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? `সর্বশেষ সেশন চেক-ইন: ${displayCheckIn}`
                  : `Last session check-in: ${displayCheckIn}`}
              </p>
            </div>
          </div>
          <span className="text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
            {lastSessionCheckIn ? (isBn ? 'ট্র্যাক হচ্ছে' : 'Logged') : '—'}
          </span>
        </div>
      </div>

      {/* 24/7 National Emergency & Safeguarding Hotlines */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-primary" />
          <span>
            {isBn ? 'জরুরি হেল্পলাইন নম্বর (টোল ফ্রি)' : 'Emergency Helplines (Toll-Free)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="tel:1098"
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-destructive-soft/40 hover:bg-destructive-soft border border-destructive/30 text-destructive-soft-foreground transition-colors"
          >
            <div className="h-7 w-7 rounded-md bg-destructive text-destructive-foreground flex items-center justify-center font-bold text-xs shrink-0">
              1098
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {isBn ? 'শিশু সহায়তা হেল্পলাইন' : 'Child Helpline'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isBn ? 'সরকারি ২৪/৭ সেবা' : 'Govt. 24/7 Toll-Free'}
              </p>
            </div>
          </a>

          <a
            href="tel:999"
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-warning-soft/40 hover:bg-warning-soft border border-warning/30 text-warning-soft-foreground transition-colors"
          >
            <div className="h-7 w-7 rounded-md bg-warning text-warning-foreground flex items-center justify-center font-bold text-xs shrink-0">
              999
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {isBn ? 'জাতীয় জরুরি সেবা' : 'National Emergency'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isBn ? 'পুলিশ / এম্বুলেন্স' : 'Police & Ambulance'}
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Footer support link */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground">
          {isBn ? 'অপ্রীতিকর আচরণ তাৎক্ষণিক রিপোর্ট করুন' : 'Report misconduct 24/7 anonymously'}
        </span>
        <Link
          href={withLocale('/safety', locale)}
          className="font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>{isBn ? 'সাপোর্ট ডেস্ক' : 'Support Desk'}</span>
        </Link>
      </div>
    </div>
  );
}
