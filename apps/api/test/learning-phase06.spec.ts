import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import {
  computeAttendanceMetrics,
  computeAverageScorePercent,
  computeCompletionRate,
} from '../src/modules/learning/utils/learning-metrics';
import {
  assertGoalTransition,
  isTerminalGoal,
} from '../src/modules/learning/utils/learning-goal-transitions';
import { LearningAccessService } from '../src/modules/learning/services/learning-access.service';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import { LearningAttendanceService } from '../src/modules/learning/services/attendance.service';
import { LearningAssignmentsService } from '../src/modules/learning/services/assignments.service';
import { LearningMaterialsService } from '../src/modules/learning/services/learning-materials.service';
import { SessionSchedulingService } from '../src/modules/bookings/services/session-scheduling.service';
import { SessionReschedulingService } from '../src/modules/bookings/services/session-rescheduling.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER_STUDENT = '99999999-9999-4999-8999-999999999999';
const TUTOR = '22222222-2222-4222-8222-222222222222';
const OTHER_TUTOR = '88888888-8888-4888-8888-888888888888';
const ADMIN = '44444444-4444-4444-8444-444444444444';
const GUARDIAN = '33333333-3333-4333-8333-333333333333';
const BOOKING = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ASSIGNMENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SUBMISSION = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const studentUser: AuthenticatedUser = { id: STUDENT, email: 's@x.com', roles: ['student'] };
const tutorUser: AuthenticatedUser = { id: TUTOR, email: 't@x.com', roles: ['tutor'] };
const guardianUser: AuthenticatedUser = { id: GUARDIAN, email: 'g@x.com', roles: ['guardian'] };
const adminUser: AuthenticatedUser = { id: ADMIN, email: 'a@x.com', roles: ['admin'] };

const bookingRow = {
  id: BOOKING,
  tutorUserId: TUTOR,
  studentUserId: STUDENT,
  requesterUserId: GUARDIAN,
  subjectId: 'subj-1',
  status: 'confirmed',
  pricePerSessionMinor: 100000,
  durationMinutes: 60,
};

const sessionRow = {
  id: SESSION,
  bookingId: BOOKING,
  tutorUserId: TUTOR,
  studentUserId: STUDENT,
  startsAt: new Date(Date.now() - 5 * 86_400_000),
  endsAt: new Date(Date.now() - 4 * 86_400_000),
  timezone: 'Asia/Dhaka',
  status: 'completed',
  actualStartedAt: new Date(Date.now() - 5 * 86_400_000),
  booking: { ...bookingRow, subject: { nameEn: 'Physics' } },
  studentUser: { id: STUDENT, displayName: 'Rahim' },
};

function accessWith(linkRepo: Record<string, unknown>, bookingRepo: Record<string, unknown>) {
  return new LearningAccessService(
    bookingRepo as never,
    new GuardianAccessService(linkRepo as never),
  );
}

describe('Phase 06 — attendance metrics', () => {
  it('counts present+late, excludes excused, and never fabricates 100%', () => {
    const metrics = computeAttendanceMetrics(['present', 'late', 'absent', 'excused'], 6);
    expect(metrics.recorded).toBe(3);
    expect(metrics.attended).toBe(2);
    expect(metrics.attendanceRate).toBeCloseTo(66.67, 1);
    expect(metrics.notRecorded).toBe(3);
    expect(metrics.coverage).toBeCloseTo(50, 1);
  });

  it('returns null when nothing was recorded', () => {
    const metrics = computeAttendanceMetrics([], 4);
    expect(metrics.attendanceRate).toBeNull();
    expect(metrics.coverage).toBe(0);
  });

  it('computes reviewed-only average scores', () => {
    expect(
      computeAverageScorePercent([
        { score: 90, maxScore: 100 },
        { score: null, maxScore: 100 },
      ]),
    ).toBe(90);
    expect(computeAverageScorePercent([])).toBeNull();
  });

  it('completion rate denominator is published assignments only', () => {
    expect(computeCompletionRate(2, 4)).toBe(50);
    expect(computeCompletionRate(0, 0)).toBeNull();
  });
});

describe('Phase 06 — learning goal transitions', () => {
  it('allows open → achieved and terminal states never reopen', () => {
    expect(() => assertGoalTransition('open', 'achieved')).not.toThrow();
    expect(isTerminalGoal('achieved')).toBe(true);
    expect(() => assertGoalTransition('achieved', 'open')).toThrow(BadRequestException);
  });
});

describe('Phase 06 — session lifecycle', () => {
  const audit = { record: vi.fn().mockResolvedValue({}) };
  const notification = { dispatch: vi.fn().mockResolvedValue({}) };
  let sessionRepo: any;
  let outboxRepo: any;

  beforeEach(() => {
    sessionRepo = {
      findOne: vi.fn(),
      save: vi.fn(async (row: any) => row),
      createQueryBuilder: vi.fn(),
    };
    outboxRepo = {
      create: vi.fn((row: any) => row),
      save: vi.fn(async (row: any) => row),
    };
  });

  it('rejects a student starting a session', async () => {
    sessionRepo.findOne.mockResolvedValue({ ...sessionRow, status: 'scheduled' });
    const service = new SessionReschedulingService(
      sessionRepo,
      outboxRepo,
      audit as never,
      notification as never,
      { assertCanManageSessions: vi.fn() } as never,
    );
    await expect(service.startSession(SESSION, studentUser)).rejects.toThrow(ForbiddenException);
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  it('starts a session once, recording the actual start and a durable event', async () => {
    sessionRepo.findOne.mockResolvedValue({ ...sessionRow, status: 'scheduled', booking: { ...bookingRow, subject: { nameEn: 'Physics' } } });
    const service = new SessionReschedulingService(
      sessionRepo,
      outboxRepo,
      audit as never,
      notification as never,
      { assertCanManageSessions: vi.fn() } as never,
    );
    const saved = await service.startSession(SESSION, tutorUser);
    expect(saved.status).toBe('in_progress');
    expect(saved.actualStartedAt).toBeInstanceOf(Date);
    expect(outboxRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'session.started' }),
    );
  });

  it('returns the same row for a repeated completion without side effects', async () => {
    sessionRepo.findOne.mockResolvedValue({
      ...sessionRow,
      status: 'completed',
      completedAt: new Date(),
    });
    const service = new SessionReschedulingService(
      sessionRepo,
      outboxRepo,
      audit as never,
      notification as never,
      { assertCanManageSessions: vi.fn() } as never,
    );
    await service.completeSession(SESSION, tutorUser);
    expect(sessionRepo.save).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('refuses completion before the session was started', async () => {
    sessionRepo.findOne.mockResolvedValue({
      ...sessionRow,
      status: 'in_progress',
      actualStartedAt: null,
    });
    const service = new SessionReschedulingService(
      sessionRepo,
      outboxRepo,
      audit as never,
      notification as never,
      { assertCanManageSessions: vi.fn() } as never,
    );
    await expect(service.completeSession(SESSION, tutorUser)).rejects.toThrow(BadRequestException);
  });

  it('replays the same session for a repeated scheduling idempotency key', async () => {
    const existing = { ...sessionRow, idempotencyKey: 'key-1' };
    sessionRepo.findOne.mockResolvedValue(existing);
    const service = new SessionSchedulingService(
      {
        findOne: vi.fn().mockResolvedValue(bookingRow),
        save: vi.fn(),
      } as never,
      sessionRepo,
      outboxRepo,
      audit as never,
      notification as never,
      { assertCanManageSessions: vi.fn().mockResolvedValue(undefined) } as never,
    );
    const result = await service.scheduleSession(
      tutorUser,
      { bookingId: BOOKING, startsAt: new Date(Date.now() + 86_400_000).toISOString() },
      'key-1',
    );
    expect(result).toBe(existing);
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });
});

describe('Phase 06 — attendance permissions and corrections', () => {
  let attendanceRepo: any;
  let sessionRepo: any;
  let audit: any;

  beforeEach(() => {
    attendanceRepo = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((row: any) => row),
      save: vi.fn(async (row: any) => row),
    };
    sessionRepo = { findOne: vi.fn().mockResolvedValue(sessionRow) };
    audit = { record: vi.fn().mockResolvedValue({}) };
  });

  function service() {
    const access = accessWith(
      { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockResolvedValue([]) },
      { findOne: vi.fn().mockResolvedValue(bookingRow) },
    );
    return new LearningAttendanceService(
      attendanceRepo,
      sessionRepo,
      new GuardianAccessService({ find: vi.fn().mockResolvedValue([]) } as never),
      access as never,
      audit,
      { dispatch: vi.fn().mockResolvedValue({}) } as never,
    );
  }

  it('rejects attendance for a cancelled session', async () => {
    sessionRepo.findOne.mockResolvedValue({ ...sessionRow, status: 'cancelled' });
    await expect(
      service().markAttendance(tutorUser, {
        sessionId: SESSION,
        participantUserId: STUDENT,
        attendanceStatus: 'present',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('treats an identical repeat as a no-op', async () => {
    attendanceRepo.findOne.mockResolvedValue({
      id: 'att-1',
      attendanceStatus: 'present',
      notes: null,
    });
    const result = await service().markAttendance(tutorUser, {
      sessionId: SESSION,
      participantUserId: STUDENT,
      attendanceStatus: 'present',
    });
    expect(result.id).toBe('att-1');
    expect(attendanceRepo.save).not.toHaveBeenCalled();
  });

  it('requires a correction reason inside the edit window', async () => {
    attendanceRepo.findOne.mockResolvedValue({
      id: 'att-1',
      attendanceStatus: 'absent',
      notes: null,
    });
    sessionRepo.findOne.mockResolvedValue({
      ...sessionRow,
      endsAt: new Date(),
      status: 'completed',
    });
    await expect(
      service().markAttendance(tutorUser, {
        sessionId: SESSION,
        participantUserId: STUDENT,
        attendanceStatus: 'present',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a tutor correction after the 72-hour window but allows admins', async () => {
    attendanceRepo.findOne.mockResolvedValue({
      id: 'att-1',
      attendanceStatus: 'absent',
      notes: null,
    });
    await expect(
      service().markAttendance(tutorUser, {
        sessionId: SESSION,
        participantUserId: STUDENT,
        attendanceStatus: 'present',
        correctionReason: 'Recorded late',
      }),
    ).rejects.toThrow(ForbiddenException);

    const saved = await service().markAttendance(adminUser, {
      sessionId: SESSION,
      participantUserId: STUDENT,
      attendanceStatus: 'present',
      correctionReason: 'Admin correction after review',
    });
    expect(saved.attendanceStatus).toBe('present');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'learning.attendance_corrected' }),
    );
  });
});

describe('Phase 06 — homework lifecycle', () => {
  let assignmentRepo: any;
  let submissionRepo: any;
  let revisionRepo: any;
  let materialsService: any;
  let service: LearningAssignmentsService;

  const assignment = {
    id: ASSIGNMENT,
    bookingId: BOOKING,
    tutorUserId: TUTOR,
    studentUserId: STUDENT,
    title: 'Newton laws',
    instructions: 'Solve',
    maxScore: 100,
    dueAt: null,
    status: 'published',
    resubmissionAllowed: true,
    lateSubmissionAllowed: true,
    maxAttempts: 2,
    createdAt: new Date(),
    booking: bookingRow,
    studentUser: { id: STUDENT, displayName: 'Rahim' },
  };

  beforeEach(() => {
    assignmentRepo = {
      findOne: vi.fn().mockResolvedValue(assignment),
      find: vi.fn(),
      create: vi.fn((row: any) => row),
      save: vi.fn(async (row: any) => row),
      createQueryBuilder: vi.fn(),
    };
    submissionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((row: any) => row),
      save: vi.fn(async (row: any) => row),
    };
    revisionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((r: any) => r),
      save: vi.fn(async (r: any) => r),
    };
    materialsService = { assertParticipantFileAssets: vi.fn().mockResolvedValue(undefined) };
    const access = accessWith(
      { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockResolvedValue([]) },
      { findOne: vi.fn().mockResolvedValue(bookingRow) },
    );
    service = new LearningAssignmentsService(
      assignmentRepo,
      submissionRepo,
      { findOne: vi.fn().mockResolvedValue(bookingRow) } as never,
      { findOne: vi.fn() } as never,
      new GuardianAccessService({ find: vi.fn().mockResolvedValue([]) } as never),
      { record: vi.fn().mockResolvedValue({}) } as never,
      { dispatch: vi.fn().mockResolvedValue({}) } as never,
      access as never,
      revisionRepo,
      undefined,
      materialsService,
    );
  });

  it('rejects submissions to a draft assignment', async () => {
    assignmentRepo.findOne.mockResolvedValue({ ...assignment, status: 'draft' });
    await expect(
      service.submitAssignment(studentUser, ASSIGNMENT, { submissionText: 'Done' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a late submission when the policy forbids it', async () => {
    assignmentRepo.findOne.mockResolvedValue({
      ...assignment,
      dueAt: new Date(Date.now() - 60_000),
      lateSubmissionAllowed: false,
    });
    await expect(
      service.submitAssignment(studentUser, ASSIGNMENT, { submissionText: 'Done' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces the attempt limit', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: SUBMISSION,
      assignmentId: ASSIGNMENT,
      studentUserId: STUDENT,
      status: 'submitted',
      attemptCount: 2,
      submittedAt: new Date(),
    });
    await expect(
      service.submitAssignment(studentUser, ASSIGNMENT, { submissionText: 'Again' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('snapshots the previous attempt before a resubmission', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: SUBMISSION,
      assignmentId: ASSIGNMENT,
      studentUserId: STUDENT,
      status: 'submitted',
      attemptCount: 1,
      submissionText: 'First try',
      assetIds: [],
      submittedAt: new Date(),
      maxScore: 100,
    });
    await service.submitAssignment(studentUser, ASSIGNMENT, { submissionText: 'Second try' });
    expect(revisionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 1, submissionText: 'First try' }),
    );
  });

  it('rejects a foreign attachment before persisting', async () => {
    materialsService.assertParticipantFileAssets.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.submitAssignment(studentUser, ASSIGNMENT, {
        submissionText: 'See file',
        assetIds: ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'],
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to review another tutor’s submission', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: SUBMISSION,
      assignmentId: ASSIGNMENT,
      studentUserId: STUDENT,
      status: 'submitted',
      score: null,
      assignment,
    });
    await expect(
      service.gradeSubmission(
        { id: OTHER_TUTOR, email: 'o@x.com', roles: ['tutor'] },
        SUBMISSION,
        { score: 10 },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a score above the assignment maximum', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: SUBMISSION,
      assignmentId: ASSIGNMENT,
      studentUserId: STUDENT,
      status: 'submitted',
      score: null,
      assignment,
    });
    await expect(
      service.gradeSubmission(tutorUser, SUBMISSION, { score: 150 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('is idempotent when the same review is submitted twice', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: SUBMISSION,
      assignmentId: ASSIGNMENT,
      studentUserId: STUDENT,
      status: 'reviewed',
      score: 80,
      tutorFeedback: 'Good',
      assignment,
    });
    await service.gradeSubmission(tutorUser, SUBMISSION, { score: 80, tutorFeedback: 'Good' });
    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('does not allow a guardian to submit for the student', async () => {
    await expect(
      service.submitAssignment(guardianUser, ASSIGNMENT, { submissionText: 'Guardian work' }),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('Phase 06 — learning materials validation', () => {
  it('rejects traversal filenames, MIME mismatches, and replies 404 for unrelated downloads', async () => {
    const bookingRepo = { findOne: vi.fn().mockResolvedValue(bookingRow) };
    const linkRepo = { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockResolvedValue([]) };
    const access = accessWith(linkRepo, bookingRepo);
    const materialRepo = { findOne: vi.fn().mockResolvedValue(null) };
    const service = new LearningMaterialsService(
      materialRepo as never,
      { findOne: vi.fn() } as never,
      { findOne: vi.fn() } as never,
      { findOne: vi.fn() } as never,
      { findOne: vi.fn(), create: vi.fn((r: any) => r), save: vi.fn(async (r: any) => r) } as never,
      { verifyMagicBytes: vi.fn().mockReturnValue(false) } as never,
      access as never,
      new GuardianAccessService(linkRepo as never),
      { record: vi.fn().mockResolvedValue({}) } as never,
    );

    await expect(
      service.uploadFile(tutorUser, {
        bookingId: BOOKING,
        title: 'Notes',
        originalFilename: '../secrets.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 10,
        contentBase64: Buffer.from('%PDF-1.4').toString('base64'),
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.uploadFile(tutorUser, {
        bookingId: BOOKING,
        title: 'Notes',
        originalFilename: 'notes.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 10,
        contentBase64: Buffer.from('not a pdf').toString('base64'),
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(service.downloadMaterial(studentUser, 'missing')).rejects.toThrow();
  });
});
