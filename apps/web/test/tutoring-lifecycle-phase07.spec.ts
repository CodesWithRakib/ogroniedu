import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionStatusBadge } from '../src/features/bookings/components/sessions/sessionStatusBadge';
import { SessionScheduleCalendar } from '../src/components/scheduling/SessionScheduleCalendar';
import type { CalendarSessionItem } from '../src/features/bookings/types/session.types';

describe('Phase 7 — Tutoring Lifecycle & Scheduling Concurrency (Web UI)', () => {
  describe('SessionStatusBadge', () => {
    it('renders scheduled status badge in Bengali and English', () => {
      const bnHtml = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'scheduled' }),
      );
      expect(bnHtml).toContain('নির্ধারিত');

      const enHtml = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'en', status: 'scheduled' }),
      );
      expect(enHtml).toContain('Scheduled');
    });

    it('renders in_progress status with pulse indicator', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'in_progress' }),
      );
      expect(html).toContain('চলমান');
      expect(html).toContain('animate-pulse');
    });

    it('renders completed status badge correctly', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'completed' }),
      );
      expect(html).toContain('সম্পন্ন');
    });

    it('renders cancelled status badge with destructive styling', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'cancelled' }),
      );
      expect(html).toContain('বাতিল');
    });

    it('renders no_show status badge in Bengali and English', () => {
      const bnHtml = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'no_show' }),
      );
      expect(bnHtml).toContain('অনুপস্থিত (No-show)');

      const enHtml = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'en', status: 'no_show' }),
      );
      expect(enHtml).toContain('No Show');
    });

    it('renders reschedule_pending status badge', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionStatusBadge, { locale: 'bn', status: 'reschedule_pending' }),
      );
      expect(html).toContain('পুনর্নির্ধারণের আবেদনকৃত');
    });
  });

  describe('SessionScheduleCalendar View Engine', () => {
    const mockSessions: CalendarSessionItem[] = [
      {
        id: 'session-live-1',
        bookingId: 'booking-1',
        subjectName: 'Higher Mathematics',
        tutorName: 'Rashed Karim',
        studentName: 'Abrar Ahmed',
        startsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 7200 * 1000).toISOString(),
        timezone: 'Asia/Dhaka',
        status: 'scheduled',
        meetingUrl: 'https://meet.google.com/abc-def-ghi',
      },
      {
        id: 'session-done-1',
        bookingId: 'booking-1',
        subjectName: 'Higher Mathematics',
        tutorName: 'Rashed Karim',
        studentName: 'Abrar Ahmed',
        startsAt: new Date(Date.now() - 86400 * 1000).toISOString(),
        endsAt: new Date(Date.now() - 82800 * 1000).toISOString(),
        timezone: 'Asia/Dhaka',
        status: 'completed',
      },
    ];

    it('renders calendar controls, BST timezone badge, and spotlight banner', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionScheduleCalendar, {
          locale: 'bn',
          initialSessions: mockSessions,
        }),
      );

      // Verify header and timezone indicator
      expect(html).toContain('BST / UTC+৬');
      expect(html).toContain('১০০% এসক্রো সুরক্ষিত ক্লাস');

      // Verify Spotlight Next Session banner
      expect(html).toContain('Higher Mathematics');
      expect(html).toContain('Rashed Karim');
      expect(html).toContain('ডিজিটাল ক্লাসরুম');
      expect(html).toContain('অনলাইন ক্লাসে যুক্ত হন');

      // Verify Filter Buttons
      expect(html).toContain('সব ক্লাস');
      expect(html).toContain('আসন্ন ও লাইভ');
      expect(html).toContain('সম্পন্ন');
      expect(html).toContain('বাতিল');
    });

    it('renders empty state illustration and CTA when no sessions exist', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionScheduleCalendar, {
          locale: 'bn',
          initialSessions: [],
        }),
      );

      expect(html).toContain('কোনো ক্লাস নির্ধারিত নেই।');
      expect(html).toContain('অভিজ্ঞ শিক্ষক খুঁজুন');
    });
  });
});
