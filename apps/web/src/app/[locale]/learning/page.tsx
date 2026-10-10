'use client';

import React, { use } from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { LearningManagementView } from '@/components/learning/LearningManagementView';
import { type Locale } from '@/lib/i18n';

interface LearningPageProps {
  params: Promise<{ locale: string }>;
}

export default function LearningPage({ params }: LearningPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  // Sample verified data for initial presentation
  const sampleAttendance = [
    {
      id: 'att-1',
      sessionId: 'sess-1',
      participantUserId: 'stud-1',
      attendanceStatus: 'present' as const,
      recordedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      subjectName: 'Physics (Class 10)',
      notes: 'Active engagement in problem-solving.',
    },
    {
      id: 'att-2',
      sessionId: 'sess-2',
      participantUserId: 'stud-1',
      attendanceStatus: 'late' as const,
      recordedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      subjectName: 'Physics (Class 10)',
      notes: 'Joined 10 mins late due to connectivity.',
    },
    {
      id: 'att-3',
      sessionId: 'sess-3',
      participantUserId: 'stud-1',
      attendanceStatus: 'present' as const,
      recordedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      subjectName: 'Physics (Class 10)',
    },
  ];

  const sampleAssignments = [
    {
      id: 'asgn-1',
      bookingId: 'book-1',
      title: 'Newtonian Dynamics Problem Set',
      instructions: 'Solve problems 1 through 6 on page 84. Show formula steps.',
      dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      maxScore: 100,
      status: 'published' as const,
      submission: {
        id: 'sub-1',
        studentUserId: 'stud-1',
        submissionText: 'Solved exercises attached in notebook summary.',
        status: 'reviewed' as const,
        score: 92,
        maxScore: 100,
        tutorFeedback: 'Great application of second law, minor sign error on problem 4.',
        reviewedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    },
    {
      id: 'asgn-2',
      bookingId: 'book-1',
      title: 'Optics & Snell Law Lab Analysis',
      instructions: 'Calculate refractive indices for medium A and B.',
      dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      maxScore: 50,
      status: 'published' as const,
      submission: null,
    },
  ];

  const sampleReports = [
    {
      id: 'rep-1',
      bookingId: 'book-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      attendanceRate: 100,
      assignmentsCompleted: 4,
      averageScore: 91.5,
      observableProgress:
        'Consistently completed all foundational assignments. Demonstrated strong grasp of 1D kinematics.',
      areasForGrowth: 'Improve vector resolution speed for projectile motion problems.',
      tutorRemarks:
        'Excellent attendance and responsiveness. Highly recommended to continue practice drills.',
      generatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar locale={locale} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LearningManagementView
          locale={locale}
          userRole="tutor"
          initialAttendance={sampleAttendance}
          initialAssignments={sampleAssignments}
          initialReports={sampleReports}
        />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
