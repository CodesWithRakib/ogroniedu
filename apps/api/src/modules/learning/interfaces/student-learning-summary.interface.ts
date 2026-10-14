import type { SessionAttendanceEntity } from '../entities/session-attendance.entity';
import type { AssignmentEntity } from '../entities/assignment.entity';
import type { AssignmentSubmissionEntity } from '../entities/assignment-submission.entity';
import type { ProgressReportEntity } from '../entities/progress-report.entity';

export interface StudentLearningSummary {
  studentUserId: string;
  metrics: {
    totalSessionsRecorded: number;
    sessionsAttended: number;
    attendanceRate: number;
    assignmentsAssigned: number;
    assignmentsCompleted: number;
    averageScore: number | null;
  };
  attendance: SessionAttendanceEntity[];
  assignments: AssignmentEntity[];
  submissions: AssignmentSubmissionEntity[];
  progressReports: ProgressReportEntity[];
}
