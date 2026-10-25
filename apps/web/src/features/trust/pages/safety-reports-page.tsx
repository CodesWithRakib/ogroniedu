'use client';

import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  PhoneCall,
  Lock,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useGetSafetyReportsQuery } from '@/store/services/trust-api';
import { SafetyReportModal } from '@/features/trust/components/safetyReportModal';
import { EmergencySosModal } from '@/features/trust/components/EmergencySosModal';
import { formatDateTime } from '@/lib/format';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';

export interface SafetyReportsPageProps {
  locale: Locale;
}

export function SafetyReportsPageView({ locale }: SafetyReportsPageProps) {
  const isBn = locale === 'bn';

  const { data: reportsData, isLoading, refetch } = useGetSafetyReportsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const rawReports = Array.isArray(reportsData)
    ? reportsData
    : reportsData &&
        typeof reportsData === 'object' &&
        'data' in reportsData &&
        Array.isArray((reportsData as { data: unknown[] }).data)
      ? (reportsData as { data: typeof reportsData }).data
      : [];

  const reports = useMemo(() => (Array.isArray(rawReports) ? rawReports : []), [rawReports]);

  const metrics = useMemo(() => {
    const total = reports.length;
    const criticalOrHigh = reports.filter(
      (r) => r.severity === 'critical' || r.severity === 'high'
    ).length;
    const protectiveHolds = reports.filter(
      (r) => r.status === 'action_taken' || r.status === 'escalated'
    ).length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { total, criticalOrHigh, protectiveHolds, resolved };
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (filterCategory === 'all') return reports;
    return reports.filter((r) => r.category === filterCategory);
  }, [reports, filterCategory]);

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'শিশু সুরক্ষা ও ট্রাস্ট হাব' : 'Child Safety & Trust Hub'}
      subtitle={
        isBn
          ? 'নিরাপদ শিখন পরিবেশ নিশ্চিতকরণ: অভিযোগ পর্যবেক্ষণ, জরুরি রিপোর্ট ও সার্বক্ষণিক সহায়তা'
          : 'Zero-tolerance safety oversight, incident tracking and 24/7 child safeguarding'
      }
      role="guardian"
      actions={
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-bold shadow-xs bg-rose-600 hover:bg-rose-700 text-white rounded-full px-4"
          id="btn-file-new-safety-report"
          data-testid="file-safety-incident-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isBn ? 'নতুন অভিযোগ / সতর্কতা দায়ের' : 'File Safety Incident'}</span>
        </Button>
      }
    >
      <div className="w-full space-y-6">
        {/* 1. URGENT 24/7 EMERGENCY BANNER & HOTLINE STRIP */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="safety-hotlines-banner">
          {/* Safeguarding Commitment */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl border border-rose-200 bg-rose-50/60 text-slate-900 flex flex-col justify-between gap-4 shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {isBn ? '২৪/৭ জরুরি নিরাপত্তা ও শিশু সুরক্ষা নীতি' : 'Zero-Tolerance Safeguarding Protocol'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {isBn
                  ? 'শিক্ষার্থীর সার্বিক নিরাপত্তা আমাদের প্ল্যাটফর্মের সর্বোচ্চ দায়িত্ব'
                  : 'Student Safety is Our Highest Commitment'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {isBn
                  ? 'অনুপযুক্ত আচরণ, মানসিক বা শারীরিক আঘাত, এবং প্ল্যাটফর্মের বাইরে অবৈধ লেনদেন দাবির ক্ষেত্রে তাৎক্ষণিক অডিট, প্রোটেক্টিভ হোল্ড ও অ্যাকাউন্ট স্থগিতাদেশ কার্যকর করা হয়।'
                  : 'All child safety and fraud incidents are automatically routed to our priority triage queue. In critical situations, contact law enforcement or the emergency hotline.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-rose-200/80">
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs px-4 py-2"
              >
                {isBn ? 'জরুরি রিপোর্ট ফর্ম' : 'File Emergency Incident'}
              </Button>
              <button
                type="button"
                onClick={() => setIsSosOpen(true)}
                className="text-xs font-bold text-rose-800 hover:text-rose-900 bg-rose-100 hover:bg-rose-200/80 border border-rose-300 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                data-testid="open-sos-dialog-btn"
              >
                <PhoneCall className="w-3.5 h-3.5 text-rose-700" />
                <span>{isBn ? 'সব হটলাইন ও দ্রুত ডায়াল' : 'View All SOS Fast-Dial'}</span>
              </button>
              <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 ml-auto">
                <Lock className="w-3 h-3 text-emerald-600" />
                {isBn ? 'গোপনীয়তা ও এনক্রিপশন সক্রিয়' : 'Confidential & Encrypted'}
              </span>
            </div>
          </div>

          {/* Quick Helpline Strip */}
          <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between gap-3 shadow-2xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              {isBn ? 'জরুরি হেল্পলাইন নম্বরসমূহ' : 'Emergency Contacts'}
            </span>
            <div className="space-y-2">
              <a
                href="tel:1098"
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-slate-900 flex items-center justify-between hover:bg-rose-100 transition-colors"
                title="Call 1098"
              >
                <div>
                  <span className="text-[10px] font-bold text-rose-800 block">
                    {isBn ? 'জাতীয় শিশু হেল্পলাইন (টোল-ফ্রি)' : 'National Child Helpline'}
                  </span>
                  <span className="text-xl font-black text-slate-900 tracking-wider font-mono">১০৯৮</span>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-white border border-rose-200 px-2.5 py-1 rounded-xl">
                  {isBn ? 'ডায়াল' : 'Call'}
                </span>
              </a>

              <a
                href="tel:999"
                className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-slate-900 flex items-center justify-between hover:bg-amber-100 transition-colors"
                title="Call 999"
              >
                <div>
                  <span className="text-[10px] font-bold text-amber-800 block">
                    {isBn ? 'জরুরি পুলিশ ও উদ্ধার' : 'Police & Emergency'}
                  </span>
                  <span className="text-xl font-black text-slate-900 tracking-wider font-mono">৯৯৯</span>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-xl">
                  {isBn ? 'ডায়াল' : 'Call'}
                </span>
              </a>

              <a
                href="tel:+8809612345678"
                className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-slate-900 flex items-center justify-between hover:bg-blue-100 transition-colors"
                title="Call Security Desk"
              >
                <div>
                  <span className="text-[10px] font-bold text-blue-800 block">
                    {isBn ? 'অগ্রণী এডু সিকিউরিটি ডেস্ক' : 'OgroniEdu Triage'}
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono">+৮৮০ ৯৬১২-৩৪৫৬৭৮</span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-xl">
                  {isBn ? 'ডায়াল' : 'Call'}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* 2. KPI METRIC SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isBn ? 'মোট অভিযোগ' : 'Total Reports'}
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">
                  {formatLocalizedNumber(metrics.total, locale)} {isBn ? 'টি' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isBn ? 'উচ্চ অগ্রাধিকার' : 'Critical / High'}
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">
                  {formatLocalizedNumber(metrics.criticalOrHigh, locale)} {isBn ? 'টি' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isBn ? 'সুরক্ষামূলক স্থগিতাদেশ' : 'Protective Holds'}
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">
                  {formatLocalizedNumber(metrics.protectiveHolds, locale)} {isBn ? 'টি' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isBn ? 'নিষ্পত্তি সম্পন্ন' : 'Resolved'}
                </p>
                <p className="text-xl font-black text-slate-900 tabular-nums">
                  {formatLocalizedNumber(metrics.resolved, locale)} {isBn ? 'টি' : ''}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. CATEGORY FILTERS & INCIDENTS LIST */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">
                {isBn ? 'ক্যাটাগরি ফিল্টার:' : 'Filter Incidents:'}
              </span>
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
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    data-testid={`filter-cat-${c.id}`}
                  >
                    {isBn ? c.bn : c.en}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {isBn
                ? `প্রদর্শিত হচ্ছে ${formatLocalizedNumber(filteredReports.length, locale)}টি রেকর্ড`
                : `Showing ${filteredReports.length} records`}
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">
              {isBn ? 'লোড হচ্ছে...' : 'Loading safety reports...'}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card className="py-16 text-center rounded-3xl border border-slate-200 bg-white">
              <CardContent className="space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900">
                    {isBn ? 'কোনো নিরাপত্তা অভিযোগ বা ঘটনা নেই' : 'No Incident Reports on Record'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {isBn
                      ? 'আপনার সকল সেশন ও টিউটরিং নিরাপদভাবে পরিচালিত হচ্ছে। কোনো সন্দেহজনক কার্যকলাপ চোখে পড়লে অবিলম্বে রিপোর্ট করুন।'
                      : 'Your learning sessions are secure. Report any policy violation or concern.'}
                  </p>
                </div>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isBn ? 'নতুন রিপোর্ট দাখিল করুন' : 'File Incident Report'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="safety-reports-list">
              {filteredReports.map((report) => (
                <Card
                  key={report.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3 shadow-2xs hover:border-rose-400/80 transition-all text-left"
                  data-testid={`safety-report-card-${report.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{report.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          report.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : report.severity === 'high'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : report.severity === 'medium'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {report.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                        {report.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          report.status === 'action_taken' || report.status === 'escalated'
                            ? 'bg-rose-600 text-white'
                            : report.status === 'resolved' || report.status === 'closed'
                              ? 'bg-emerald-600 text-white'
                              : report.status === 'under_investigation' || report.status === 'under_review' || report.status === 'triaged'
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-600 text-white'
                        }`}
                      >
                        {report.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-slate-500 text-[11px] font-medium">
                        {formatDateTime(String(report.createdAt), locale)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                    {report.description}
                  </p>

                  {report.resolutionNotes && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 block">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {isBn ? 'নিরাপত্তা টিমের তদন্ত ও নিষ্পত্তি নোট:' : 'Investigation Outcome:'}
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium">{report.resolutionNotes}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal dialogs */}
        <SafetyReportModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            void refetch();
          }}
          locale={locale}
        />

        <EmergencySosModal
          isOpen={isSosOpen}
          onClose={() => setIsSosOpen(false)}
          onOpenFileReport={() => setIsModalOpen(true)}
          locale={locale}
        />
      </div>
    </DashboardShell>
  );
}
