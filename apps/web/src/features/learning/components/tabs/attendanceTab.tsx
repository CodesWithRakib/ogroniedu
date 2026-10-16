import Link from 'next/link';
import { CalendarCheck, ExternalLink } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { AttendanceItemStatus, AttendanceRecordItem, LearningRole } from '../../types/learning.types';

function attendanceBadgeClass(status: AttendanceItemStatus): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'late':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'excused':
      return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
    default:
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
  }
}

export function AttendanceTab({
  locale,
  attendance,
  userRole,
}: {
  locale: Locale;
  attendance: AttendanceRecordItem[];
  userRole?: LearningRole;
}) {
  const t = getDictionary(locale).learning;
  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  if (attendance.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
        <p>{t.noAttendance}</p>
      </Card>
    );
  }

  const statusLabel: Record<AttendanceItemStatus, string> = {
    present: t.present,
    late: t.late,
    excused: t.excused,
    absent: t.absent,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {attendance.map((rec) => (
        <Card key={rec.id} className="border-border/60 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {rec.subjectName || 'Tutoring Class'}
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(rec.recordedAt).toLocaleDateString(dateLocale, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </CardDescription>
            </div>
            <Badge className={attendanceBadgeClass(rec.attendanceStatus)}>
              {statusLabel[rec.attendanceStatus]}
            </Badge>
          </CardHeader>
          {rec.notes && (
            <CardContent className="text-sm text-muted-foreground pt-0">
              <p className="bg-muted/50 p-2 rounded-lg text-xs italic">&quot;{rec.notes}&quot;</p>
            </CardContent>
          )}
          {rec.sessionId && (
            <div className="px-6 pb-4 pt-1 flex justify-end">
              <Link
                href={withLocale(`/sessions/${rec.sessionId}`, locale)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>{locale === 'bn' ? 'সেশনের বিস্তারিত দেখুন' : 'View Session Details'}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
