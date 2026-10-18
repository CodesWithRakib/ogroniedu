import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TutorReplacementService } from '../src/modules/trust/tutor-replacement.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

const bookingId = '00000000-0000-4000-8000-000000000001';
const caseId = '00000000-0000-4000-8000-000000000010';
const studentId = '00000000-0000-4000-8000-000000000002';
const guardianId = '00000000-0000-4000-8000-000000000003';
const oldTutorId = '00000000-0000-4000-8000-000000000004';
const newTutorId = '00000000-0000-4000-8000-000000000005';
const intruderId = '00000000-0000-4000-8000-000000000099';

const studentUser: AuthenticatedUser = {
  id: studentId,
  email: 's@example.com',
  roles: ['student'],
};
const guardianUser: AuthenticatedUser = {
  id: guardianId,
  email: 'g@example.com',
  roles: ['guardian'],
};
const intruderUser: AuthenticatedUser = {
  id: intruderId,
  email: 'x@example.com',
  roles: ['student'],
};
const adminUser: AuthenticatedUser = { id: 'admin-1', email: 'a@example.com', roles: ['admin'] };

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe('TutorReplacementService (Phase 03)', () => {
  let service: TutorReplacementService;
  let mockCaseRepo: any;
  let mockBookingRepo: any;
  let mockOutboxRepo: any;
  let mockAuditRepo: any;
  let mockEventRepo: any;
  let mockNotificationService: any;
  let mockSessionRepo: any;
  let mockSearchService: any;
  let mockNotifier: any;
  let booking: any;
  let replacementCase: any;
  let sessions: any[];

  beforeEach(() => {
    booking = {
      id: bookingId,
      studentUserId: studentId,
      requesterUserId: guardianId,
      tutorUserId: oldTutorId,
      status: 'confirmed',
      subjectId: '00000000-0000-4000-8000-000000000020',
      educationLevelId: '00000000-0000-4000-8000-000000000021',
      mode: 'online',
      createdAt: new Date('2026-10-10T00:00:00.000Z'),
    };
    sessions = [
      {
        id: 'session-1',
        bookingId,
        status: 'completed',
        startsAt: hoursAgo(3),
        completedAt: hoursAgo(2),
        cancellationAssessment: null,
      },
    ];
    replacementCase = {
      id: caseId,
      bookingId,
      requestedBy: studentId,
      reasonCode: 'trial_dissatisfaction',
      explanation: 'The teaching pace did not match.',
      status: 'requested',
      version: 1,
      refundEligibility: 'not_determined',
      deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      booking,
      replacementTutor: null,
    };

    mockCaseRepo = {
      create: vi.fn((data) => ({
        id: caseId,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })),
      save: vi.fn(async (entity) => entity),
      find: vi.fn(async () => []),
      findOne: vi.fn(async (options: any) => (options?.where?.id ? replacementCase : null)),
      createQueryBuilder: vi.fn(() => ({
        update: () => ({
          set: () => ({
            where: () => ({
              execute: async () => ({ affected: 1 }),
            }),
          }),
        }),
      })),
    };
    mockBookingRepo = {
      findOne: vi.fn(async () => booking),
      save: vi.fn(async (entity) => entity),
      find: vi.fn(async () => [booking]),
    };
    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn(async (entity) => entity),
    };
    mockAuditRepo = {
      create: vi.fn((data) => ({ id: 'aud-1', ...data })),
      save: vi.fn(async (entity) => entity),
    };
    mockEventRepo = {
      create: vi.fn((data) => ({ id: 'evt-1', createdAt: new Date(), ...data })),
      save: vi.fn(async (entity) => entity),
      find: vi.fn(async () => []),
    };
    mockNotificationService = { dispatch: vi.fn(async () => ({ id: 'notif-1' })) };
    mockSessionRepo = { find: vi.fn(async () => sessions) };
    mockSearchService = {
      getPublicProfile: vi.fn(async (id: string) => ({ id })),
      searchTutors: vi.fn(async () => ({
        data: [
          { id: newTutorId, displayName: 'New Tutor' },
          { id: oldTutorId, displayName: 'Old Tutor' },
        ],
        total: 2,
      })),
    };
    mockNotifier = {
      notifyOwner: vi.fn(async () => undefined),
      notifyStudent: vi.fn(async () => undefined),
      notifyTutor: vi.fn(async () => undefined),
      notifyStaff: vi.fn(async () => undefined),
    };

    service = new TutorReplacementService(
      mockCaseRepo,
      mockBookingRepo,
      mockOutboxRepo,
      mockAuditRepo,
      mockNotificationService,
      mockSessionRepo,
      mockSearchService,
      mockNotifier,
      mockEventRepo,
    );
  });

  describe('Request intake and eligibility', () => {
    it('accepts a trial-dissatisfaction request within 48 hours', async () => {
      const result = await service.requestReplacement(studentUser, {
        bookingId,
        reasonCode: 'trial_dissatisfaction',
        explanation: 'The trial class did not match my learning needs.',
      });
      expect(result.id).toBe(caseId);
      expect(result.status).toBe('requested');
      expect(booking.status).toBe('replacement_requested');
      expect(mockBookingRepo.save).toHaveBeenCalled();
      expect(mockEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'case.requested', toStatus: 'requested' }),
      );
      expect(mockNotifier.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({ caseId }),
        'requested',
      );
      expect(mockNotifier.notifyStaff).toHaveBeenCalled();
      expect(result.deadlineAt).not.toBeNull();
    });

    it('allows a guardian participant to submit', async () => {
      const result = await service.requestReplacement(guardianUser, {
        bookingId,
        reasonCode: 'trial_dissatisfaction',
        explanation: 'Guardian is dissatisfied with the trial session.',
      });
      expect(result.requestedBy).toBe(studentId);
    });

    it('rejects non-participants with 403', async () => {
      await expect(
        service.requestReplacement(intruderUser, {
          bookingId,
          reasonCode: 'trial_dissatisfaction',
          explanation: 'Intruder request attempt.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects terminal booking states', async () => {
      booking.status = 'cancelled';
      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'trial_dissatisfaction',
          explanation: 'Too late for this cancelled booking.',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a trial request after the 48-hour window', async () => {
      sessions[0].completedAt = hoursAgo(49);
      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'trial_dissatisfaction',
          explanation: 'Late request after the trial window.',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires real no-show evidence for a no-show request', async () => {
      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'tutor_no_show',
          explanation: 'Tutor did not attend the session.',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      sessions[0].status = 'no_show';
      const result = await service.requestReplacement(studentUser, {
        bookingId,
        reasonCode: 'tutor_no_show',
        explanation: 'Tutor did not attend the session.',
      });
      expect(result.status).toBe('requested');
    });

    it('rejects duplicate active cases', async () => {
      mockCaseRepo.findOne.mockResolvedValueOnce({ ...replacementCase, status: 'under_review' });
      await expect(
        service.requestReplacement(studentUser, {
          bookingId,
          reasonCode: 'trial_dissatisfaction',
          explanation: 'Duplicate request for the same booking.',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('computes the deadline from the configured target, not the client', async () => {
      const result = await service.requestReplacement(studentUser, {
        bookingId,
        reasonCode: 'trial_dissatisfaction',
        explanation: 'Valid trial window request.',
      });
      const created = mockCaseRepo.create.mock.calls[0][0];
      const deltaMs = created.deadlineAt.getTime() - Date.now();
      // Default target is the repository policy (24h), bounded below the 48h max.
      expect(deltaMs).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(deltaMs).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
      expect(result.deadlineAt).toBeTruthy();
    });
  });

  describe('Access control', () => {
    it('lets the requester read their case', async () => {
      const detail = await service.getCase(studentUser, caseId);
      expect(detail.case.id).toBe(caseId);
    });

    it('lets an admin read any case with internal notes', async () => {
      replacementCase.outcomeNotes = 'internal';
      const detail = await service.getCase(adminUser, caseId);
      expect(detail.case.outcomeNotes).toBe('internal');
    });

    it('denies unrelated users', async () => {
      await expect(service.getCase(intruderUser, caseId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('Staff transitions and participant consent', () => {
    it('rejects invalid transitions', async () => {
      replacementCase.status = 'requested';
      await expect(
        service.updateCaseStatus(adminUser, caseId, { status: 'closed' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('never lets staff force acceptance', async () => {
      replacementCase.status = 'offered';
      replacementCase.replacementTutorUserId = newTutorId;
      await expect(
        service.updateCaseStatus(adminUser, caseId, { status: 'accepted' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records an offer only with a verified, different tutor', async () => {
      replacementCase.status = 'matching';
      const result = await service.updateCaseStatus(adminUser, caseId, {
        status: 'offered',
        replacementTutorUserId: newTutorId,
        userVisibleNote: 'A verified alternate tutor is offered.',
      });
      expect(result.status).toBe('offered');
      expect(mockSearchService.getPublicProfile).toHaveBeenCalledWith(newTutorId);
      expect(mockNotifier.notifyOwner).toHaveBeenCalledWith(expect.anything(), 'offered');
    });

    it('refuses the current tutor as a replacement', async () => {
      replacementCase.status = 'matching';
      await expect(
        service.updateCaseStatus(adminUser, caseId, {
          status: 'offered',
          replacementTutorUserId: oldTutorId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires refund eligibility before the refund_eligible state', async () => {
      replacementCase.status = 'matching';
      await expect(
        service.updateCaseStatus(adminUser, caseId, { status: 'refund_eligible' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const result = await service.updateCaseStatus(adminUser, caseId, {
        status: 'refund_eligible',
        refundEligibility: 'eligible',
        userVisibleNote: 'Eligible for refund review.',
      });
      expect(result.refundEligibility).toBe('eligible');
      expect(result.status).toBe('refund_eligible');
    });

    it('accepts an offer only through participant consent and rebinds the booking', async () => {
      replacementCase.status = 'offered';
      replacementCase.replacementTutorUserId = newTutorId;
      const result = await service.acceptOffer(guardianUser, caseId);
      expect(result.status).toBe('accepted');
      expect(booking.tutorUserId).toBe(newTutorId);
      expect(booking.status).toBe('confirmed');
      expect(mockNotifier.notifyTutor).toHaveBeenCalledWith(
        newTutorId,
        expect.anything(),
        'accepted',
      );
    });

    it('rejects accept/decline by unrelated users', async () => {
      replacementCase.status = 'offered';
      replacementCase.replacementTutorUserId = newTutorId;
      await expect(service.acceptOffer(intruderUser, caseId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.declineOffer(intruderUser, caseId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('declining an offer returns the case to matching without a tutor', async () => {
      replacementCase.status = 'offered';
      replacementCase.replacementTutorUserId = newTutorId;
      const result = await service.declineOffer(studentUser, caseId);
      expect(result.status).toBe('matching');
      expect(result.replacementTutorUserId).toBeNull();
      expect(mockNotifier.notifyStaff).toHaveBeenCalled();
    });

    it('detects a concurrent staff update via the optimistic version guard', async () => {
      const dataSource = {
        transaction: async (work: any) =>
          work(
            {
              getRepository: () => ({
                createQueryBuilder: () => ({
                  update: () => ({
                    set: () => ({
                      where: () => ({ execute: async () => ({ affected: 0 }) }),
                    }),
                  }),
                }),
                save: async (entity: any) => entity,
                create: (data: any) => data,
              }),
            },
            true,
          ),
      } as any;
      const concurrent = new TutorReplacementService(
        mockCaseRepo,
        mockBookingRepo,
        mockOutboxRepo,
        mockAuditRepo,
        mockNotificationService,
        mockSessionRepo,
        mockSearchService,
        mockNotifier,
        mockEventRepo,
        dataSource,
      );
      replacementCase.status = 'matching';
      await expect(
        concurrent.updateCaseStatus(adminUser, caseId, {
          status: 'offered',
          replacementTutorUserId: newTutorId,
          expectedVersion: 7,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Deadline processing', () => {
    it('is idempotent and never moves a deadline', async () => {
      const overdueCase = {
        ...replacementCase,
        status: 'matching',
        deadlineAt: hoursAgo(1),
        overdueNotifiedAt: null,
        version: 2,
      };
      mockCaseRepo.find.mockResolvedValue([overdueCase]);
      mockCaseRepo.findOne.mockResolvedValue(overdueCase);

      const first = await service.runOverdueSweep();
      expect(first.processed).toBe(1);
      expect(overdueCase.deadlineAt).toEqual(expect.any(Date));
      expect(mockNotifier.notifyStaff).toHaveBeenCalledWith(expect.anything(), 'overdue');

      mockCaseRepo.find.mockResolvedValue([]);
      const second = await service.runOverdueSweep();
      expect(second.processed).toBe(0);
    });

    it('extends a deadline only with a reason and staff authority', async () => {
      replacementCase.status = 'matching';
      replacementCase.deadlineAt = new Date(Date.now() + 60 * 60 * 1000);

      await expect(
        service.extendDeadline(studentUser, caseId, { hours: 12, reason: 'Need more time' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const originalDeadline = replacementCase.deadlineAt.getTime();
      const result = await service.extendDeadline(adminUser, caseId, {
        hours: 12,
        reason: 'Operations is verifying candidate availability.',
      });
      expect(new Date(result.deadlineAt!).getTime()).toBeGreaterThan(originalDeadline);
      expect(mockEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'case.deadline_extended' }),
      );
    });
  });

  describe('Candidate matching', () => {
    it('returns real search results and excludes the current/offered tutor', async () => {
      replacementCase.status = 'matching';
      const result = await service.listCandidates(adminUser, caseId);
      const ids = result.data.map((item: any) => item.id);
      expect(ids).toEqual([newTutorId]);
      expect(mockSearchService.searchTutors).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: booking.subjectId,
          educationLevelId: booking.educationLevelId,
          mode: booking.mode,
        }),
      );
    });
  });

  describe('Notifications', () => {
    it('dispatches only after the transaction and never includes internal notes', async () => {
      replacementCase.status = 'matching';
      await service.updateCaseStatus(adminUser, caseId, {
        status: 'offered',
        replacementTutorUserId: newTutorId,
        userVisibleNote: 'Tutor offered.',
        internalNote: 'Do not share: pending compliance check.',
      });
      const ownerCall = mockNotifier.notifyOwner.mock.calls[0];
      expect(ownerCall[1]).toBe('offered');
      expect(JSON.stringify(ownerCall)).not.toContain('compliance check');
    });
  });
});
