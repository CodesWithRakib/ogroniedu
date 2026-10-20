'use client';

import { SessionScheduleCalendar } from '@/components/scheduling/SessionScheduleCalendar';
import { ChildScopeSelect } from '@/features/guardian/components/ChildScopeSelect';
import { useChildScope } from '@/features/guardian/hooks/use-child-scope';
import { type Locale } from '@/lib/i18n';
import { useSessionsCalendar } from '../hooks/use-sessions-calendar';
import { useScheduleSession } from '../hooks/use-schedule-session';

/** Sessions calendar entry: schedule view with schedule/reschedule/cancel wired to the sessions API. */
export function SessionsPage({ locale }: { locale: Locale }) {
  const scope = useChildScope();
  const calendar = useSessionsCalendar(locale, scope.selectedStudentId);
  const scheduler = useScheduleSession(locale, scope.selectedStudentId);

  return (
    <SessionScheduleCalendar
      locale={locale}
      initialSessions={calendar.items}
      isLoading={calendar.isLoading || scheduler.optionsLoading}
      queryError={calendar.queryError}
      onScheduleSession={scheduler.scheduleSession}
      scheduleOptions={scheduler.options}
      onReschedule={calendar.onReschedule}
      onCancel={calendar.onCancel}
      scopeSlot={<ChildScopeSelect locale={locale} scope={scope} />}
    />
  );
}
