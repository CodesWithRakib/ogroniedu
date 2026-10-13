'use client';

import { SessionScheduleCalendar } from '@/components/scheduling/SessionScheduleCalendar';
import { type Locale } from '@/lib/i18n';
import { useSessionsCalendar } from '../hooks/use-sessions-calendar';

/** Sessions calendar entry: schedule view with reschedule/cancel wired to the sessions API. */
export function SessionsPage({ locale }: { locale: Locale }) {
  const calendar = useSessionsCalendar(locale);

  return (
    <SessionScheduleCalendar
      locale={locale}
      initialSessions={calendar.items}
      isLoading={calendar.isLoading}
      queryError={calendar.queryError}
      onReschedule={calendar.onReschedule}
      onCancel={calendar.onCancel}
    />
  );
}
