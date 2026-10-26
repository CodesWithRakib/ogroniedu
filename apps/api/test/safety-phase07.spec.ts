import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { DisputesService } from '../src/modules/trust/disputes.service';
import { SafetyReportsService } from '../src/modules/trust/safety-reports.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import { SessionReschedulingService } from '../src/modules/bookings/services/session-rescheduling.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 07 — Child Safety, Safeguarding, Complaints & Disputes', () => {
  const studentId = '00000000-0000-4000-8000-000000000001';
  const guardianId = '00000000-0000-4000-8000-000000000002';
  const tutorId = '00000000-0000-4000-8000-000000000003';
  const intruderId = '00000000-0000-4000-8000-000000000099';
  const adminId = '00000000-0000-4000-a000-000000000000';
  const bookingId = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01';
  const disputeId = 'dddddddd-dddd-4ddd-addd-dddddddddd01';
  const sessionId = 'cccccccc-cccc-4ccc-accc-cccccccccc01';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@test.com',
    roles: ['student'],
  };
  const guardianUser: AuthenticatedUser = {
    id: guardianId,
    email: 'guardian@test.com',
    roles: ['guardian'],
  };
  const tutorUser: AuthenticatedUser = { id: tutorId, email: 'tutor@test.com', roles: ['tutor'] };
  const intruderUser: AuthenticatedUser = {
    id: intruderId,
    email: 'intruder@test.com',
    roles: ['student'],
  };
  const adminUser: AuthenticatedUser = { id: adminId, email: 'admin@test.com', roles: ['admin'] };

  // -------------------------------------------------------------------------
  // 1. DisputesService Suite
  // -------------------------------------------------------------------------
  describe('DisputesService', () => {
    let service: DisputesService;
    let mockDisputeRepo: any;
    let mockBookingRepo: any;
    let mockOutboxRepo: any;
    let mockAuditRepo: any;
    let mockNotificationService: any;
    let mockRefundsService: any;
    let mockDataSource: any;

    const baseBooking = {
      id: bookingId,
      studentUserId: studentId,
      requesterUserId: guardianId,
      tutorUserId: tutorId,
      status: 'confirmed',
      pricePerSessionMinor: '150000',
    };

    beforeEach(() => {
      mockDisputeRepo = {
        findOne: vi.fn(),
        create: vi.fn((d) => ({ id: disputeId, createdAt: new Date(), ...d })),
        save: vi.fn((e) => Promise.resolve({ id: e.id || disputeId, ...e })),
        createQueryBuilder: vi.fn(),
      };

      mockBookingRepo = {
        findOne: vi.fn().mockResolvedValue({ ...baseBooking }),
        save: vi.fn((b) => Promise.resolve(b)),
      };

      mockOutboxRepo = {
        create: vi.fn((d) => d),
        save: vi.fn().mockResolvedValue({ id: 'out-1' }),
      };

      mockAuditRepo = {
        create: vi.fn((d) => d),
        save: vi.fn().mockResolvedValue({ id: 'aud-1' }),
      };

      mockNotificationService = {
        dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      };

      mockRefundsService = {
        requestAndApproveForAdmin: vi.fn().mockResolvedValue({ id: 'ref-1', status: 'approved' }),
      };

      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          const manager = {
            create: vi.fn((entityClass, data) => ({ id: disputeId, ...data })),
            save: vi.fn((entityClass, data) => Promise.resolve(data)),
            findOne: vi.fn().mockImplementation((entityClass, _opts) => {
              if (entityClass.name === 'PaymentOrderEntity') {
                return Promise.resolve({ id: 'ord-1', amountMinor: '300000', status: 'succeeded' });
              }
              return Promise.resolve(null);
            }),
          };
          return cb(manager);
        }),
      };

      service = new DisputesService(
        mockDisputeRepo,
        mockBookingRepo,
        mockOutboxRepo,
        mockAuditRepo,
        mockNotificationService,
        mockRefundsService,
        mockDataSource,
      );
    });

    it('TC-DISP-001: should reject dispute opening by unrelated intruder', async () => {
      await expect(
        service.openDispute(intruderUser, {
          bookingId,
          reasonCode: 'tutor_no_show',
          description: 'Tutor did not join the class session for 30 minutes.',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-DISP-002: should allow student participant to open dispute on confirmed booking', async () => {
      const res = await service.openDispute(studentUser, {
        bookingId,
        reasonCode: 'tutor_no_show',
        description: 'Tutor never showed up for the session despite multiple calls.',
      });

      expect(res.bookingId).toBe(bookingId);
      expect(res.reasonCode).toBe('tutor_no_show');
      expect(res.status).toBe('opened');
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientRole: 'tutor',
          eventType: 'dispute.opened',
        }),
      );
    });

    it('TC-DISP-003: should reject dispute on an un-disputable booking status (e.g. requested)', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        ...baseBooking,
        status: 'requested',
      });

      await expect(
        service.openDispute(studentUser, {
          bookingId,
          reasonCode: 'poor_quality',
          description: 'Cannot dispute an unconfirmed booking request.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-DISP-004: should reject opening a dispute if an active dispute already exists', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({
        id: 'existing-disp-1',
        status: 'opened',
      });

      await expect(
        service.openDispute(guardianUser, {
          bookingId,
          reasonCode: 'curriculum_mismatch',
          description: 'Duplicate attempt to open another dispute.',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-DISP-005: should reject non-admin from resolving a dispute', async () => {
      await expect(
        service.resolveDispute(tutorUser, disputeId, {
          resolutionType: 'tutor_upheld',
          resolutionNotes: 'Tutor claims innocence',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-DISP-006: should resolve dispute with refund outcome for admin and invoke refunds service', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({
        id: disputeId,
        status: 'opened',
        disputedBy: studentId,
        booking: { ...baseBooking, status: 'disputed' },
      });

      const res = await service.resolveDispute(adminUser, disputeId, {
        resolutionType: 'refund',
        resolutionNotes: 'Tutor absence verified through system logs. Full refund approved.',
        refundAmountMinor: 150000,
      });

      expect(res.status).toBe('resolved_refund');
      expect(res.resolutionType).toBe('refund');
      expect(mockRefundsService.requestAndApproveForAdmin).toHaveBeenCalled();
    });

    it('TC-DISP-007: should resolve dispute with tutor_upheld and restore booking to completed', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({
        id: disputeId,
        status: 'under_review',
        disputedBy: studentId,
        booking: { ...baseBooking, status: 'disputed' },
      });

      const res = await service.resolveDispute(adminUser, disputeId, {
        resolutionType: 'tutor_upheld',
        resolutionNotes: 'Class was delivered in full; attendance verified.',
      });

      expect(res.status).toBe('resolved_tutor_upheld');
      expect(res.resolutionType).toBe('tutor_upheld');
    });

    it('TC-DISP-008: should enforce ABAC scoping on getDispute (intruder blocked)', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({
        id: disputeId,
        disputedBy: studentId,
        booking: { ...baseBooking },
      });

      await expect(service.getDispute(intruderUser, disputeId)).rejects.toThrow(ForbiddenException);
    });
  });

  // -------------------------------------------------------------------------
  // 2. SettlementService Escrow Freeze Invariant
  // -------------------------------------------------------------------------
  describe('SettlementService Escrow Freeze Invariant', () => {
    it('TC-FIN-001: should block settlement milestone when booking is in disputed status', async () => {
      const mockDataSource = {
        transaction: vi.fn(async (cb) => {
          const manager = {
            findOne: vi.fn().mockImplementation((entityClass) => {
              if (entityClass.name === 'BookingSessionEntity') {
                return Promise.resolve({
                  id: sessionId,
                  status: 'completed',
                  booking: {
                    id: bookingId,
                    studentUserId: studentId,
                    status: 'disputed', // <-- ACTIVE DISPUTE FREEZES ESCROW
                    pricePerSessionMinor: '150000',
                  },
                });
              }
              return Promise.resolve(null);
            }),
          };
          return cb(manager);
        }),
      };

      const settlementService = new SettlementService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockDataSource as any,
      );

      await expect(settlementService.settleMilestone(adminUser, { sessionId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. SafetyReportsService Protective Hold & Session Start Guard
  // -------------------------------------------------------------------------
  describe('Protective Safety Hold & Session Start Invariants', () => {
    let safetyService: SafetyReportsService;
    let mockReportRepo: any;
    let mockTutorProfileRepo: any;
    let mockOutboxRepo: any;
    let mockAuditRepo: any;
    let mockNotificationService: any;

    beforeEach(() => {
      mockReportRepo = {
        findOne: vi.fn().mockResolvedValue({
          id: 'rep-101',
          reportedUserId: tutorId,
          status: 'escalated',
        }),
        save: vi.fn((r) => Promise.resolve(r)),
      };

      mockTutorProfileRepo = {
        findOne: vi.fn().mockResolvedValue({
          userId: tutorId,
          safetyHoldStatus: 'clear',
          publicationStatus: 'published',
        }),
        save: vi.fn((p) => Promise.resolve(p)),
      };

      mockOutboxRepo = {
        create: vi.fn(),
        save: vi.fn().mockResolvedValue({}),
      };

      mockAuditRepo = {
        create: vi.fn((a) => a),
        save: vi.fn().mockResolvedValue({}),
      };

      mockNotificationService = {
        dispatch: vi.fn().mockResolvedValue({}),
      };

      const mockMessageRepo = {
        create: vi.fn((data) => ({ id: 'msg-1', ...data })),
        save: vi.fn((data) => Promise.resolve(data)),
        find: vi.fn().mockResolvedValue([]),
      };

      const mockEventRepo = {
        create: vi.fn((data) => ({ id: 'evt-1', ...data })),
        save: vi.fn((data) => Promise.resolve(data)),
      };

      const mockActionRepo = {
        create: vi.fn((data) => ({ id: 'act-1', ...data })),
        save: vi.fn((data) => Promise.resolve(data)),
        findOne: vi.fn().mockResolvedValue(null),
      };

      const mockFilesService = {
        issueSignedAccess: vi.fn().mockResolvedValue({
          file: { id: 'asset-1' },
          signedUrl: 'https://cdn.example.com/signed/asset-1',
          expiresAt: '2026-10-21T00:00:00Z',
        }),
      };

      const mockSafetyDataSource = {
        transaction: vi.fn(async (cb) => {
          const manager = {
            create: vi.fn((_cls, data) => ({ id: 'gen-id', ...data })),
            save: vi.fn((_cls, data) => {
              const entity = data || _cls;
              return Promise.resolve({ id: entity.id || 'rep-1', ...entity });
            }),
            findOne: vi.fn().mockImplementation((entityClass, _opts) => {
              if (entityClass.name === 'TutorProfileEntity') {
                return mockTutorProfileRepo.findOne();
              }
              if (entityClass.name === 'SafetyReportEntity') {
                return mockReportRepo.findOne();
              }
              return Promise.resolve(null);
            }),
          };
          return cb(manager);
        }),
      };

      safetyService = new SafetyReportsService(
        mockReportRepo as any,
        mockMessageRepo as any,
        mockEventRepo as any,
        mockActionRepo as any,
        mockTutorProfileRepo as any,
        mockOutboxRepo as any,
        mockAuditRepo as any,
        mockNotificationService as any,
        mockFilesService as any,
        mockSafetyDataSource as any,
      );
    });

    it('TC-SAFE-001: should allow admin to apply protective safety hold on reported tutor', async () => {
      const res = await safetyService.applyProtectiveHold(
        adminUser,
        'rep-101',
        'Investigating critical safeguarding incident report #rep-101',
      );

      expect(res.status).toBe('action_taken');
      expect(mockTutorProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          safetyHoldStatus: 'safety_hold',
          publicationStatus: 'unpublished',
        }),
      );
    });

    it('TC-SAFE-002: should block non-admin from applying protective safety hold', async () => {
      await expect(
        safetyService.applyProtectiveHold(guardianUser, 'rep-101', 'Guardian request hold'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-SAFE-003: should prevent tutor under active protective hold from starting session', async () => {
      const mockSessionRepo = {
        findOne: vi.fn().mockResolvedValue({
          id: sessionId,
          tutorUserId: tutorId,
          status: 'scheduled',
          booking: { status: 'confirmed' },
        }),
      };

      const mockTutorRepoWithHold = {
        findOne: vi.fn().mockResolvedValue({
          userId: tutorId,
          safetyHoldStatus: 'safety_hold', // Active safety hold
        }),
      };

      const sessionService = new SessionReschedulingService(
        mockSessionRepo as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockTutorRepoWithHold as any,
      );

      await expect(sessionService.startSession(sessionId, tutorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
