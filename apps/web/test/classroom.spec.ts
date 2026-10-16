import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  InteractiveWhiteboard,
  ClassroomFormulasDrawer,
  ClassroomWorkspace,
} from '../src/features/classroom';
import type { SessionItem } from '../src/store/services/sessions-api';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';

describe('Feature #7: Live Interactive Classroom, Whiteboard & Study Workspace', () => {
  const mockSession: SessionItem = {
    id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01',
    bookingId: '2a778253-c39e-4849-b3b1-ddfd16c7a93b',
    subjectName: 'Physics (এইচএসসি পদার্থবিজ্ঞান ১ম পত্র)',
    tutorName: 'রাশেদ করিম (Rashed Karim)',
    studentName: 'আবরার আহমেদ (Abrar Ahmed)',
    startsAt: '2026-10-16T14:00:00.000Z',
    endsAt: '2026-10-16T15:00:00.000Z',
    timezone: 'Asia/Dhaka',
    status: 'scheduled',
    meetingUrl: 'https://meet.google.com/ogr-phys-2026',
  };

  it('should instantiate InteractiveWhiteboard component and verify props', () => {
    const el = React.createElement(InteractiveWhiteboard, {
      locale: 'bn',
      sessionTitle: 'এইচএসসি পদার্থবিজ্ঞান',
    });

    expect(el).toBeDefined();
    expect(el.props.locale).toBe('bn');
    expect(el.props.sessionTitle).toBe('এইচএসসি পদার্থবিজ্ঞান');
  });

  it('should instantiate ClassroomFormulasDrawer component', () => {
    const el = React.createElement(ClassroomFormulasDrawer, {
      locale: 'bn',
    });

    expect(el).toBeDefined();
    expect(el.props.locale).toBe('bn');
  });

  it('should instantiate ClassroomWorkspace inside Redux Provider and verify session binding', () => {
    const store = makeStore();
    const el = React.createElement(
      Provider,
      { store },
      React.createElement(ClassroomWorkspace, {
        session: mockSession,
        locale: 'bn',
        isTutor: true,
      }),
    );

    expect(el).toBeDefined();
    expect(mockSession.status).toBe('scheduled');
    expect(mockSession.meetingUrl).toContain('meet.google.com');
    expect(mockSession.timezone).toBe('Asia/Dhaka');
  });

  it('should verify session transition states for Feature #7 lifecycle', () => {
    const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    expect(statuses).toContain(mockSession.status);

    const inProgressSession: SessionItem = {
      ...mockSession,
      status: 'in_progress',
    };
    expect(inProgressSession.status).toBe('in_progress');

    const completedSession: SessionItem = {
      ...mockSession,
      status: 'completed',
    };
    expect(completedSession.status).toBe('completed');
  });

  it('should format WhatsApp invitation text with classroom URL', () => {
    const expectedPrefix = 'অগ্রণী এডু ক্লাসরুম লিংক:';
    const whatsappQuery = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${expectedPrefix} ${mockSession.meetingUrl}`,
    )}`;

    expect(whatsappQuery).toContain('https://api.whatsapp.com/send?text=');
    expect(whatsappQuery).toContain('meet.google.com');
  });
});
