'use client';

import { SessionScheduleCalendar } from '@/components/scheduling/SessionScheduleCalendar';
import { type Locale } from '@/lib/i18n';
import { useSessionsCalendar } from '../hooks/use-sessions-calendar';
import { useScheduleSession } from '../hooks/use-schedule-session';

/** Sessions calendar entry: schedule view with schedule/reschedule/cancel wired to the sessions API. */
export function SessionsPage({ locale }: { locale: Locale }) {
  const calendar = useSessionsCalendar(locale);
  const scheduler = useScheduleSession(locale);

  return (
    <SessionScheduleCalendar
      locale={locale}
      initialSessions={calendar.items}
      isLoading={calendar.isLoading || scheduler.optionsLoading}
      queryError={calendar.queryError}
      onScheduleOneOff={scheduler.scheduleOneOff}
      scheduleOptions={scheduler.options}
      onReschedule={calendar.onReschedule}
      onCancel={calendar.onCancel}
    />
  );
}
