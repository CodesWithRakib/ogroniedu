'use client';

import React from 'react';
import { BookOpen, CalendarCheck2, ClipboardCheck, GraduationCap } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  LoadingSpinner,
  NativeSelect,
} from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { parseOffsetCollection } from '@/lib/api/parse';
import { useGetAdminLmsOverviewQuery, useGetAdminLmsSessionsQuery } from '@/store/services/learning-api';

interface AdminLmsSessionRow {
  id: string;
  bookingId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  subjectName: string | null;
  tutorName: string | null;
  studentName: string | null;
  attendanceStatus: string | null;
}

const STATUS_OPTIONS = ['', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;
const PAGE_SIZE = 20;

function statusLabel(locale: Locale, status: string): string {
  const bn: Record<string, string> = {
    scheduled: 'নির্ধারিত',
    in_progress: 'চলমান',
    completed: 'সম্পন্ন',
    cancelled: 'বাতিল',
    missed: 'অনুষ্ঠিত হয়নি',
    rescheduled: 'পুনঃনির্ধারিত',
  };
  const en: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    missed: 'Missed',
    rescheduled: 'Rescheduled',
  };
  return (locale === 'bn' ? bn : en)[status] ?? status;
}

function attendanceLabel(locale: Locale, status: string | null): string {
  if (!status) return locale === 'bn' ? 'উপস্থিতি নেই' : 'Not recorded';
  const bn: Record<string, string> = {
    present: 'উপস্থিত',
    late: 'দেরি',
    absent: 'অনুপস্থিত',
    excused: 'ছুটি',
  };
  const en: Record<string, string> = {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
    excused: 'Excused',
  };
  return (locale === 'bn' ? bn : en)[status] ?? status;
}

/**
 * Read-only LMS oversight. Mirrors the backend contract: admins observe session
 * volume, attendance coverage and homework activity, but cannot edit academic
 * records or read private tutor drafts from this surface.
 */
export function AdminLearningPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);

  const overview = useGetAdminLmsOverviewQuery();
  const sessions = useGetAdminLmsSessionsQuery({ status: status || undefined, page, pageSize: PAGE_SIZE });

  const parsed = React.useMemo(() => {
    if (!sessions.data) return { items: [] as AdminLmsSessionRow[], totalItems: 0, totalPages: 1 };
    try {
      const result = parseOffsetCollection<AdminLmsSessionRow>(sessions.data);
      return {
        items: result.items,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
      };
    } catch {
      return { items: [] as AdminLmsSessionRow[], totalItems: 0, totalPages: 1 };
    }
  }, [sessions.data]);

  const stats = overview.data?.data;

  const cards = [
    {
      label: isBn ? 'মোট সেশন' : 'Total sessions',
      value: stats?.sessions.total ?? 0,
      hint: `${formatLocalizedNumber(stats?.sessions.completed ?? 0, locale)} ${isBn ? 'সম্পন্ন' : 'completed'}`,
      Icon: CalendarCheck2,
    },
    {
      label: isBn ? 'উপস্থিতি রেকর্ড' : 'Attendance records',
      value: stats?.attendance.recorded ?? 0,
      hint: `${formatLocalizedNumber(stats?.attendance.attended ?? 0, locale)} ${isBn ? 'উপস্থিত/দেরি' : 'present or late'}`,
      Icon: ClipboardCheck,
    },
    {
      label: isBn ? 'প্রকাশিত হোমওয়ার্ক' : 'Published homework',
      value: stats?.homework.publishedAssignments ?? 0,
      hint: `${formatLocalizedNumber(stats?.homework.submissions ?? 0, locale)} ${isBn ? 'জমা' : 'submissions'}`,
      Icon: BookOpen,
    },
    {
      label: isBn ? 'আসন্ন সেশন' : 'Upcoming sessions',
      value: stats?.sessions.scheduled ?? 0,
      hint: `${formatLocalizedNumber(stats?.sessions.cancelled ?? 0, locale)} ${isBn ? 'বাতিল' : 'cancelled'}`,
      Icon: GraduationCap,
    },
  ];

  return (
    <AdminLayout locale={locale}>
      <div className="space-y-6 py-6" data-testid="admin-learning-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isBn ? 'শিক্ষণ কার্যক্রম পর্যবেক্ষণ' : 'Learning Activity Oversight'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'সেশন, উপস্থিতি ও হোমওয়ার্কের প্ল্যাটফর্ম-ব্যাপী সারসংক্ষেপ (শুধু পড়ার অনুমতি)'
                : 'Platform-wide session, attendance and homework summary (read-only)'}
            </p>
          </div>
        </div>

        {overview.isError && (
          <Alert variant="destructive">
            <AlertDescription role="alert">
              {normalizeApiError(overview.error, locale).message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, hint, Icon }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-black text-foreground mt-1 font-mono">
                {formatLocalizedNumber(value, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">
              {isBn ? 'সেশন তালিকা' : 'Session records'}
              <span className="ml-2 text-xs font-medium text-muted-foreground">
                {formatLocalizedNumber(parsed.totalItems, locale)}
              </span>
            </h2>
            <NativeSelect
              aria-label={isBn ? 'স্ট্যাটাস দিয়ে ফিল্টার' : 'Filter by status'}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-auto text-xs"
              wrapperClassName="w-auto"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === '' ? (isBn ? 'সব সেশন' : 'All statuses') : statusLabel(locale, option)}
                </option>
              ))}
            </NativeSelect>
          </div>

          {sessions.isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : sessions.isError ? (
            <Alert variant="destructive">
              <AlertDescription role="alert">
                {normalizeApiError(sessions.error, locale).message}
              </AlertDescription>
            </Alert>
          ) : parsed.items.length === 0 ? (
            <EmptyState
              title={isBn ? 'কোনো সেশন পাওয়া যায়নি' : 'No sessions found'}
              description={
                isBn
                  ? 'এই ফিল্টারে কোনো শিক্ষণ সেশন নেই।'
                  : 'There are no learning sessions matching this filter.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-semibold">{isBn ? 'শুরুর সময়' : 'Starts'}</th>
                    <th className="py-2 pr-3 font-semibold">{isBn ? 'বিষয়' : 'Subject'}</th>
                    <th className="py-2 pr-3 font-semibold">{isBn ? 'শিক্ষক' : 'Tutor'}</th>
                    <th className="py-2 pr-3 font-semibold">{isBn ? 'শিক্ষার্থী' : 'Student'}</th>
                    <th className="py-2 pr-3 font-semibold">{isBn ? 'সেশন' : 'Session'}</th>
                    <th className="py-2 font-semibold">{isBn ? 'উপস্থিতি' : 'Attendance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.items.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-foreground">
                        {new Date(row.startsAt).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2.5 pr-3">{row.subjectName ?? '—'}</td>
                      <td className="py-2.5 pr-3">{row.tutorName ?? '—'}</td>
                      <td className="py-2.5 pr-3">{row.studentName ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline">{statusLabel(locale, row.status)}</Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {attendanceLabel(locale, row.attendanceStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsed.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {isBn ? 'পূর্ববর্তী' : 'Previous'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {formatLocalizedNumber(page, locale)} / {formatLocalizedNumber(parsed.totalPages, locale)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= parsed.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {isBn ? 'পরবর্তী' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
