'use client';

import { Award, BookOpen, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { LearningMetrics } from '../types/learning.types';

export function LearningMetricsCards({
  locale,
  metrics,
}: {
  locale: Locale;
  metrics: LearningMetrics;
}) {
  const t = getDictionary(locale).learning;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.attendanceRate}
            </p>
            <h3 className="text-3xl font-extrabold text-foreground mt-1">
              {formatLocalizedNumber(metrics.attendanceRate, locale)}%
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatLocalizedNumber(metrics.totalAttended, locale)} /{' '}
              {formatLocalizedNumber(metrics.attendanceCount, locale)} {t.present.toLowerCase()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.completedAssignments}
            </p>
            <h3 className="text-3xl font-extrabold text-foreground mt-1">
              {formatLocalizedNumber(metrics.completedAssignmentsCount, locale)} /{' '}
              {formatLocalizedNumber(metrics.assignmentCount, locale)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{t.tabsAssignments}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.averageScore}
            </p>
            <h3 className="text-3xl font-extrabold text-foreground mt-1">
              {metrics.averageScorePct !== null
                ? `${formatLocalizedNumber(metrics.averageScorePct, locale)}%`
                : 'N/A'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatLocalizedNumber(metrics.scoredSubmissionsCount, locale)}{' '}
              {t.statusReviewed.toLowerCase()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-interactive/10 text-interactive flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
