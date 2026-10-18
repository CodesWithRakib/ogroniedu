'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export function AdminSettingsFinancePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [platformFee, setPlatformFee] = useState<number>(10);
  const [escrowHoldDays, setEscrowHoldDays] = useState<number>(7);
  const [minPayout, setMinPayout] = useState<number>(500);
  const [refundWindowDays, setRefundWindowDays] = useState<number>(3);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout
      locale={locale}
    >
      <div className="space-y-6 py-6" data-testid="admin-settings-finance-page">
        {/* Back Link to Hub (Image 2 Pattern) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/settings', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← প্ল্যাটফর্ম সেটিংস-এ ফিরে যান' : '← Back to Platform Settings'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'আর্থিক ও কমিশন পলিসি' : 'Financial & Commission Policy'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-success-soft text-success-soft-foreground border border-success/30">
                FINANCE POLICY
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'প্ল্যাটফর্ম ফি, এসক্রো নিরাপত্তা ও হোল্ড সময়সীমা, ন্যূনতম উত্তোলন থ্রেশহোল্ড নির্ধারণ'
                : 'Manage tuition booking platform fees, escrow retention windows, and payout thresholds'}
            </p>
          </div>

          <Button onClick={handleSave} className="flex items-center gap-2">
            {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>
              {saved
                ? isBn
                  ? 'সংরক্ষিত হয়েছে!'
                  : 'Saved!'
                : isBn
                  ? 'পরিবর্তন সংরক্ষণ করুন'
                  : 'Save Changes'}
            </span>
          </Button>
        </div>

        {saved && (
          <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
            <AlertDescription>
              {isBn
                ? 'আর্থিক পলিসি সফলভাবে আপডেট করা হয়েছে।'
                : 'Financial and commission policies have been successfully saved.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Platform Fee */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                %
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'প্ল্যাটফর্ম সার্ভিস কমিশন (%)' : 'Platform Service Fee (%)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'প্রতিটি সফল টিউশন সেশন থেকে কর্তনকৃত শতাংশ'
                    : 'Percentage deducted from successful completed tuition bookings'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{isBn ? 'কমিশন রেট' : 'Commission Rate'}</span>
                <span className="font-mono text-primary font-bold">{platformFee}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={platformFee}
                onChange={(e) => setPlatformFee(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>0% (Free)</span>
                <span>15%</span>
                <span>30% (Max)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Escrow Hold Duration */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info-soft text-info border border-info/30 flex items-center justify-center font-bold">
                ⏳
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'এসক্রো হোল্ডিং সময়সীমা (দিন)' : 'Escrow Holding Duration (Days)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'টিউশন সমাপ্তির পর তহবিল সুরক্ষিত রাখার সময়'
                    : 'Holding period before tuition payment is released to tutor balance'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{isBn ? 'হোল্ড সময়সীমা' : 'Hold Window'}</span>
                <span className="font-mono text-info font-bold">
                  {escrowHoldDays} {isBn ? 'দিন' : 'Days'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                step="1"
                value={escrowHoldDays}
                onChange={(e) => setEscrowHoldDays(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>1 {isBn ? 'দিন' : 'Day'}</span>
                <span>7 {isBn ? 'দিন' : 'Days'}</span>
                <span>14 {isBn ? 'দিন' : 'Days'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Minimum Payout Threshold */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-soft text-success border border-success/30 flex items-center justify-center font-bold">
                ৳
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'সর্বনিম্ন উইথড্রয়াল সীমা (টাকা)' : 'Minimum Payout Threshold (BDT)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'শিক্ষকের ব্যাংক বা বিকাশ অ্যাকাউন্টে ন্যূনতম উত্তোলনের পরিমাণ'
                    : 'Minimum balance required for tutor to request bank or bKash payout'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <input
                type="number"
                min="100"
                max="5000"
                step="50"
                value={minPayout}
                onChange={(e) => setMinPayout(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-mono font-bold"
              />
            </div>
          </div>

          {/* Card 4: Refund Dispute Window */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning border border-warning/30 flex items-center justify-center font-bold">
                🛡️
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'ডিসপিউট ও রিফান্ড উইন্ডো (দিন)' : 'Dispute & Refund Window (Days)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'অভিভাবক বা শিক্ষার্থীর ডিসপিউট তোলার সর্বোচ্চ সময়'
                    : 'Maximum allowable days after session completion to file a dispute'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <input
                type="number"
                min="1"
                max="7"
                step="1"
                value={refundWindowDays}
                onChange={(e) => setRefundWindowDays(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
