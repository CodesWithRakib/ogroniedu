'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Clock,
  PhoneCall,
  CheckCircle2,
  Lock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { useGetSafetyReportsQuery } from '@/store/services/trust-api';
import { SafetyReportModal } from '@/features/trust/components/safetyReportModal';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function SafetyReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';

  const { data: reportsData, isLoading, refetch } = useGetSafetyReportsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const rawReports = Array.isArray(reportsData)
    ? reportsData
    : (reportsData && typeof reportsData === 'object' && 'data' in reportsData && Array.isArray((reportsData as { data: unknown[] }).data))
      ? (reportsData as { data: typeof reportsData }).data
      : [];

  const reports = Array.isArray(rawReports) ? rawReports : [];
  const filteredReports = filterCategory === 'all'
    ? reports
    : reports.filter((r) => r.category === filterCategory);

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'শিশু সুরক্ষা ও ট্রাস্ট হাব' : 'Child Safety & Trust Hub'}
      subtitle={
        isBn
          ? 'নিরাপদ শিখন পরিবেশ নিশ্চিতকরণ: অভিযোগ পর্যবেক্ষণ, জরুরি রিপোর্ট ও সহায়তা'
          : 'Zero-tolerance safety oversight, incident tracking and 24/7 child safeguarding'
      }
      role="guardian"
      actions={
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-bold shadow-xs bg-red-600 hover:bg-red-700 text-white rounded-full px-4"
          id="btn-file-new-safety-report"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isBn ? 'নতুন অভিযোগ / সতর্কতা দায়ের' : 'File Safety Incident'}</span>
        </Button>
      }
    >
      {/* 1. URGENT 24/7 EMERGENCY BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="safety-hotlines-banner">
        <div className="md:col-span-2 p-5 rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-950/60 to-slate-950 text-slate-100 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">
                {isBn ? '২৪/৭ জরুরি নিরাপত্তা নীতি' : 'Zero-Tolerance Safeguarding Protocol'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isBn ? 'শিক্ষার্থীর নিরাপত্তা আমাদের প্ল্যাটফর্মের সর্বোচ্চ দায়িত্ব' : 'Student Safety is Our Highest Commitment'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isBn
                ? 'অনুপযুক্ত আচরণ, মানসিক বা শারীরিক আঘাত, এবং প্ল্যাটফর্মের বাইরে অবৈধ লেনদেন দাবির ক্ষেত্রে তাৎক্ষণিক অডিট ও অ্যাকাউন্ট স্থগিতাদেশ কার্যকর করা হয়।'
                : 'All child safety and fraud incidents are automatically routed to our priority triage queue. In critical situations, contact law enforcement or the emergency hotline.'}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsModalOpen(true)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              {isBn ? 'জরুরি রিপোর্ট ফর্ম' : 'File Emergency Incident'}
            </Button>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              {isBn ? 'গোপনীয়তা ও ডেটা এনক্রিপশন সক্রিয়' : 'Confidential & End-to-End Encrypted'}
            </span>
          </div>
        </div>

        {/* National Helpline */}
        <div className="p-5 rounded-3xl border border-border bg-card flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'জরুরি হেল্পলাইন নম্বর' : 'Emergency Contacts'}
            </span>
            <div className="mt-2 space-y-2">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                <span className="text-[10px] font-bold block">{isBn ? 'জাতীয় শিশু হেল্পলাইন' : 'National Child Helpline'}</span>
                <span className="text-xl font-black">১০৯৮</span>
              </div>
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <span className="text-[10px] font-bold block">{isBn ? 'অগ্রণী এডু সিকিউরিটি ডেস্ক' : 'OgroniEdu Triage'}</span>
                <span className="text-base font-bold">+৮৮০ ৯৬১২-৩৪৫৬৭৮</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & INCIDENT LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">{isBn ? 'ক্যাটাগরি ফিল্টার:' : 'Filter Incidents:'}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', bn: 'সকল', en: 'All' },
                { id: 'child_safety', bn: 'শিশু সুরক্ষা', en: 'Child Safety' },
                { id: 'harassment', bn: 'হয়রানি', en: 'Harassment' },
                { id: 'off_platform_payment', bn: 'অবৈধ পেমেন্ট দাবি', en: 'Off-Platform Fee' },
                { id: 'fraud_billing', bn: 'উপস্থিতি জালিয়াতি', en: 'Fraud' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCategory(c.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterCategory === c.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isBn ? c.bn : c.en}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {isBn ? `মোট রেকর্ড: ${filteredReports.length}` : `Total Reports: ${filteredReports.length}`}
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{isBn ? 'লোড হচ্ছে...' : 'Loading safety reports...'}</div>
        ) : filteredReports.length === 0 ? (
          <Card className="py-16 text-center rounded-3xl">
            <CardContent className="space-y-3">
              <ShieldCheck className="w-14 h-14 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-foreground">
                {isBn ? 'কোনো নিরাপত্তা অভিযোগ বা ঘটনা নেই' : 'No Incident Reports on Record'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isBn
                  ? 'আপনার সকল সেশন ও টিউটরিং নিরাপদভাবে পরিচালিত হচ্ছে। কোনো সন্দেহজনক কার্যকলাপ চোখে পড়লে সঙ্গে সঙ্গে রিপোর্ট করুন।'
                  : 'Your learning sessions are secure. Report any policy violation or concern.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-xs border-border"
              >
                {isBn ? 'রিপোর্ট দায়ের করুন' : 'File Incident Report'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="safety-reports-list">
            {filteredReports.map((report) => (
              <Card key={report.id} className="rounded-2xl border-border bg-card p-5 space-y-3 hover:border-red-500/40 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">#{report.id.slice(0, 8)}</span>
                    <Badge variant={report.severity === 'critical' ? 'destructive' : report.severity === 'high' ? 'warning' : 'outline'}>
                      {report.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize border-border">
                      {report.category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={report.status === 'action_taken' ? 'success' : report.status === 'escalated' ? 'destructive' : 'warning'}>
                      {report.status}
                    </Badge>
                    <span className="text-muted-foreground text-[11px]">
                      {formatDateTime(String(report.createdAt), locale)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed">{report.description}</p>

                {report.resolutionNotes && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="font-bold text-emerald-400 block">{isBn ? 'নিরাপত্তা টিমের নিষ্পত্তি নোট:' : 'Investigation Outcome:'}</span>
                    <p>{report.resolutionNotes}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <SafetyReportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refetch();
        }}
        locale={locale}
      />
    </DashboardShell>
  );
}
