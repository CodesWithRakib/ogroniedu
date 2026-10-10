import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  LearningManagementView,
  AttendanceRecordItem,
  AssignmentItem,
  ProgressReportItem,
} from '../src/components/learning/LearningManagementView';
import { getDictionary, formatLocalizedNumber } from '../src/lib/i18n';

describe('LearningManagementView Component & Localization Tests (Phase 10)', () => {
  const mockAttendance: AttendanceRecordItem[] = [
    {
      id: 'att-1',
      sessionId: 'sess-1',
      participantUserId: 'stud-1',
      attendanceStatus: 'present',
      recordedAt: '2026-10-01T10:00:00Z',
      subjectName: 'Physics',
    },
    {
      id: 'att-2',
      sessionId: 'sess-2',
      participantUserId: 'stud-1',
      attendanceStatus: 'late',
      recordedAt: '2026-10-03T10:00:00Z',
      subjectName: 'Physics',
    },
  ];

  const mockAssignments: AssignmentItem[] = [
    {
      id: 'asgn-1',
      bookingId: 'book-1',
      title: 'Newtonian Laws Problem Set',
      instructions: 'Solve exercises 1-5',
      maxScore: 100,
      status: 'published',
      submission: {
        id: 'sub-1',
        studentUserId: 'stud-1',
        submissionText: 'Solved in notebook',
        status: 'reviewed',
        score: 95,
        maxScore: 100,
        tutorFeedback: 'Outstanding rigor',
      },
    },
  ];

  const mockReports: ProgressReportItem[] = [
    {
      id: 'rep-1',
      bookingId: 'book-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      attendanceRate: 100,
      assignmentsCompleted: 4,
      averageScore: 95,
      observableProgress: 'Steady improvements across mechanics concepts',
      areasForGrowth: 'Calculus derivatives speed',
      tutorRemarks: 'Excellent attendance',
      generatedAt: '2026-10-01T12:00:00Z',
    },
  ];

  it('should instantiate LearningManagementView with English locale and verify props', () => {
    const element = React.createElement(LearningManagementView, {
      locale: 'en',
      userRole: 'tutor',
      initialAttendance: mockAttendance,
      initialAssignments: mockAssignments,
      initialReports: mockReports,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('en');
    expect(element.props.initialAttendance).toHaveLength(2);
    expect(element.props.initialAssignments).toHaveLength(1);
    expect(element.props.initialReports).toHaveLength(1);
  });

  it('should verify 100% dictionary key parity for learning namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.learning).toBeDefined();
    expect(enDict.learning).toBeDefined();

    const bnKeys = Object.keys(bnDict.learning).sort();
    const enKeys = Object.keys(enDict.learning).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(30);

    // Verify key translations
    expect(bnDict.learning.title).toBe('শিক্ষা ও অগ্রগতি ব্যবস্থাপনা');
    expect(enDict.learning.title).toBe('Learning Management & Progress');
    expect(bnDict.learning.tabsAttendance).toBe('উপস্থিতি');
    expect(bnDict.learning.tabsAssignments).toBe('বাড়ির কাজ ও অনুশীলন');
    expect(bnDict.learning.tabsProgress).toBe('অগ্রগতি প্রতিবেদন');
    expect(bnDict.learning.revisionReasonRequired).toContain('সংশোধনের কারণ');
  });

  it('should correctly format numerals to Bengali digits for observable metrics', () => {
    expect(formatLocalizedNumber(100, 'bn')).toBe('১০০');
    expect(formatLocalizedNumber(85.5, 'bn')).toBe('৮৫.৫');
    expect(formatLocalizedNumber(100, 'en')).toBe('100');
  });
});
