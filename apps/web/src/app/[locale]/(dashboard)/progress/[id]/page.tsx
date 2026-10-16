'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  FileCheck2,
  Percent,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { useGetProgressReportByIdQuery, type ProgressReportRecord } from '@/store/services/learning-api';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface ProgressReportParams {
  locale: string;
  id: string;
}

export default function ProgressReportDetailRoute({
  params,
}: {
  params: Promise<ProgressReportParams>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const reportId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <ProgressReportDetailPage locale={locale} reportId={reportId} />
    </RequireAuth>
  );
}

function ProgressReportDetailPage({
  locale,
  reportId,
}: {
  locale: Locale;
  reportId: string;
}) {
  const { data: reportData, isLoading, error } = useGetProgressReportByIdQuery(reportId);

  const report = React.useMemo<ProgressReportRecord | null>(() => {
    if (!reportData) return null;
    try {
      return parseItem<ProgressReportRecord>(reportData);
    } catch {
      return null;
    }
  }, [reportData]);

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-300">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'অগ্রগতি রিপোর্ট পাওয়া যায়নি' : 'Progress Report Not Found'}
          </h2>
          <p className="text-xs text-rose-200/80 mb-4">
            {locale === 'bn'
              ? 'রিপোর্টের আইডি সঠিক নয় অথবা আপনি এটি দেখার অনুমোদিত নন।'
              : 'The requested report could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'bn' ? 'লার্নিং সেন্টারে ফিরুন' : 'Back to Learning'}
          </Link>
        </div>
      </div>
    );
  }

  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={withLocale('/learning', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          data-testid="back-to-learning-from-report-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'লার্নিং প্রগ্রেস পোর্টালে ফিরুন' : 'Back to Learning Portal'}
        </Link>
      </div>

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-[#051821] border border-indigo-500/20 p-8 text-white shadow-2xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-medium text-indigo-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'মাসিক অগ্রগতি মূল্যায়ন' : 'Periodic Progress Evaluation'}</span>
          </span>
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {locale === 'bn' ? 'প্রকাশিত' : 'Published'}
          </Badge>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          {locale === 'bn' ? 'শিক্ষার্থীর পূর্ণাঙ্গ অগ্রগতি রিপোর্ট' : 'Comprehensive Learner Progress Report'}
        </h1>

        <div className="flex items-center gap-2 text-xs text-indigo-200/80">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {locale === 'bn' ? 'মূল্যায়ন সময়কাল:' : 'Evaluation Period:'}{' '}
            <strong className="text-white">
              {new Date(report.periodStart).toLocaleDateString(dateLocale)} -{' '}
              {new Date(report.periodEnd).toLocaleDateString(dateLocale)}
            </strong>
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{locale === 'bn' ? 'উপস্থিতির হার' : 'Attendance Rate'}</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatLocalizedNumber(report.attendanceRate, locale)}%
          </div>
        </Card>

        <Card className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{locale === 'bn' ? 'সম্পন্ন বাড়ির কাজ' : 'Assignments Done'}</span>
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {formatLocalizedNumber(report.assignmentsCompleted, locale)}
          </div>
        </Card>

        <Card className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{locale === 'bn' ? 'গড় স্কোর' : 'Average Score'}</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {report.averageScore !== null && report.averageScore !== undefined
              ? `${formatLocalizedNumber(report.averageScore, locale)}%`
              : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Report Body Details */}
      <div className="space-y-4">
        {/* Observable Progress */}
        <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-md space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{locale === 'bn' ? 'দৃশ্যমান অগ্রগতি ও অর্জন' : 'Observable Progress & Achievements'}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {report.observableProgress}
          </p>
        </Card>

        {/* Areas for Growth */}
        {report.areasForGrowth && (
          <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-md space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>{locale === 'bn' ? 'উন্নতির জায়গা ও ভবিষ্যৎ লক্ষ্য' : 'Areas for Growth & Recommendations'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {report.areasForGrowth}
            </p>
          </Card>
        )}

        {/* Tutor Remarks */}
        {report.tutorRemarks && (
          <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-md space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
              <Award className="w-4 h-4" />
              <span>{locale === 'bn' ? 'শিক্ষকের সামগ্রিক পর্যালোচনা' : 'Tutor Overall Assessment'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              "{report.tutorRemarks}"
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
