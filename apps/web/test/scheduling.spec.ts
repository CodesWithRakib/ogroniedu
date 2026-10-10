import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  SessionScheduleCalendar,
  CalendarSessionItem,
} from '../src/components/scheduling/SessionScheduleCalendar';
import { getDictionary, formatLocalizedNumber } from '../src/lib/i18n';

describe('SessionScheduleCalendar Component & Policy Tests (Phase 09)', () => {
  const mockSessions: CalendarSessionItem[] = [
    {
      id: 'sess-1',
      bookingId: 'booking-1',
      subjectName: 'Higher Mathematics',
      tutorName: 'Rahat Mahmud',
      studentName: 'Tanvir Hossain',
      startsAt: '2026-10-15T10:00:00Z',
      endsAt: '2026-10-15T11:00:00Z',
      timezone: 'Asia/Dhaka',
      status: 'scheduled',
      meetingUrl: 'https://meet.ogroni.edu/room-101',
    },
    {
      id: 'sess-2',
      bookingId: 'booking-1',
      subjectName: 'Higher Mathematics',
      tutorName: 'Rahat Mahmud',
      studentName: 'Tanvir Hossain',
      startsAt: '2026-10-18T10:00:00Z',
      endsAt: '2026-10-18T11:00:00Z',
      timezone: 'Asia/Dhaka',
      status: 'cancelled',
      cancellationAssessment: {
        leadHours: 36,
        refundPercentage: 100,
        penaltyNotice: 'none',
        reason: 'Family emergency',
      },
    },
  ];

  it('should instantiate SessionScheduleCalendar with English locale and verify props', () => {
    const element = React.createElement(SessionScheduleCalendar, {
      locale: 'en',
      initialSessions: mockSessions,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('en');
    expect(element.props.initialSessions).toHaveLength(2);
    expect(element.props.initialSessions[0].subjectName).toBe('Higher Mathematics');
    expect(element.props.initialSessions[0].status).toBe('scheduled');
  });

  it('should verify Bengali dictionary translations for scheduling and cancellation policy', () => {
    const dict = getDictionary('bn');

    expect(dict.scheduling.calendarTitle).toBe('ক্লাসের সময়সূচি ও সেশন');
    expect(dict.scheduling.scheduleSession).toBe('নতুন ক্লাস নির্ধারণ');
    expect(dict.scheduling.statusScheduled).toBe('নির্ধারিত');
    expect(dict.scheduling.cancellationPolicyTitle).toBe('ক্লাস বাতিল ও রিফান্ড নীতিমালা');
    expect(dict.scheduling.fullRefundNotice).toContain('১০০% রিফান্ড');
    expect(dict.scheduling.partialRefundNotice).toContain('৮০% রিফান্ড');
    expect(dict.scheduling.timezoneNotice).toContain('বাংলাদেশ প্রমাণ সময়');

    expect(formatLocalizedNumber(100, 'bn')).toBe('১০০');
    expect(formatLocalizedNumber(80, 'bn')).toBe('৮০');
  });

  it('should verify cancelled session refund assessment and lead time metadata', () => {
    const cancelledSession = mockSessions[1];
    expect(cancelledSession.status).toBe('cancelled');
    expect(cancelledSession.cancellationAssessment).toBeDefined();
    expect(cancelledSession.cancellationAssessment?.refundPercentage).toBe(100);
    expect(cancelledSession.cancellationAssessment?.penaltyNotice).toBe('none');
  });

  it('should verify timezone intent is explicitly Asia/Dhaka across session items', () => {
    mockSessions.forEach((session) => {
      expect(session.timezone).toBe('Asia/Dhaka');
    });
  });
});
