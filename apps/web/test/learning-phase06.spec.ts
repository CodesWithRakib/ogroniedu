import { describe, it, expect } from 'vitest';
import React from 'react';
import { Provider } from 'react-redux';
import { renderToStaticMarkup } from 'react-dom/server';
import { makeStore } from '../src/store';
import { getDictionary } from '../src/lib/i18n';
import {
  mapAssignmentRecords,
  mapAttendanceRecords,
} from '../src/features/learning/utils/learning-mappers';
import { SessionLifecycleActions } from '../src/features/learning/components/sessionLifecycleActions';
import type { AssignmentRecord, AttendanceRecord } from '../src/store/services/learning-api';

describe('Phase 06 LMS Web Specifications (Vitest)', () => {
  it('guarantees complete i18n key parity for learning namespace between bn and en', () => {
    const bn = getDictionary('bn').learning;
    const en = getDictionary('en').learning;

    expect(bn).toBeDefined();
    expect(en).toBeDefined();

    const bnKeys = Object.keys(bn).sort();
    const enKeys = Object.keys(en).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(40);

    // Verify critical Phase 06 action keys
    expect(bn.startSessionAction).toBeDefined();
    expect(en.startSessionAction).toBeDefined();
    expect(bn.completeSessionAction).toBeDefined();
    expect(en.completeSessionAction).toBeDefined();
    expect(bn.sessionLessonPlan).toBeDefined();
    expect(en.sessionLessonPlan).toBeDefined();
    expect(bn.materials).toBeDefined();
    expect(en.materials).toBeDefined();
    expect(bn.learningGoals).toBeDefined();
    expect(en.learningGoals).toBeDefined();
  });

  it('maps loose assignment statuses and narrows unknown values to safe defaults', () => {
    const rawAssignments: AssignmentRecord[] = [
      {
        id: 'asgn-1',
        bookingId: 'book-1',
        tutorUserId: 'tutor-1',
        studentUserId: 'student-1',
        title: 'Math Problems',
        status: 'published',
        createdAt: '2026-10-01T10:00:00Z',
        submission: {
          id: 'sub-1',
          assignmentId: 'asgn-1',
          studentUserId: 'student-1',
          submissionText: 'Here is solution',
          status: 'submitted',
          submittedAt: '2026-10-02T10:00:00Z',
          attemptCount: 1,
        },
      },
      {
        id: 'asgn-2',
        bookingId: 'book-1',
        tutorUserId: 'tutor-1',
        studentUserId: 'student-1',
        title: 'Physics Mechanics',
        status: 'unknown_status' as any,
        createdAt: '2026-10-03T10:00:00Z',
        submission: {
          id: 'sub-2',
          assignmentId: 'asgn-2',
          studentUserId: 'student-1',
          status: 'corrupted_status' as any,
          submittedAt: '2026-10-04T10:00:00Z',
          attemptCount: 1,
        },
      },
    ];

    const mapped = mapAssignmentRecords(rawAssignments);
    expect(mapped[0].status).toBe('published');
    expect(mapped[0].submission?.status).toBe('submitted');

    // Unknown statuses fallback to safe defaults (draft and submitted)
    expect(mapped[1].status).toBe('draft');
    expect(mapped[1].submission?.status).toBe('submitted');
  });

  it('maps attendance records and narrows unknown status to present fallback', () => {
    const rawAttendance: AttendanceRecord[] = [
      {
        id: 'att-1',
        sessionId: 'sess-1',
        participantUserId: 'stud-1',
        attendanceStatus: 'present',
        recordedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'att-2',
        sessionId: 'sess-2',
        participantUserId: 'stud-1',
        attendanceStatus: 'unexpected_val' as any,
        recordedAt: '2026-10-02T10:00:00Z',
      },
    ];

    const mapped = mapAttendanceRecords(rawAttendance);
    expect(mapped[0].attendanceStatus).toBe('present');
    expect(mapped[1].attendanceStatus).toBe('present');
  });

  it('hides SessionLifecycleActions when canManage is false (student/guardian)', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(SessionLifecycleActions, {
          locale: 'en',
          sessionId: 'sess-1',
          status: 'scheduled',
          canManage: false,
        }),
      ),
    );

    expect(html).toBe('');
  });

  it('renders start session button when canManage is true and status is scheduled', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(SessionLifecycleActions, {
          locale: 'en',
          sessionId: 'sess-1',
          status: 'scheduled',
          canManage: true,
        }),
      ),
    );

    expect(html).toContain('data-testid="start-session-btn"');
    expect(html).toContain('Start class');
  });

  it('renders complete session button when canManage is true and status is in_progress', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(SessionLifecycleActions, {
          locale: 'en',
          sessionId: 'sess-1',
          status: 'in_progress',
          canManage: true,
        }),
      ),
    );

    expect(html).toContain('data-testid="complete-session-btn"');
    expect(html).toContain('Complete class');
  });
});
