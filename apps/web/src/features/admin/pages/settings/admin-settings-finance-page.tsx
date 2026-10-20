'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Button, Alert, AlertDescription, LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import { formatBDTMinor } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import {
  useCreateCommissionPolicyMutation,
  useListCommissionPoliciesQuery,
} from '@/store/services/payments-api';

function parseBdtToMinor(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function AdminSettingsFinancePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const policiesQuery = useListCommissionPoliciesQuery();
  const [createPolicy, createState] = useCreateCommissionPolicyMutation();

  const activePolicy = policiesQuery.data?.data?.find((policy) => policy.isActive) ?? null;

  const [platformFee, setPlatformFee] = useState(8);
  const [minPayout, setMinPayout] = useState('500');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activePolicy) return;
    setPlatformFee(activePolicy.platformFeeBps / 100);
    setMinPayout((Number(activePolicy.minPayoutMinor) / 100).toFixed(2));
  }, [activePolicy]);

  async function handleSave() {
    setError(null);
    setSaved(false);
    const minMinor = parseBdtToMinor(minPayout);
    if (!Number.isFinite(platformFee) || platformFee < 0 || platformFee > 30 || minMinor === null) {
      setError(
        isBn
          ? 'কমিশন ০–৩০% এবং ন্যূনতম পে-আউট সঠিক টাকার অঙ্কে দিন।'
          : 'Enter a commission between 0–30% and a valid minimum payout amount.',
      );
      return;
    }

    try {
      await createPolicy({
        platformFeeBps: Math.round(platformFee * 100),
        minPayoutMinor: minMinor,
        notes: notes.trim() || undefined,
      }).unwrap();
      setNotes('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'data' in err
          ? ((err as { data?: { error?: { message?: string } } }).data?.error?.message ?? null)
          : null;
      setError(message ?? (isBn ? 'পলিসি সংরক্ষণ করা যায়নি।' : 'Could not save the policy.'));
    }
  }

  return (
    <AdminLayout locale={locale}>
      <div className="space-y-6 py-6" data-testid="admin-settings-finance-page">
        <div>
          <Link
            href={withLocale('/dashboard/admin/settings', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← প্ল্যাটফর্ম সেটিংস-এ ফিরে যান' : '← Back to Platform Settings'}</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'আর্থিক ও কমিশন পলিসি' : 'Financial & Commission Policy'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-success-soft text-success-soft-foreground border border-success/30">
                {isBn ? 'সংস্করণযুক্ত' : 'VERSIONED'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'সক্রিয় কমিশন হার ও ন্যূনতম পে-আউট পরিবর্তন করুন। প্রতিটি পরিবর্তন নতুন সংস্করণ হিসেবে সংরক্ষিত হয়।'
                : 'Change the active commission rate and minimum payout. Every change is stored as a new immutable version.'}
            </p>
          </div>

          <Button onClick={handleSave} disabled={createState.isLoading || policiesQuery.isLoading}>
            {createState.isLoading ? (
              <LoadingSpinner />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>
              {createState.isLoading
                ? isBn
                  ? 'সংরক্ষণ হচ্ছে…'
                  : 'Saving…'
                : saved
                  ? isBn
                    ? 'সংরক্ষিত হয়েছে!'
                    : 'Saved!'
                  : isBn
                    ? 'নতুন সংস্করণ সংরক্ষণ করুন'
                    : 'Save New Version'}
            </span>
          </Button>
        </div>

        {saved && (
          <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
            <AlertDescription>
              {isBn
                ? 'নতুন কমিশন পলিসি সংস্করণ সক্রিয় হয়েছে। পুরনো অর্ডার নিজের স্ন্যাপশটেড হার ধরে রাখবে।'
                : 'A new commission policy version is active. Existing orders keep their snapshotted rate.'}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {policiesQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {isBn ? 'পলিসি লোড করা যায়নি।' : 'Could not load the commission policy.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      ? 'প্রতিটি নিষ্পত্তিকৃত সেশন থেকে কর্তনকৃত শতাংশ (সর্বোচ্চ ৩০%)'
                      : 'Percentage deducted from each settled session (maximum 30%)'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{isBn ? 'কমিশন রেট' : 'Commission Rate'}</span>
                  <span className="font-mono text-primary font-bold">
                    {platformFee.toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.25"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                  aria-label={isBn ? 'কমিশন রেট' : 'Commission rate'}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>0%</span>
                  <span>15%</span>
                  <span>30%</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success-soft text-success border border-success/30 flex items-center justify-center font-bold">
                  ৳
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isBn ? 'সর্বনিম্ন পে-আউট (টাকা)' : 'Minimum Payout (BDT)'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isBn
                      ? 'শিক্ষকের পে-আউট অনুরোধের ন্যূনতম পরিমাণ'
                      : 'Minimum amount a tutor can request for payout'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={minPayout}
                  onChange={(e) => setMinPayout(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-mono font-bold"
                  aria-label={isBn ? 'সর্বনিম্ন পে-আউট' : 'Minimum payout'}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-xs md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info-soft text-info border border-info/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isBn ? 'পরিবর্তনের নোট (ঐচ্ছিক)' : 'Change Note (optional)'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isBn
                      ? 'কেন এই হার পরিবর্তন করা হচ্ছে তা অডিট ট্রেইলের জন্য লিখুন।'
                      : 'Record why the rate changed for the audit trail.'}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground text-sm"
                placeholder={
                  isBn
                    ? 'যেমন: ত্রৈমাসিক প্ল্যাটফর্ম পলিসি পর্যালোচনা'
                    : 'e.g. quarterly platform policy review'
                }
              />
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-xs md:col-span-2">
              <h3 className="text-sm font-bold text-foreground">
                {isBn ? 'সক্রিয় সংস্করণ' : 'Active Version'}
              </h3>
              {policiesQuery.isLoading ? (
                <LoadingSpinner />
              ) : activePolicy ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">{isBn ? 'সংস্করণ' : 'Version'}</p>
                    <p className="font-bold">v{activePolicy.version}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isBn ? 'কমিশন' : 'Commission'}</p>
                    <p className="font-bold">{(activePolicy.platformFeeBps / 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {isBn ? 'ন্যূনতম পে-আউট' : 'Min payout'}
                    </p>
                    <p className="font-bold">
                      {formatBDTMinor(activePolicy.minPayoutMinor, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isBn ? 'কার্যকর' : 'Effective from'}</p>
                    <p className="font-bold">
                      {new Date(activePolicy.effectiveFrom).toLocaleDateString(
                        locale === 'bn' ? 'bn-BD' : 'en-GB',
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isBn ? 'কোনো সক্রিয় পলিসি নেই।' : 'No active policy.'}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? 'এসক্রো হোল্ড ও ডিসপিউট উইন্ডো পণ্য নীতিমালায় নির্ধারিত; এখানে পরিবর্তনযোগ্য নয়।'
                  : 'Escrow-hold and dispute windows are fixed by product policy and are not editable here.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
