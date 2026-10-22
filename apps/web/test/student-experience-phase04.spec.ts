import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentNextClassHero } from '../src/features/student/components/StudentNextClassHero';
import { StudentMyTutorsCard } from '../src/features/student/components/StudentMyTutorsCard';
import { StudentUpcomingClassesCard } from '../src/features/student/components/StudentUpcomingClassesCard';
import { StudentSubjectMasteryCard } from '../src/features/student/components/StudentSubjectMasteryCard';
import type { CalendarSessionItem } from '../src/features/bookings/types/session.types';
import type { ActiveTutorInfo } from '../src/features/student/hooks/use-student-dashboard';

describe('Phase 4 — Student Experience & Discovery Components', () => {
  describe('StudentNextClassHero', () => {
    it('renders learning streak and discovery encouragement when no upcoming session', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentNextClassHero, {
          locale: 'bn',
          nextSession: null,
          streakDays: 7,
        }),
      );

      expect(html).toContain('৭ দিনের সক্রিয় স্টাডি স্ট্রিক');
      expect(html).toContain('আজকের জন্য কোনো ক্লাস নির্ধারিত নেই');
      expect(html).toContain('/bn/tutors');
    });

    it('renders scheduled class details and direct classroom join link when session exists', () => {
      const mockSession: CalendarSessionItem = {
        id: 'sess-101',
        bookingId: 'book-101',
        subjectName: 'উচ্চতর গণিত — দ্বিপদী বিস্তৃতি',
        tutorName: 'রাশেদ করিম (Rashed Karim)',
        studentName: 'আবরার আহমেদ',
        startsAt: '2026-10-25T10:00:00.000Z',
        endsAt: '2026-10-25T11:30:00.000Z',
        timezone: 'Asia/Dhaka',
        status: 'scheduled',
        meetingUrl: 'https://meet.google.com/ogr-math-101',
        locationInstructions: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(StudentNextClassHero, {
          locale: 'bn',
          nextSession: mockSession,
          streakDays: 5,
        }),
      );

      expect(html).toContain('উচ্চতর গণিত — দ্বিপদী বিস্তৃতি');
      expect(html).toContain('রাশেদ করিম (Rashed Karim)');
      expect(html).toContain('https://meet.google.com/ogr-math-101');
      expect(html).toContain('ক্লাসরুমে যোগ দিন');
    });
  });

  describe('StudentMyTutorsCard', () => {
    it('renders empty state when no tutors are enrolled', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentMyTutorsCard, {
          locale: 'bn',
          tutors: [],
        }),
      );

      expect(html).toContain('আমার শিক্ষকবৃন্দ');
      expect(html).toContain('এখনও কোনো সক্রিয় শিক্ষক নেই');
      expect(html).toContain('/bn/tutors');
    });

    it('renders active enrolled tutors with subject and hourly rate', () => {
      const activeTutors: ActiveTutorInfo[] = [
        {
          tutorUserId: 'tutor-1',
          displayName: 'রাশেদ করিম',
          subjectName: 'পদার্থবিজ্ঞান',
          hourlyRateMinor: 80000,
          bookingId: 'book-1',
          mode: 'online',
          status: 'confirmed',
        },
        {
          tutorUserId: 'tutor-2',
          displayName: 'নুসরাত জাহান',
          subjectName: 'ইংরেজি',
          hourlyRateMinor: 60000,
          bookingId: 'book-2',
          mode: 'in_person',
          status: 'confirmed',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(StudentMyTutorsCard, {
          locale: 'bn',
          tutors: activeTutors,
        }),
      );

      expect(html).toContain('রাশেদ করিম');
      expect(html).toContain('পদার্থবিজ্ঞান');
      expect(html).toContain('নুসরাত জাহান');
      expect(html).toContain('ইংরেজি');
      expect(html).toContain('৮০০');
      expect(html).toContain('৬০০');
    });
  });

  describe('StudentUpcomingClassesCard', () => {
    it('renders empty schedule message when no sessions are booked', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentUpcomingClassesCard, {
          locale: 'bn',
          sessions: [],
        }),
      );

      expect(html).toContain('আসন্ন লাইভ ক্লাস');
      expect(html).toContain('কোনো আসন্ন ক্লাস নেই');
    });

    it('renders upcoming class items with formatted subject and tutor name', () => {
      const sessions: CalendarSessionItem[] = [
        {
          id: 'sess-1',
          bookingId: 'book-1',
          subjectName: 'রসায়ন — পর্যায় সারণি',
          tutorName: 'তানজিমুল কবির',
          studentName: 'আবরার আহমেদ',
          startsAt: '2026-10-26T15:00:00.000Z',
          endsAt: '2026-10-26T16:00:00.000Z',
          timezone: 'Asia/Dhaka',
          status: 'scheduled',
          meetingUrl: 'https://meet.google.com/ogr-chem-1',
          locationInstructions: null,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(StudentUpcomingClassesCard, {
          locale: 'bn',
          sessions,
        }),
      );

      expect(html).toContain('রসায়ন — পর্যায় সারণি');
      expect(html).toContain('তানজিমুল কবির');
    });
  });

  describe('StudentSubjectMasteryCard', () => {
    it('renders subject progress items and chapter completion indicators', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentSubjectMasteryCard, {
          locale: 'bn',
        }),
      );

      expect(html).toContain('সিলেবাস কভারেজ');
      expect(html).toContain('উচ্চতর গণিত');
      expect(html).toContain('পদার্থবিজ্ঞান');
      expect(html).toContain('রসায়ন');
      expect(html).toContain('৮৫%');
    });
  });
});
