'use client';

import React, { useState } from 'react';
import { LearningBanner } from './learningBanner';
import { LearningMetricsCards } from './learningMetricsCards';
import { LearningTabsBar, type LearningTabKey } from './learningTabsBar';
import { AttendanceTab } from './tabs/attendanceTab';
import { AssignmentsTab } from './tabs/assignmentsTab';
import { ProgressTab } from './tabs/progressTab';
import { HomeworkSubmitModal } from './modals/homeworkSubmitModal';
import { GradingModal } from './modals/gradingModal';
import { useLearningManagement } from '../hooks/use-learning-management';
import type { LearningManagementViewProps } from '../types/learning.types';

export function LearningManagementView({
  locale,
  userRole = 'tutor',
  initialAttendance = [],
  initialAssignments = [],
  initialReports = [],
  onMarkAttendance,
  onSubmitAssignment,
  onGradeSubmission,
  onGenerateReport,
}: LearningManagementViewProps) {
  void onMarkAttendance;
  void onGenerateReport;

  const [activeTab, setActiveTab] = useState<LearningTabKey>('attendance');
  const state = useLearningManagement({
    locale,
    initialAttendance,
    initialAssignments,
    initialReports,
    onSubmitAssignment,
    onGradeSubmission,
  });

  return (
    <div className="space-y-6">
      <LearningBanner locale={locale} />
      <LearningMetricsCards locale={locale} metrics={state.metrics} />

      <LearningTabsBar
        locale={locale}
        activeTab={activeTab}
        attendanceCount={state.attendanceList.length}
        assignmentCount={state.assignmentList.length}
        reportCount={state.reportList.length}
        onSelect={setActiveTab}
      />

      {activeTab === 'attendance' && (
        <AttendanceTab locale={locale} attendance={state.attendanceList} />
      )}
      {activeTab === 'assignments' && (
        <AssignmentsTab
          locale={locale}
          userRole={userRole}
          assignments={state.assignmentList}
          onSubmit={state.openSubmitModal}
          onGrade={state.openGradingModal}
        />
      )}
      {activeTab === 'progress' && <ProgressTab locale={locale} reports={state.reportList} />}

      {state.submitModalAssignment && (
        <HomeworkSubmitModal
          locale={locale}
          assignment={state.submitModalAssignment}
          text={state.submissionText}
          isPending={state.isPending}
          onTextChange={state.setSubmissionText}
          onSubmit={state.handleStudentSubmit}
          onClose={state.closeSubmitModal}
        />
      )}

      {state.gradingModalAssignment && (
        <GradingModal
          locale={locale}
          assignment={state.gradingModalAssignment}
          score={state.gradingScore}
          feedback={state.gradingFeedback}
          revisionReason={state.gradingRevisionReason}
          error={state.gradingError}
          isPending={state.isPending}
          onScoreChange={state.setGradingScore}
          onFeedbackChange={state.setGradingFeedback}
          onRevisionReasonChange={state.setGradingRevisionReason}
          onSubmit={state.handleSubmitGrading}
          onClose={state.closeGradingModal}
        />
      )}
    </div>
  );
}
