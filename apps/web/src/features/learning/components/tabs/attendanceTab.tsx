import Link from 'next/link';
import { CalendarCheck, ExternalLink } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type {
  AttendanceItemStatus,
  AttendanceRecordItem,
  LearningRole,
} from '../../types/learning.types';

function attendanceBadgeClass(status: AttendanceItemStatus): string {
  switch (status) {
    case 'present':
      return 'bg-success-soft text-success border border-success/30 font-bold';
    case 'late':
      return 'bg-warning-soft text-warning border border-warning/30 font-bold';
    case 'excused':
      return 'bg-info-soft text-info border border-info/30 font-bold';
    default:
      return 'bg-destructive-soft text-destructive border border-destructive/30 font-bold';
  }
}

export function AttendanceTab({
  locale,
  attendance,
}: {
  locale: Locale;
  attendance: AttendanceRecordItem[];
  userRole?: LearningRole;
}) {
  const t = getDictionary(locale).learning;
  const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';

  if (attendance.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground border-border rounded-2xl bg-card">
        <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
        <p className="text-sm font-semibold text-foreground">{t.noAttendance}</p>
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
        <Card
          key={rec.id}
          className="border-border hover:border-primary/40 hover:shadow-xs transition-all rounded-2xl bg-card shadow-xs"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-foreground">
                {rec.subjectName || 'Tutoring Class'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-medium">
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
            <CardContent className="text-xs text-foreground pt-0">
              <p className="bg-surface p-3 rounded-xl border border-border text-xs italic">
                &quot;{rec.notes}&quot;
              </p>
            </CardContent>
          )}
          {rec.sessionId && (
            <div className="px-6 pb-4 pt-1 flex justify-end">
              <Link
                href={withLocale(`/sessions/${rec.sessionId}`, locale)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>{locale === 'bn' ? 'সেশনের বিস্তারিত দেখুন' : 'View Session Details'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
