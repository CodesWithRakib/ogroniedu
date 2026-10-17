'use client';

import React from 'react';
import { ShieldCheck, FileCheck2, Clock } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { AdminVerificationTab } from '../components/tabs/adminVerificationTab';

export function AdminVerificationPage({ locale }: { locale: Locale }) {
  const admin = useAdminDashboard(locale);

  const pendingCount = admin.pendingTutors.length;

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'শিক্ষক যাচাই' : 'Tutor Verification'}>
      <div className="space-y-6 py-6" data-testid="admin-verification-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {locale === 'bn'
                  ? 'শিক্ষক যাচাই ও সনদ পর্যালোচনা'
                  : 'Tutor Verification & Compliance'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-interactive/15 text-info-soft-foreground border border-info/40">
                {pendingCount} {locale === 'bn' ? 'অপেক্ষমান' : 'Pending'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {locale === 'bn'
                ? 'টিউটরদের এনআইডি, ডিগ্রি সনদ, ব্যাকগ্রাউন্ড ও শিক্ষাগত প্রমাণাদি নিরীক্ষা ও অনুমোদন'
                : 'Inspect submitted tutor NID, academic certificates, credentials and grant verified badge'}
            </p>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {locale === 'bn' ? 'অপেক্ষমান রিভিউ কিউ' : 'Pending Queue'}
              </p>
              <p className="text-2xl font-black text-info-soft-foreground mt-1 font-mono">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-interactive/10 border border-info/40 flex items-center justify-center text-info-soft-foreground">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {locale === 'bn' ? '৩-স্তর ভেরিফিকেশন' : '3-Tier Verification'}
              </p>
              <p className="text-sm font-semibold text-success-soft-foreground mt-1">
                {locale === 'bn' ? 'NID • ডিগ্রি • অভিজ্ঞতা' : 'NID • Degree • Experience'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center text-success-soft-foreground">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {locale === 'bn' ? 'অডিট ট্রেইল নিশ্চয়তা' : 'Audit Trail Standard'}
              </p>
              <p className="text-sm font-semibold text-primary-soft-foreground mt-1">
                {locale === 'bn' ? 'রিজন কোড ও অভ্যন্তরীণ নোট' : 'Reason Codes & Internal Notes'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center text-primary-soft-foreground">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Verification Queue Card */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4">
          <AdminVerificationTab />
        </div>
      </div>
    </AdminLayout>
  );
}
