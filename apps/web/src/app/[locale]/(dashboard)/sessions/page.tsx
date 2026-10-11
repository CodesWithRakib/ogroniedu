'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SessionScheduleCalendar, type CalendarSessionItem } from '@/components/scheduling/SessionScheduleCalendar';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import {
  useGetSessionsQuery,
  useRescheduleSessionMutation,
  useCancelSessionMutation,
} from '@/store/services/sessions-api';

function SessionsContent({ locale }: { locale: Locale }) {
  const { data, isFetching, isError, error, refetch } = useGetSessionsQuery();
  const [reschedule] = useRescheduleSessionMutation();
  const [cancel] = useCancelSessionMutation();

  const items: CalendarSessionItem[] = (data?.data ?? []).map((s) => ({
    id: s.id,
    bookingId: s.bookingId,
    subjectName: s.subjectName ?? (locale === 'bn' ? 'টিউটরিং ক্লাস' : 'Tutoring class'),
    tutorName: s.tutorName ?? '—',
    studentName: s.studentName ?? '—',
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    timezone: s.timezone ?? 'Asia/Dhaka',
    status: s.status,
    meetingUrl: s.meetingUrl ?? null,
    locationInstructions: (s.locationInstructions as string | null) ?? null,
  }));

  return (
    <SessionScheduleCalendar
      locale={locale}
      initialSessions={items}
      isLoading={isFetching}
      queryError={isError ? normalizeApiError(error, locale).message : null}
      onReschedule={async (sessionId, newStartsAt, reason) => {
        try {
          await reschedule({ id: sessionId, newStartsAt, reason }).unwrap();
          refetch();
        } catch (err) {
          throw new Error(normalizeApiError(err as never, locale).message);
        }
      }}
      onCancel={async (sessionId, reason) => {
        try {
          await cancel({ id: sessionId, reason }).unwrap();
          refetch();
        } catch (err) {
          throw new Error(normalizeApiError(err as never, locale).message);
        }
      }}
    />
  );
}

export default function SessionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <div className="py-6">
        <SessionsContent locale={locale} />
      </div>
    </RequireAuth>
  );
}
