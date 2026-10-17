'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Check, RefreshCw, Lock, Key } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export function AdminSettingsSecurityPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [sessionTimeout, setSessionTimeout] = useState<number>(60);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(5);
  const [enforce2FA, setEnforce2FA] = useState<boolean>(true);
  const [strictIPCheck, setStrictIPCheck] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'নিরাপত্তা ও অ্যাক্সেস পলিসি' : 'Security & Access Control'}
    >
      <div className="space-y-6 py-6" data-testid="admin-settings-security-page">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'নিরাপত্তা ও অ্যাক্সেস পলিসি' : 'Security & Access Control'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-warning-soft text-warning-soft-foreground border border-warning/30">
                SECURITY RULES
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'সেশন টাইমআউট সীমা, ব্রুট-ফোর্স লকআউট, ২-ফ্যাক্টর নিরাপত্তা ও অ্যাডমিন রেট লিমিটিং'
                : 'Session duration limits, brute-force lockouts, mandatory 2FA, and access rules'}
            </p>
          </div>

          <Button onClick={handleSave} className="flex items-center gap-2">
            {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>{saved ? (isBn ? 'সংরক্ষিত হয়েছে!' : 'Saved!') : isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </Button>
        </div>

        {saved && (
          <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
            <AlertDescription>
              {isBn
                ? 'নিরাপত্তা পলিসি সফলভাবে আপডেট করা হয়েছে।'
                : 'Security access thresholds have been successfully updated.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border/70 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'সুপার অ্যাডমিনদের জন্য ২-ফ্যাক্টর (2FA)' : 'Mandatory 2FA for Super Admins'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBn ? 'সকল প্রশাসনিক অ্যাকাউন্টের জন্য ওটিপি বাধ্যতামূলক করা' : 'Enforce TOTP authenticator or SMS OTP for admin roles'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnforce2FA(!enforce2FA)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${enforce2FA ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enforce2FA ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'স্ট্রিক্ট আইপি লোকেশন ভ্যালিডেশন' : 'Strict IP Whitelisting for Admins'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBn ? 'অজ্ঞাত আইপি থেকে অ্যাডমিন কনসোল অ্যাক্সেস ব্লক করা' : 'Block admin sign-ins outside configured office IP subnets'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStrictIPCheck(!strictIPCheck)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${strictIPCheck ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${strictIPCheck ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-3xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'অ্যাডমিন সেশন টাইমআউট (মিনিট)' : 'Admin Session Expiry Window (Minutes)'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isBn ? 'নিষ্ক্রিয় থাকার পর অটো-লগআউট সময়সীমা' : 'Idle duration before administrator session token expires'}
              </p>
            </div>
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-mono font-bold"
            />
          </div>

          <div className="bg-card border border-border/70 rounded-3xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'সর্বোচ্চ ব্যর্থ লগইন প্রচেষ্টা' : 'Max Failed Login Attempts'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isBn ? 'অ্যাকাউন্ট সাময়িক লকআউটের পূর্বের ব্যর্থ পাসওয়ার্ড সীমা' : 'Lockout trigger count before enforcing 15-minute cool-off'}
              </p>
            </div>
            <input
              type="number"
              min="3"
              max="10"
              step="1"
              value={maxFailedAttempts}
              onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-mono font-bold"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
