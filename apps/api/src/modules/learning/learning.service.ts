import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { LearningAccessService } from './services/learning-access.service';
import { LearningAttendanceService } from './services/attendance.service';
import { LearningAssignmentsService } from './services/assignments.service';
import { LearningProgressService } from './services/progress.service';
import {
  MarkAttendanceDto,
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  CreateProgressReportDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type { StudentLearningSummary } from './services/progress.service';

/**
 * Backward-compatible facade over the split learning domain services.
 * Controllers and other modules keep importing LearningService; new code
 * should inject LearningAccessService / LearningAttendanceService /
 * LearningAssignmentsService / LearningProgressService directly.
 */
@Injectable()
export class LearningService {
  constructor(
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(forwardRef(() => LearningAttendanceService))
    private readonly attendance: LearningAttendanceService,
    @Inject(forwardRef(() => LearningAssignmentsService))
    private readonly assignments: LearningAssignmentsService,
    @Inject(forwardRef(() => LearningProgressService))
    private readonly progress: LearningProgressService,
  ) {}

  assertCanAccessStudentRecords(
    user: AuthenticatedUser,
    studentUserId: string,
    bookingId?: string,
  ) {
    return this.access.assertCanAccessStudentRecords(user, studentUserId, bookingId);
  }
  markAttendance(user: AuthenticatedUser, dto: MarkAttendanceDto, requestId?: string) {
    return this.attendance.markAttendance(user, dto, requestId);
  }
  getSessionAttendance(user: AuthenticatedUser, sessionId: string) {
    return this.attendance.getSessionAttendance(user, sessionId);
  }
  createAssignment(user: AuthenticatedUser, dto: CreateAssignmentDto, requestId?: string) {
    return this.assignments.createAssignment(user, dto, requestId);
  }
  submitAssignment(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: SubmitAssignmentDto,
    requestId?: string,
  ) {
    return this.assignments.submitAssignment(user, assignmentId, dto, requestId);
  }
  gradeSubmission(
    user: AuthenticatedUser,
    submissionId: string,
    dto: GradeSubmissionDto,
    requestId?: string,
  ) {
    return this.assignments.gradeSubmission(user, submissionId, dto, requestId);
  }
  generateProgressReport(
    user: AuthenticatedUser,
    dto: CreateProgressReportDto,
    requestId?: string,
  ) {
    return this.progress.generateProgressReport(user, dto, requestId);
  }
  getBookingLearningRecords(user: AuthenticatedUser, bookingId: string) {
    return this.progress.getBookingLearningRecords(user, bookingId);
  }
  getStudentLearningSummary(user: AuthenticatedUser, studentUserId: string) {
    return this.progress.getStudentLearningSummary(user, studentUserId);
  }
}
