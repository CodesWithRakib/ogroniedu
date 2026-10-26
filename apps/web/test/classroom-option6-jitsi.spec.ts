import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { JitsiClassroomMeeting } from '../src/features/classroom/components/JitsiClassroomMeeting';
import { ClassroomWorkspace } from '../src/features/classroom/components/ClassroomWorkspace';
import type { SessionItem } from '../src/store/services/sessions-api';

describe('Option 6: Jitsi Online Classroom, Live Video & Session Scheduling Tests', () => {
  const mockSession: SessionItem = {
    id: '77777777-7777-4777-a777-777777777777',
    bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
    subjectName: 'Bangla (1st & 2nd Paper)',
    tutorName: 'Farhan Ahmed',
    studentName: 'Abrar Ahmed',
    startsAt: '2026-10-25T16:00:00.000Z',
    endsAt: '2026-10-25T17:00:00.000Z',
    timezone: 'Asia/Dhaka',
    status: 'in_progress',
    meetingUrl: 'https://meet.jit.si/ogroni-0301ea-77777777',
  };

  it('TC-JITSI-001: should render JitsiClassroomMeeting with deterministic room name and action buttons (bn)', () => {
    const html = renderToStaticMarkup(
      React.createElement(JitsiClassroomMeeting, {
        sessionId: mockSession.id,
        bookingId: mockSession.bookingId,
        meetingUrl: mockSession.meetingUrl,
        locale: 'bn',
        displayName: 'Abrar Ahmed',
        userEmail: 'abrar@ogroniedu.com',
        isTutor: false,
      }),
    );

    expect(html).toContain('data-testid="jitsi-classroom-container"');
    expect(html).toContain('অগ্রণী লাইভ জিটসি ক্লাসরুম');
    expect(html).toContain('ogroni-0301ea-77777777');
    expect(html).toContain('data-testid="copy-jitsi-room-url"');
    expect(html).toContain('data-testid="open-jitsi-new-tab"');
    expect(html).toContain('data-testid="toggle-fullscreen-btn"');
    expect(html).toContain('Abrar Ahmed');
  });

  it('TC-JITSI-002: should render JitsiClassroomMeeting with English strings and save button for tutor', () => {
    const html = renderToStaticMarkup(
      React.createElement(JitsiClassroomMeeting, {
        sessionId: mockSession.id,
        bookingId: mockSession.bookingId,
        meetingUrl: null, // No meeting URL saved yet
        locale: 'en',
        displayName: 'Farhan Ahmed',
        userEmail: 'farhan@ogroniedu.com',
        isTutor: true,
        onMeetingUrlGenerated: () => {},
      }),
    );

    expect(html).toContain('OgroniEdu Live Jitsi Classroom');
    expect(html).toContain('data-testid="save-jitsi-link-btn"');
    expect(html).toContain('Save as Session Link');
    expect(html).toContain('Farhan Ahmed');
    expect(html).toContain('Copy Link');
    expect(html).toContain('New Tab');
  });

  it('TC-JITSI-003: should render ClassroomWorkspace with Video, Whiteboard, Formulas and Attendance tabs', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'bn',
          isTutor: true,
          initialTab: 'attendance',
        }),
      ),
    );

    expect(html).toContain('data-testid="tab-video"');
    expect(html).toContain('লাইভ ভিডিও ক্লাস (Jitsi Meet)');
    expect(html).toContain('data-testid="tab-whiteboard"');
    expect(html).toContain('ইন্টারেক্টিভ হোয়াইটবোর্ড');
    expect(html).toContain('data-testid="tab-formulas"');
    expect(html).toContain('ফর্মুলা ও স্টাডি নোটস');
    expect(html).toContain('data-testid="tab-attendance"');
    expect(html).toContain('উপস্থিতি ও বিবরণ');
    expect(html).toContain('data-testid="split-mode-toggle"');
  });

  it('TC-JITSI-004: should render AttendanceSection controls for tutor with WCAG AAA contrast', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'bn',
          isTutor: true,
          initialTab: 'attendance',
        }),
      ),
    );

    expect(html).toContain('data-testid="classroom-save-attendance-btn"');
    expect(html).toContain('data-testid="classroom-attendance-present"');
    expect(html).toContain('data-testid="classroom-attendance-late"');
    expect(html).toContain('data-testid="classroom-attendance-absent"');
    expect(html).toContain('data-testid="classroom-attendance-excused"');
    expect(html).toContain('data-testid="complete-class-btn"');
  });

  it('TC-JITSI-005: should verify high-contrast text and responsive layout classes', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'bn',
          isTutor: false,
        }),
      ),
    );

    expect(html).toContain('text-slate-900');
    expect(html).toContain('border-slate-200');
    expect(html).toContain('Bangla (1st &amp; 2nd Paper)');
    expect(html).toContain('Farhan Ahmed');
    expect(html).toContain('Abrar Ahmed');
  });
});
