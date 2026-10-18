'use client';

import Link from 'next/link';
import { Award, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { ProgressReportItem } from '../../types/learning.types';

export function ProgressTab({
  locale,
  reports,
}: {
  locale: Locale;
  reports: ProgressReportItem[];
}) {
  const t = getDictionary(locale).learning;
  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  if (reports.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
        <p>{t.noReports}</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {reports.map((rep) => (
        <Card key={rep.id} className="border-border hover:shadow-sm transition-shadow">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-success-soft-foreground" />
                  {rep.periodStart} – {rep.periodEnd}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(rep.generatedAt).toLocaleDateString(dateLocale)}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    {t.attendanceRate}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatLocalizedNumber(rep.attendanceRate, locale)}%
                  </span>
                </div>
                <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    {t.completedAssignments}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatLocalizedNumber(rep.assignmentsCompleted, locale)}
                  </span>
                </div>
                {rep.averageScore !== null && rep.averageScore !== undefined && (
                  <div className="text-center bg-primary/10 px-3.5 py-1.5 rounded-xl border border-primary/25">
                    <span className="text-[10px] uppercase text-primary font-bold block">
                      {t.averageScore}
                    </span>
                    <span className="text-sm font-black text-primary">
                      {formatLocalizedNumber(rep.averageScore, locale)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="bg-surface p-3.5 rounded-xl border border-border text-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                {t.observableProgressLabel}
              </span>
              <p className="text-foreground leading-relaxed font-medium">
                {rep.observableProgress}
              </p>
            </div>

            {rep.areasForGrowth && (
              <div className="bg-warning-soft p-3.5 rounded-xl border border-warning/30 text-sm">
                <span className="text-xs font-bold text-warning uppercase tracking-wide block mb-1">
                  {t.areasForGrowthLabel}
                </span>
                <p className="text-foreground leading-relaxed font-medium">{rep.areasForGrowth}</p>
              </div>
            )}

            {rep.tutorRemarks && (
              <div className="bg-primary-soft p-3.5 rounded-xl border border-primary/30 text-sm">
                <span className="text-xs font-bold text-primary uppercase tracking-wide block mb-1">
                  {t.tutorRemarksLabel}
                </span>
                <p className="text-foreground leading-relaxed font-medium">{rep.tutorRemarks}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Link
                href={withLocale(`/progress/${rep.id}`, locale)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-interactive  hover:underline"
              >
                <span>{locale === 'bn' ? 'পূর্ণাঙ্গ রিপোর্ট দেখুন' : 'View Full Report'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
