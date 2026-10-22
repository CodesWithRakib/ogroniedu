import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TutorEarningsCommandBar } from '../src/features/tutors/components/TutorEarningsCommandBar';
import { TutorPerformanceRadar } from '../src/features/tutors/components/TutorPerformanceRadar';
import { TutorTodayScheduleTimeline } from '../src/features/tutors/components/TutorTodayScheduleTimeline';
import type { SessionItem } from '../src/store/services/sessions-api';

describe('Phase 6 — Tutor Experience & Teaching Studio Components', () => {
  describe('TutorEarningsCommandBar', () => {
    it('renders withdrawal command bar with available, escrow and lifetime net earnings', () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorEarningsCommandBar, {
          locale: 'bn',
          availableBdt: 14250,
          escrowPendingBdt: 8500,
          lifetimeNetBdt: 65000,
          minPayoutBdt: 500,
        }),
      );

      expect(html).toContain('উত্তোলনযোগ্য ব্যালেন্স');
      expect(html).toContain('উত্তোলন প্রস্তুত');
      expect(html).toContain('১৪২৫০');
      expect(html).toContain('৮৫০০');
      expect(html).toContain('৬৫০০০');
      expect(html).toContain('/bn/dashboard/tutor/payments');
    });

    it('renders English localization correctly with payout threshold notice', () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorEarningsCommandBar, {
          locale: 'en',
          availableBdt: 14250,
          escrowPendingBdt: 8500,
          lifetimeNetBdt: 65000,
          minPayoutBdt: 500,
        }),
      );

      expect(html).toContain('Available for Payout');
      expect(html).toContain('Ready');
      expect(html).toContain('14250');
      expect(html).toContain('8500');
      expect(html).toContain('65000');
      expect(html).toContain('/en/dashboard/tutor/payments');
    });
  });

  describe('TutorPerformanceRadar', () => {
    it('renders quality metrics, rating, and completion rate', () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorPerformanceRadar, {
          locale: 'bn',
          rating: 4.9,
          reviewCount: 18,
          responseRate: 98,
          completionRate: 100,
          profileStrength: 95,
        }),
      );

      expect(html).toContain('শিক্ষক পারফরম্যান্স রেডার');
      expect(html).toContain('4.9');
      expect(html).toContain('৯৮%');
      expect(html).toContain('১০০%');
      expect(html).toContain('৯৫%');
      expect(html).toContain('/bn/dashboard/tutor');
    });
  });

  describe('TutorTodayScheduleTimeline', () => {
    it('renders empty timeline notice when no sessions are scheduled for today', () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorTodayScheduleTimeline, {
          locale: 'bn',
          sessions: [],
        }),
      );

      expect(html).toContain('আজকের ক্লাস টাইমলাইন');
      expect(html).toContain('আজকের জন্য কোনো ক্লাস নির্ধারিত নেই');
      expect(html).toContain('/bn/dashboard/tutor/sessions');
    });

    it('renders scheduled teaching sessions with student name and classroom action', () => {
      const sessions: SessionItem[] = [
        {
          id: 'sess-t1',
          bookingId: 'book-t1',
          startsAt: '2026-10-25T16:00:00.000Z',
          endsAt: '2026-10-25T17:30:00.000Z',
          status: 'scheduled',
          sessionNumber: 1,
          meetingUrl: 'https://meet.google.com/ogr-tutor-101',
          studentName: 'আবরার আহমেদ',
          subjectName: 'পদার্থবিজ্ঞান',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TutorTodayScheduleTimeline, {
          locale: 'bn',
          sessions,
        }),
      );

      expect(html).toContain('আজকের ক্লাস টাইমলাইন');
      expect(html).toContain('পদার্থবিজ্ঞান');
      expect(html).toContain('আবরার আহমেদ');
      expect(html).toContain('https://meet.google.com/ogr-tutor-101');
    });
  });
});
