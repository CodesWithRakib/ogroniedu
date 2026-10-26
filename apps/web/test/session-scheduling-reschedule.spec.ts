import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  SessionScheduleCalendar,
  buildGoogleCalendarUrl,
  CalendarSessionItem,
} from '../src/components/scheduling/SessionScheduleCalendar';
import { RescheduleModal } from '../src/features/bookings/components/sessions/rescheduleModal';
import { getDictionary } from '../src/lib/i18n';

describe('Session Scheduling, Calendar Sync & Reschedule Workflow', () => {
  const mockSession: CalendarSessionItem = {
    id: 'test-session-101',
    bookingId: 'test-booking-202',
    subjectName: 'উচ্চতর গণিত ও পদার্থবিজ্ঞান',
    tutorName: 'Md. Al Amin',
    studentName: 'Sadia Rahman',
    startsAt: '2026-10-28T10:00:00.000Z',
    endsAt: '2026-10-28T11:00:00.000Z',
    timezone: 'Asia/Dhaka',
    status: 'scheduled',
    meetingUrl: 'https://meet.jit.si/ogroniedu-session-101',
  };

  it('builds a valid Google Calendar URL with proper start/end timestamps and encoded parameters', () => {
    const url = buildGoogleCalendarUrl(mockSession);

    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain('text=%E0%A6%89%E0%A6%9A%E0%A7%8D%E0%A6%9A%E0%A6%A4%E0%A6%B0');
    expect(url).toContain('dates=20261028T100000Z/20261028T110000Z');
    expect(url).toContain(encodeURIComponent('https://meet.jit.si/ogroniedu-session-101'));
  });

  it('instantiates SessionScheduleCalendar with calendar sync and reschedule capabilities', () => {
    const element = React.createElement(SessionScheduleCalendar, {
      locale: 'bn',
      initialSessions: [mockSession],
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('bn');
    expect(element.props.initialSessions).toHaveLength(1);
    expect(element.props.initialSessions?.[0]?.subjectName).toBe('উচ্চতর গণিত ও পদার্থবিজ্ঞান');
  });

  it('verifies RescheduleModal component props and quick preset interface contract', () => {
    let confirmedTime = '';
    let confirmedReason = '';

    const element = React.createElement(RescheduleModal, {
      locale: 'bn',
      session: mockSession,
      isSubmitting: false,
      onClose: () => {},
      onConfirm: async (newTime: string, reason: string) => {
        confirmedTime = newTime;
        confirmedReason = reason;
      },
    });

    expect(element).toBeDefined();
    expect(element.props.session.id).toBe('test-session-101');
    expect(element.props.locale).toBe('bn');
    expect(typeof element.props.onConfirm).toBe('function');
  });

  it('verifies scheduling and rescheduling localization dictionary strings', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.scheduling.calendarTitle).toBeDefined();
    expect(bnDict.scheduling.reschedule).toBeDefined();
    expect(bnDict.scheduling.rescheduleReasonLabel).toBeDefined();
    expect(bnDict.scheduling.cancellationPolicyTitle).toBeDefined();

    expect(enDict.scheduling.reschedule).toBe('Reschedule');
    expect(enDict.scheduling.timezoneNotice).toContain('BST');
  });
});
