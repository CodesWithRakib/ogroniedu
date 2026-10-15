import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningService } from '../src/modules/learning/learning.service';
import { LearningAccessService } from '../src/modules/learning/services/learning-access.service';
import { LearningAttendanceService } from '../src/modules/learning/services/attendance.service';
import { LearningAssignmentsService } from '../src/modules/learning/services/assignments.service';
import { LearningProgressService } from '../src/modules/learning/services/progress.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

describe('LearningService Unit & Security Invariant Tests', () => {
  let service: LearningService;
  let mockAttendanceRepo: any;
  let mockAssignmentRepo: any;
  let mockSubmissionRepo: any;
  let mockProgressReportRepo: any;
  let mockBookingRepo: any;
  let mockSessionRepo: any;
  let mockGuardianLinkRepo: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const unrelatedStudentId = '99999999-9999-4999-8999-999999999999';
  const tutorId = '22222222-2222-4222-8222-222222222222';
  const unrelatedTutorId = '88888888-8888-4888-8888-888888888888';
  const guardianId = '33333333-3333-4333-8333-333333333333';
  const adminId = '44444444-4444-4444-8444-444444444444';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@example.com',
    roles: ['student'],
  };

  const unrelatedStudentUser: AuthenticatedUser = {
    id: unrelatedStudentId,
    email: 'unrelated@example.com',
    roles: ['student'],
  };

  const tutorUser: AuthenticatedUser = {
    id: tutorId,
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const unrelatedTutorUser: AuthenticatedUser = {
    id: unrelatedTutorId,
    email: 'unrelated.tutor@example.com',
    roles: ['tutor'],
  };

  const guardianUser: AuthenticatedUser = {
    id: guardianId,
    email: 'guardian@example.com',
    roles: ['guardian'],
  };

  const _adminUser: AuthenticatedUser = {
    id: adminId,
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const sessionId = 'ssssssss-ssss-4sss-8sss-ssssssssssss';
  const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const submissionId = 'subsubsub-ssss-4sss-8sss-ssssssssssss';

  const sampleBooking: any = {
    id: bookingId,
    tutorUserId: tutorId,
    studentUserId: studentId,
    subject: { nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান' },
    studentUser: { id: studentId, displayName: 'Rahim Khan' },
  };

  const sampleSession: any = {
    id: sessionId,
    bookingId,
    tutorUserId: tutorId,
    studentUserId: studentId,
    startsAt: new Date('2026-11-01T10:00:00Z'),
    endsAt: new Date('2026-11-01T11:00:00Z'),
    booking: sampleBooking,
    studentUser: { id: studentId, displayName: 'Rahim Khan' },
  };

  const sampleAssignment: any = {
    id: assignmentId,
    bookingId,
    sessionId,
    tutorUserId: tutorId,
    studentUserId: studentId,
    title: 'Kinematics Problem Set 1',
    instructions: 'Complete exercises 1 to 5',
    maxScore: 100,
    dueAt: new Date(Date.now() + 86400000), // tomorrow
    status: 'published',
    booking: sampleBooking,
    studentUser: { id: studentId, displayName: 'Rahim Khan' },
  };

  beforeEach(() => {
    mockAttendanceRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: 'att-123', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'att-123', ...entity })),
    };

    mockAssignmentRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: assignmentId, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || assignmentId, ...entity })),
    };

    mockSubmissionRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: submissionId, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || submissionId, ...entity })),
    };

    mockProgressReportRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: 'rep-123', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'rep-123', ...entity })),
    };

    mockBookingRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockSessionRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockGuardianLinkRepo = {
      findOne: vi.fn(),
      find: vi
        .fn()
        .mockResolvedValue([
          { guardianUserId: guardianId, studentUserId: studentId, status: 'active' },
        ]),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const access = new LearningAccessService(
      mockBookingRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
    ) as never;
    const attendance = new LearningAttendanceService(
      mockAttendanceRepo,
      mockSessionRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
      access as never,
      mockAuditService,
      mockNotificationService,
    ) as never;
    const assignments = new LearningAssignmentsService(
      mockAssignmentRepo,
      mockSubmissionRepo,
      mockBookingRepo,
      mockSessionRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
      mockAuditService,
      mockNotificationService,
    ) as never;
    const progress = new LearningProgressService(
      mockProgressReportRepo,
      mockBookingRepo,
      mockSessionRepo,
      mockAttendanceRepo,
      mockAssignmentRepo,
      mockSubmissionRepo,
      access as never,
      mockAuditService,
    ) as never;

    service = new LearningService(access, attendance, assignments, progress);
  });

  describe('Attendance Tracking', () => {
    it('should successfully record attendance by tutor and notify student & linked guardians', async () => {
      mockSessionRepo.findOne.mockResolvedValue(sampleSession);
      mockAttendanceRepo.findOne.mockResolvedValue(null);

      const res = await service.markAttendance(
        tutorUser,
        {
          sessionId,
          participantUserId: studentId,
          attendanceStatus: 'present',
          notes: 'Active participant',
        },
        'req-att-1',
      );

      expect(res.attendanceStatus).toBe('present');
      expect(mockAttendanceRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: tutorId,
          action: 'learning.attendance_marked',
          resourceType: 'session_attendance',
        }),
      );
      // Student notification
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,
          recipientRole: 'student',
          eventType: 'attendance.marked',
        }),
      );
      // Guardian notification
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'attendance.marked',
        }),
      );
    });

    it('NEGATIVE TEST: should reject attendance recording by unrelated learner (403 Forbidden)', async () => {
      mockSessionRepo.findOne.mockResolvedValue(sampleSession);

      await expect(
        service.markAttendance(unrelatedStudentUser, {
          sessionId,
          participantUserId: studentId,
          attendanceStatus: 'present',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject attendance if participantUserId does not match session student', async () => {
      mockSessionRepo.findOne.mockResolvedValue(sampleSession);

      await expect(
        service.markAttendance(tutorUser, {
          sessionId,
          participantUserId: unrelatedStudentId,
          attendanceStatus: 'present',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Homework Assignments', () => {
    it('should successfully create assignment by tutor and notify student & guardians', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);

      const res = await service.createAssignment(
        tutorUser,
        {
          bookingId,
          title: 'Forces & Newton Laws',
          instructions: 'Solve problems on page 42',
          maxScore: 100,
        },
        'req-asgn-1',
      );

      expect(res.title).toBe('Forces & Newton Laws');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: tutorId,
          action: 'learning.assignment_created',
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,
          eventType: 'assignment.created',
          recipientRole: 'student',
        }),
      );
    });

    it('NEGATIVE TEST: should reject assignment creation by student or unrelated tutor (403 Forbidden)', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);

      await expect(
        service.createAssignment(studentUser, {
          bookingId,
          title: 'Unauthorized Assignment',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createAssignment(unrelatedTutorUser, {
          bookingId,
          title: 'Unauthorized Assignment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Student Submissions', () => {
    it('should allow assigned learner to submit assignment', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(sampleAssignment);
      mockSubmissionRepo.findOne.mockResolvedValue(null);

      const res = await service.submitAssignment(
        studentUser,
        assignmentId,
        {
          submissionText: 'Here is my solved homework.',
          assetIds: [],
        },
        'req-sub-1',
      );

      expect(res.status).toBe('submitted');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: studentId,
          action: 'learning.assignment_submitted',
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tutorId,
          recipientRole: 'tutor',
          eventType: 'assignment.submitted',
        }),
      );
    });

    it('should tag submission as late if submitted past due date', async () => {
      const pastDueAssignment = {
        ...sampleAssignment,
        dueAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      mockAssignmentRepo.findOne.mockResolvedValue(pastDueAssignment);
      mockSubmissionRepo.findOne.mockResolvedValue(null);

      const res = await service.submitAssignment(studentUser, assignmentId, {
        submissionText: 'Late submission submission',
      });

      expect(res.status).toBe('late');
    });

    it('NEGATIVE TEST: should reject submission attempt by unrelated learner (403 Forbidden)', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(sampleAssignment);

      await expect(
        service.submitAssignment(unrelatedStudentUser, assignmentId, {
          submissionText: 'Imposter submission',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Grading & Score Revision Auditing', () => {
    const existingSubmission = {
      id: submissionId,
      assignmentId,
      studentUserId: studentId,
      assignment: sampleAssignment,
      score: null,
      maxScore: 100,
      status: 'submitted',
    };

    it('should successfully grade submission on first review', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue({ ...existingSubmission });

      const res = await service.gradeSubmission(
        tutorUser,
        submissionId,
        {
          score: 85,
          tutorFeedback: 'Good conceptual clarity.',
        },
        'req-grade-1',
      );

      expect(res.score).toBe(85);
      expect(res.status).toBe('reviewed');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: tutorId,
          action: 'learning.submission_graded',
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,
          eventType: 'assignment.graded',
          recipientRole: 'student',
        }),
      );
    });

    it('SCORE REVISION AUDIT: should record score revision audit log when updating existing score with reason', async () => {
      const alreadyGradedSubmission = {
        ...existingSubmission,
        score: 70,
        status: 'reviewed',
      };
      mockSubmissionRepo.findOne.mockResolvedValue(alreadyGradedSubmission);

      const res = await service.gradeSubmission(
        tutorUser,
        submissionId,
        {
          score: 85,
          tutorFeedback: 'Re-evaluated exercise 3 and awarded 15 additional points.',
          revisionReason: 'Re-evaluated exercise 3 based on correct second method',
        },
        'req-rev-1',
      );

      expect(res.score).toBe(85);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: tutorId,
          action: 'learning.score_revised',
          reason: 'Re-evaluated exercise 3 based on correct second method',
          safeMetadata: expect.objectContaining({
            previousScore: 70,
            newScore: 85,
          }),
        }),
      );
    });

    it('NEGATIVE TEST: should reject score revision if revisionReason is missing', async () => {
      const alreadyGradedSubmission = {
        ...existingSubmission,
        score: 70,
        status: 'reviewed',
      };
      mockSubmissionRepo.findOne.mockResolvedValue(alreadyGradedSubmission);

      await expect(
        service.gradeSubmission(tutorUser, submissionId, {
          score: 90,
          // Missing revisionReason
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject learner attempting to grade own or another assignment (403 Forbidden)', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue({ ...existingSubmission });

      await expect(
        service.gradeSubmission(studentUser, submissionId, {
          score: 100,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject score exceeding maxScore (400 BadRequest)', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue({ ...existingSubmission });

      await expect(
        service.gradeSubmission(tutorUser, submissionId, {
          score: 150, // max is 100
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Auditable Progress Reports (No Unsupported Claims)', () => {
    it('should generate progress report computing observable metrics from database records', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);
      mockSessionRepo.find.mockResolvedValue([
        { id: 's1', startsAt: new Date('2026-10-01') },
        { id: 's2', startsAt: new Date('2026-10-05') },
      ]);
      mockAttendanceRepo.find.mockResolvedValue([
        { sessionId: 's1', participantUserId: studentId, attendanceStatus: 'present' },
        { sessionId: 's2', participantUserId: studentId, attendanceStatus: 'present' },
      ]);
      mockAssignmentRepo.find.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
      mockSubmissionRepo.find.mockResolvedValue([
        { id: 'sub1', assignmentId: 'a1', score: 90, maxScore: 100, status: 'reviewed' },
        { id: 'sub2', assignmentId: 'a2', score: 80, maxScore: 100, status: 'reviewed' },
      ]);

      const report = await service.generateProgressReport(tutorUser, {
        bookingId,
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        observableProgress: 'Student demonstrates steady mastery of 1D kinematics formulas.',
        areasForGrowth: 'Calculus-based derivations require additional practice.',
        tutorRemarks: 'Excellent attendance and consistency.',
      });

      expect(report.attendanceRate).toBe(100);
      expect(report.assignmentsCompleted).toBe(2);
      expect(report.averageScore).toBe(85); // (90 + 80) / 2 = 85
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'learning.progress_report_generated',
          resourceType: 'progress_reports',
        }),
      );
    });

    it('NEGATIVE TEST: should reject report if periodEnd is before periodStart', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);

      await expect(
        service.generateProgressReport(tutorUser, {
          bookingId,
          periodStart: '2026-10-31',
          periodEnd: '2026-10-01',
          observableProgress: 'Inverted date interval',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Guardian & Student Record Visibility (ABAC)', () => {
    it('should allow student to view own learning summary', async () => {
      mockAttendanceRepo.find.mockResolvedValue([]);
      mockAssignmentRepo.find.mockResolvedValue([]);
      mockSubmissionRepo.find.mockResolvedValue([]);
      mockProgressReportRepo.find.mockResolvedValue([]);

      const summary = await service.getStudentLearningSummary(studentUser, studentId);
      expect(summary.studentUserId).toBe(studentId);
    });

    it('should allow active linked guardian to view child learning summary', async () => {
      mockGuardianLinkRepo.findOne.mockResolvedValue({
        guardianUserId: guardianId,
        studentUserId: studentId,
        status: 'active',
      });
      mockAttendanceRepo.find.mockResolvedValue([]);
      mockAssignmentRepo.find.mockResolvedValue([]);
      mockSubmissionRepo.find.mockResolvedValue([]);
      mockProgressReportRepo.find.mockResolvedValue([]);

      const summary = await service.getStudentLearningSummary(guardianUser, studentId);
      expect(summary.studentUserId).toBe(studentId);
    });

    it('NEGATIVE TEST: should reject unrelated learner viewing another student learning summary (403 Forbidden)', async () => {
      mockGuardianLinkRepo.findOne.mockResolvedValue(null);
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getStudentLearningSummary(unrelatedStudentUser, studentId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject revoked guardian from accessing child records (403 Forbidden)', async () => {
      mockGuardianLinkRepo.findOne.mockResolvedValue(null); // No active link
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.getStudentLearningSummary(guardianUser, studentId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
