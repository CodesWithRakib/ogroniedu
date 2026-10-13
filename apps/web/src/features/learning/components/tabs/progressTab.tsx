'use client';

import { Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
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
        <Card key={rep.id} className="border-border/60 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  {rep.periodStart} – {rep.periodEnd}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(rep.generatedAt).toLocaleDateString(dateLocale)}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    {t.attendanceRate}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatLocalizedNumber(rep.attendanceRate, locale)}%
                  </span>
                </div>
                <div className="text-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                    {t.completedAssignments}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatLocalizedNumber(rep.assignmentsCompleted, locale)}
                  </span>
                </div>
                {rep.averageScore !== null && rep.averageScore !== undefined && (
                  <div className="text-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <span className="text-[10px] uppercase text-emerald-600 font-semibold block">
                      {t.averageScore}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatLocalizedNumber(rep.averageScore, locale)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/40 text-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                {t.observableProgressLabel}
              </span>
              <p className="text-foreground">{rep.observableProgress}</p>
            </div>

            {rep.areasForGrowth && (
              <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 text-sm">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wide block mb-1">
                  {t.areasForGrowthLabel}
                </span>
                <p className="text-amber-950 dark:text-amber-200">{rep.areasForGrowth}</p>
              </div>
            )}

            {rep.tutorRemarks && (
              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 text-sm">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide block mb-1">
                  {t.tutorRemarksLabel}
                </span>
                <p className="text-emerald-950 dark:text-emerald-200">{rep.tutorRemarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
