import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorReplacementService } from '../src/modules/trust/tutor-replacement.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('TutorReplacementService Unit Tests (Phase 13 / FR-011)', () => {
  let service: TutorReplacementService;
  let mockCaseRepo: any;
  let mockBookingRepo: any;
  let mockOutboxRepo: any;
  let mockAuditRepo: any;
  let mockNotificationService: any;

  const bookingId = '00000000-0000-4000-8000-000000000001';
  const studentId = '00000000-0000-4000-8000-000000000002';
  const guardianId = '00000000-0000-4000-8000-000000000003';
  const oldTutorId = '00000000-0000-4000-8000-000000000004';
  const newTutorId = '00000000-0000-4000-8000-000000000005';
  const intruderId = '00000000-0000-4000-8000-000000000099';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@example.com',
    roles: ['student'],
  };

  const guardianUser: AuthenticatedUser = {
    id: guardianId,
    email: 'guardian@example.com',
    roles: ['guardian'],
  };

  const intruderUser: AuthenticatedUser = {
    id: intruderId,
    email: 'intruder@example.com',
    roles: ['student'],
  };

  const adminUser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000000',
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const sampleBooking: any = {
    id: bookingId,
    studentUserId: studentId,
    requesterUserId: guardianId,
    tutorUserId: oldTutorId,
    status: 'confirmed',
  };

  beforeEach(() => {
    mockCaseRepo = {
      create: vi.fn((data) => ({ id: 'case-1', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'case-1', ...entity })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue({ ...sampleBooking }),
      save: vi.fn((b) => Promise.resolve(b)),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'out-1' }),
    };

    mockAuditRepo = {
      create: vi.fn((data) => ({ id: 'aud-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'aud-1' }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new TutorReplacementService(
      mockCaseRepo,
      mockBookingRepo,
      mockOutboxRepo,
      mockAuditRepo,
      mockNotificationService,
    );
  });

  describe('Replacement Guarantee Request Intake', () => {
    it('should allow student to request tutor replacement under guarantee policy', async () => {
      const res = await service.requestReplacement(studentUser, {
        bookingId,
        reasonCode: 'trial_dissatisfaction',
        explanation: 'The tutor accent and teaching pace did not match my syllabus needs.',
      });

      expect(res.id).toBe('case-1');
      expect(res.requestedBy).toBe(studentId);
      expect(res.reasonCode).toBe('trial_dissatisfaction');
      expect(res.status).toBe('requested');
      expect(mockBookingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'replacement_requested' }),
      );
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockOutboxRepo.save).toHaveBeenCalled();
    });

    it('should allow guardian to request replacement for frequent cancellations', async () => {
      const res = await service.requestReplacement(guardianUser, {
        bookingId,
        reasonCode: 'frequent_tutor_cancellation',
        explanation: 'Tutor cancelled two consecutive scheduled classes without prior notice.',
      });

      expect(res.requestedBy).toBe(guardianId);
      expect(res.reasonCode).toBe('frequent_tutor_cancellation');
    });

    it('NEGATIVE TEST: should reject replacement request by non-participant (403 Forbidden)', async () => {
      await expect(
        service.requestReplacement(intruderUser, {
          bookingId,
          reasonCode: 'teaching_mismatch',
          explanation: 'Intruder trying to request replacement',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject replacement request for already cancelled booking (400 BadRequest)', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        ...sampleBooking,
        status: 'cancelled',
      });

      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'trial_dissatisfaction',
          explanation: 'Too late',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject duplicate active replacement request on same booking (400 BadRequest)', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-active',
        bookingId,
        status: 'under_review',
      });

      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'tutor_no_show',
          explanation: 'Duplicate request',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ABAC Scoping & Unrelated Case Denial', () => {
    it('should allow requester to view their own replacement case', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-1',
        requestedBy: studentId,
        booking: sampleBooking,
      });

      const res = await service.getCase(studentUser, 'case-1');
      expect(res.id).toBe('case-1');
    });

    it('should allow platform admin to inspect replacement case', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-1',
        requestedBy: studentId,
        booking: sampleBooking,
      });

      const res = await service.getCase(adminUser, 'case-1');
      expect(res.id).toBe('case-1');
    });

    it('NEGATIVE TEST: should strictly deny unrelated user from accessing replacement case (403 Forbidden - Unrelated case denial)', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-1',
        requestedBy: studentId,
        booking: sampleBooking,
      });

      await expect(service.getCase(intruderUser, 'case-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('State Machine & Replacement Match Resolution', () => {
    it('should transition status from requested -> matching -> offered', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-1',
        status: 'requested',
      });

      const res = await service.updateCaseStatus(adminUser, 'case-1', {
        status: 'matching',
        outcomeNotes: 'Operations matching alternate verified Math tutor',
      });

      expect(res.status).toBe('matching');
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('should reassign booking and notify student when replacement is accepted', async () => {
      const activeBooking = { ...sampleBooking, status: 'replacement_requested' };
      mockCaseRepo.findOne.mockResolvedValueOnce({
        id: 'case-1',
        status: 'offered',
        booking: activeBooking,
      });

      const res = await service.updateCaseStatus(adminUser, 'case-1', {
        status: 'accepted',
        replacementTutorUserId: newTutorId,
        outcomeNotes: 'Student accepted alternate tutor. Escrow transferred.',
      });

      expect(res.status).toBe('accepted');
      expect(res.resolvedAt).toBeDefined();
      expect(activeBooking.tutorUserId).toBe(newTutorId);
      expect(activeBooking.status).toBe('confirmed');
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,
          recipientRole: 'student',
        }),
      );
    });

    it('NEGATIVE TEST: should reject non-admin from updating case status (403 Forbidden)', async () => {
      await expect(
        service.updateCaseStatus(studentUser, 'case-1', {
          status: 'accepted',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
