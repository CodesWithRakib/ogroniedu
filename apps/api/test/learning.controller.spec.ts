import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningController } from '../src/modules/learning/learning.controller';
import { LearningService } from '../src/modules/learning/learning.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('LearningController Unit Tests', () => {
  let controller: LearningController;
  let mockService: any;

  const mockTutor: AuthenticatedUser = {
    id: 'tutor-uuid-1',
    roles: ['tutor'],
    email: 'tutor@example.com',
  };

  const mockStudent: AuthenticatedUser = {
    id: 'student-uuid-1',
    roles: ['student'],
    email: 'student@example.com',
  };

  beforeEach(() => {
    mockService = {
      markAttendance: vi.fn().mockResolvedValue({
        id: 'att-1',
        attendanceStatus: 'present',
      }),
      getSessionAttendance: vi
        .fn()
        .mockResolvedValue([{ id: 'att-1', attendanceStatus: 'present' }]),
      createAssignment: vi.fn().mockResolvedValue({
        id: 'asgn-1',
        title: 'Homework 1',
      }),
      submitAssignment: vi.fn().mockResolvedValue({
        id: 'sub-1',
        status: 'submitted',
      }),
      gradeSubmission: vi.fn().mockResolvedValue({
        id: 'sub-1',
        score: 95,
        status: 'reviewed',
      }),
      generateProgressReport: vi.fn().mockResolvedValue({
        id: 'rep-1',
        attendanceRate: 100,
        averageScore: 95,
      }),
      getBookingLearningRecords: vi.fn().mockResolvedValue({
        bookingId: 'book-1',
        assignments: [],
        attendance: [],
        progressReports: [],
      }),
      getStudentLearningSummary: vi.fn().mockResolvedValue({
        studentUserId: 'student-uuid-1',
        metrics: { attendanceRate: 100 },
        attendance: [],
        assignments: [],
        submissions: [],
        progressReports: [],
      }),
    };

    controller = new LearningController(mockService as unknown as LearningService);
  });

  it('should mark attendance and return wrapped 200 response', async () => {
    const dto: any = {
      sessionId: 'sess-1',
      participantUserId: 'student-uuid-1',
      attendanceStatus: 'present',
    };
    const res = await controller.markAttendance(mockTutor, dto, 'req-1');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('att-1');
    expect(mockService.markAttendance).toHaveBeenCalledWith(mockTutor, dto, 'req-1');
  });

  it('should get session attendance', async () => {
    const res = await controller.getSessionAttendance(mockTutor, 'sess-1');
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockService.getSessionAttendance).toHaveBeenCalledWith(mockTutor, 'sess-1');
  });

  it('should create assignment and return wrapped 201 response', async () => {
    const dto: any = {
      bookingId: 'book-1',
      title: 'Homework 1',
    };
    const res = await controller.createAssignment(mockTutor, dto, 'req-2');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('asgn-1');
    expect(mockService.createAssignment).toHaveBeenCalledWith(mockTutor, dto, 'req-2');
  });

  it('should submit assignment and return wrapped 201 response', async () => {
    const dto: any = {
      submissionText: 'Solved exercises',
    };
    const res = await controller.submitAssignment(mockStudent, 'asgn-1', dto, 'req-3');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('submitted');
    expect(mockService.submitAssignment).toHaveBeenCalledWith(mockStudent, 'asgn-1', dto, 'req-3');
  });

  it('should grade submission and return wrapped 200 response', async () => {
    const dto: any = {
      score: 95,
      tutorFeedback: 'Great job',
    };
    const res = await controller.gradeSubmission(mockTutor, 'sub-1', dto, 'req-4');
    expect(res.success).toBe(true);
    expect(res.data.score).toBe(95);
    expect(mockService.gradeSubmission).toHaveBeenCalledWith(mockTutor, 'sub-1', dto, 'req-4');
  });

  it('should generate progress report and return wrapped 201 response', async () => {
    const dto: any = {
      bookingId: 'book-1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      observableProgress: 'Steady improvements',
    };
    const res = await controller.generateProgressReport(mockTutor, dto, 'req-5');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('rep-1');
    expect(mockService.generateProgressReport).toHaveBeenCalledWith(mockTutor, dto, 'req-5');
  });

  it('should get booking learning records', async () => {
    const res = await controller.getBookingLearningRecords(mockTutor, 'book-1');
    expect(res.success).toBe(true);
    expect(res.data.bookingId).toBe('book-1');
  });

  it('should get student learning summary', async () => {
    const res = await controller.getStudentLearningSummary(mockStudent, 'student-uuid-1');
    expect(res.success).toBe(true);
    expect(res.data.studentUserId).toBe('student-uuid-1');
  });
});
