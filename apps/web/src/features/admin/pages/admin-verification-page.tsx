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
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-verification-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {locale === 'bn'
                  ? 'শিক্ষক যাচাই ও সনদ পর্যালোচনা'
                  : 'Tutor Verification & Compliance'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-warning-soft text-warning border border-warning/30">
                {pendingCount} {locale === 'bn' ? 'অপেক্ষমান' : 'Pending'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5 font-medium">
              {locale === 'bn'
                ? 'টিউটরদের এনআইডি, ডিগ্রি সনদ, ব্যাকগ্রাউন্ড ও শিক্ষাগত প্রমাণাদি নিরীক্ষা ও অনুমোদন'
                : 'Inspect submitted tutor NID, academic certificates, credentials and grant verified badge'}
            </p>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {locale === 'bn' ? 'অপেক্ষমান রিভিউ কিউ' : 'Pending Queue'}
              </p>
              <p className="text-2xl font-black text-foreground mt-1 font-mono">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-warning-soft border border-warning/30 flex items-center justify-center text-warning">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {locale === 'bn' ? '৩-স্তর ভেরিফিকেশন' : '3-Tier Verification'}
              </p>
              <p className="text-sm font-extrabold text-success mt-1">
                {locale === 'bn' ? 'NID • ডিগ্রি • অভিজ্ঞতা' : 'NID • Degree • Experience'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success-soft border border-success/30 flex items-center justify-center text-success">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {locale === 'bn' ? 'অডিট ট্রেইল নিশ্চয়তা' : 'Audit Trail Standard'}
              </p>
              <p className="text-sm font-extrabold text-primary mt-1">
                {locale === 'bn' ? 'রিজন কোড ও অভ্যন্তরীণ নোট' : 'Reason Codes & Internal Notes'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-soft border border-primary/30 flex items-center justify-center text-primary">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Verification Queue Card */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
          <AdminVerificationTab />
        </div>
      </div>
    </AdminLayout>
  );
}
