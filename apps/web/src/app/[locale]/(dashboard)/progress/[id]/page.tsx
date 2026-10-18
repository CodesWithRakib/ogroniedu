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
import { Card, Badge, LoadingSpinner } from '@/components/ui';
import {
  useGetProgressReportByIdQuery,
  type ProgressReportRecord,
} from '@/store/services/learning-api';
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

function ProgressReportDetailPage({ locale, reportId }: { locale: Locale; reportId: string }) {
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
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive-soft-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive-soft-foreground" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'অগ্রগতি রিপোর্ট পাওয়া যায়নি' : 'Progress Report Not Found'}
          </h2>
          <p className="text-xs text-destructive-soft-foreground mb-4">
            {locale === 'bn'
              ? 'রিপোর্টের আইডি সঠিক নয় অথবা আপনি এটি দেখার অনুমোদিত নন।'
              : 'The requested report could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive text-white text-xs font-semibold rounded-xl"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-learning-from-report-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'লার্নিং প্রগ্রেস পোর্টালে ফিরুন' : 'Back to Learning Portal'}
        </Link>
      </div>

      {/* Banner */}
      <div className="rounded-2xl bg-card border border-interactive/25 p-8 text-foreground shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-interactive/20 border border-interactive/40 rounded-full text-xs font-medium text-interactive-soft-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {locale === 'bn' ? 'মাসিক অগ্রগতি মূল্যায়ন' : 'Periodic Progress Evaluation'}
            </span>
          </span>
          <Badge className="bg-success-soft text-success-soft-foreground border border-success/30">
            {locale === 'bn' ? 'প্রকাশিত' : 'Published'}
          </Badge>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
          {locale === 'bn'
            ? 'শিক্ষার্থীর পূর্ণাঙ্গ অগ্রগতি রিপোর্ট'
            : 'Comprehensive Learner Progress Report'}
        </h1>

        <div className="flex items-center gap-2 text-xs text-interactive-soft-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {locale === 'bn' ? 'মূল্যায়ন সময়কাল:' : 'Evaluation Period:'}{' '}
            <strong className="text-foreground">
              {new Date(report.periodStart).toLocaleDateString(dateLocale)} -{' '}
              {new Date(report.periodEnd).toLocaleDateString(dateLocale)}
            </strong>
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border border-border p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{locale === 'bn' ? 'উপস্থিতির হার' : 'Attendance Rate'}</span>
            <Percent className="w-4 h-4 text-success-soft-foreground" />
          </div>
          <div className="text-2xl font-black text-success-soft-foreground">
            {formatLocalizedNumber(report.attendanceRate, locale)}%
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{locale === 'bn' ? 'সম্পন্ন বাড়ির কাজ' : 'Assignments Done'}</span>
            <FileCheck2 className="w-4 h-4 text-info-soft-foreground" />
          </div>
          <div className="text-2xl font-black text-info-soft-foreground">
            {formatLocalizedNumber(report.assignmentsCompleted, locale)}
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{locale === 'bn' ? 'গড় স্কোর' : 'Average Score'}</span>
            <Award className="w-4 h-4 text-warning-soft-foreground" />
          </div>
          <div className="text-2xl font-black text-warning-soft-foreground">
            {report.averageScore !== null && report.averageScore !== undefined
              ? `${formatLocalizedNumber(report.averageScore, locale)}%`
              : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Report Body Details */}
      <div className="space-y-4">
        {/* Observable Progress */}
        <Card className="bg-card border border-border text-foreground rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-success-soft-foreground text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {locale === 'bn' ? 'দৃশ্যমান অগ্রগতি ও অর্জন' : 'Observable Progress & Achievements'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report.observableProgress}
          </p>
        </Card>

        {/* Areas for Growth */}
        {report.areasForGrowth && (
          <Card className="bg-card border border-border text-foreground rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-info-soft-foreground text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>
                {locale === 'bn'
                  ? 'উন্নতির জায়গা ও ভবিষ্যৎ লক্ষ্য'
                  : 'Areas for Growth & Recommendations'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {report.areasForGrowth}
            </p>
          </Card>
        )}

        {/* Tutor Remarks */}
        {report.tutorRemarks && (
          <Card className="bg-card border border-border text-foreground rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-warning-soft-foreground text-sm font-bold">
              <Award className="w-4 h-4" />
              <span>
                {locale === 'bn' ? 'শিক্ষকের সামগ্রিক পর্যালোচনা' : 'Tutor Overall Assessment'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted p-3 rounded-xl border border-border">
              "{report.tutorRemarks}"
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
