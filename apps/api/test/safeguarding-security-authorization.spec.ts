import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { SafetyReportsService } from '../src/modules/trust/safety-reports.service';
import { DisputesService } from '../src/modules/trust/disputes.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { interpolateTemplate, getNotificationDefinition } from '@ogroniedu/contracts';

describe('Safeguarding Security, 12 Mandatory Authorization Gates & E2E Workflows', () => {
  // Test Users across all relevant roles
  const studentAlice: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'alice.student@example.com',
    roles: ['student'],
  };

  const studentBob: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'bob.student@example.com',
    roles: ['student'],
  };

  const guardianAlice: AuthenticatedUser = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'guardian.alice@example.com',
    roles: ['guardian'],
  };

  const accusedTutor: AuthenticatedUser = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'accused.tutor@example.com',
    roles: ['tutor'],
  };

  const supportAgent: AuthenticatedUser = {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'support.agent@example.com',
    roles: ['support_agent'],
  };

  const complianceReviewer: AuthenticatedUser = {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'compliance.reviewer@example.com',
    roles: ['compliance_reviewer'],
  };

  const implicatedInvestigator: AuthenticatedUser = {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'implicated.investigator@example.com',
    roles: ['compliance_reviewer', 'admin'],
  };

  const orgOwner: AuthenticatedUser = {
    id: '88888888-8888-4888-8888-888888888888',
    email: 'org.owner@example.com',
    roles: ['organization_owner'],
  };

  const adminUser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000000',
    email: 'admin@ogroni.edu.bd',
    roles: ['admin', 'super_admin'],
  };

  let service: SafetyReportsService;
  let mockReportRepo: any;
  let mockMessageRepo: any;
  let mockEventRepo: any;
  let mockActionRepo: any;
  let mockTutorProfileRepo: any;
  let mockOutboxRepo: any;
  let mockAuditRepo: any;
  let mockNotificationService: any;
  let mockFilesService: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockReportRepo = {
      create: vi.fn((data) => ({ id: 'rep-test-01', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'rep-test-01', ...entity })),
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
    };

    mockMessageRepo = {
      create: vi.fn((data) => ({ id: 'msg-test-01', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      find: vi.fn().mockResolvedValue([]),
    };

    mockEventRepo = {
      create: vi.fn((data) => ({ id: 'evt-test-01', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockActionRepo = {
      create: vi.fn((data) => ({ id: 'act-test-01', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockTutorProfileRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: 'tp-1',
        userId: accusedTutor.id,
        safetyHoldStatus: 'clear',
        publicationStatus: 'published',
      }),
      save: vi.fn((tp) => Promise.resolve(tp)),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-test-01', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'out-test-01' }),
    };

    mockAuditRepo = {
      create: vi.fn((data) => ({ id: 'aud-test-01', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'aud-test-01' }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-test-01' }),
    };

    mockFilesService = {
      issueSignedAccess: vi.fn().mockResolvedValue({
        file: { id: 'asset-valid' },
        signedUrl: 'https://cdn.example.com/signed/asset-valid',
        expiresAt: '2026-10-21T00:00:00Z',
      }),
    };

    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const manager = {
          create: vi.fn((cls, data) => ({ id: 'gen-id', ...data })),
          save: vi.fn((cls, data) => {
            const entity = data || cls;
            if (cls?.name === 'TutorProfileEntity' || entity?.safetyHoldStatus) {
              mockTutorProfileRepo.save(entity);
            }
            return Promise.resolve({ id: entity.id || 'gen-id', ...entity });
          }),
          findOne: vi.fn().mockImplementation((cls, _opts) => {
            if (cls?.name === 'SafetyReportEntity') return mockReportRepo.findOne();
            if (cls?.name === 'TutorProfileEntity') return mockTutorProfileRepo.findOne();
            if (cls?.name === 'PaymentOrderEntity') {
              return Promise.resolve({ id: 'order-1', amountMinor: '300000', status: 'succeeded' });
            }
            return Promise.resolve(null);
          }),
        };
        return cb(manager);
      }),
    };

    service = new SafetyReportsService(
      mockReportRepo,
      mockMessageRepo,
      mockEventRepo,
      mockActionRepo,
      mockTutorProfileRepo,
      mockOutboxRepo,
      mockAuditRepo,
      mockNotificationService,
      mockFilesService,
      mockDataSource,
    );
  });

  // ===========================================================================
  // SECTION 1: 12 MANDATORY AUTHORIZATION TESTS
  // ===========================================================================
  describe('12 Mandatory Authorization Security Gates', () => {
    // Gate 1: Accused tutor cannot read confidential report submitted about them
    it('GATE 1: accused tutor cannot read confidential report submitted about that tutor', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-001',
        reporterUserId: studentAlice.id,
        reportedUserId: accusedTutor.id,
        isConfidential: true,
        category: 'child_safety',
      });

      await expect(service.getReport(accusedTutor, 'rep-001')).rejects.toThrow(ForbiddenException);
    });

    // Gate 2: Guardian cannot automatically access confidential report submitted by minor child
    it('GATE 2: guardian cannot automatically access confidential report submitted by child', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-002',
        reporterUserId: studentAlice.id,
        reportedUserId: accusedTutor.id,
        isConfidential: true,
        category: 'abuse_exploitation',
      });

      await expect(service.getReport(guardianAlice, 'rep-002')).rejects.toThrow(ForbiddenException);
    });

    // Gate 3: Student cannot read another student's case
    it('GATE 3: student cannot read another student case', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-003',
        reporterUserId: studentAlice.id,
        reportedUserId: accusedTutor.id,
        isConfidential: true,
        category: 'harassment',
      });

      await expect(service.getReport(studentBob, 'rep-003')).rejects.toThrow(ForbiddenException);
    });

    // Gate 4: Support agent cannot access unassigned sensitive case without required permission
    it('GATE 4: support agent cannot access an unassigned sensitive safeguarding case', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-004',
        reporterUserId: studentAlice.id,
        assignedTo: null,
        isConfidential: true,
        category: 'child_safety',
      });

      await expect(service.getReport(supportAgent, 'rep-004')).rejects.toThrow(ForbiddenException);
    });

    // Gate 5: Organization owner cannot access confidential report simply because reporter belongs to org
    it('GATE 5: organization owner cannot access a confidential report simply by tenancy', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-005',
        reporterUserId: studentAlice.id,
        isConfidential: true,
        category: 'inappropriate_communication',
      });

      await expect(service.getReport(orgOwner, 'rep-005')).rejects.toThrow(ForbiddenException);
    });

    // Gate 6: Investigator implicated in a case cannot assign the case to themselves or alter it
    it('GATE 6: investigator implicated in a case cannot assign case to themselves or alter it', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        id: 'rep-006',
        reporterUserId: studentAlice.id,
        reportedUserId: implicatedInvestigator.id,
        conflictUserIds: [implicatedInvestigator.id],
      });

      // Attempt 1: Implicated staff attempting to assign
      await expect(
        service.assignCase(implicatedInvestigator, 'rep-006', {
          assignedTo: complianceReviewer.id,
        }),
      ).rejects.toThrow(ForbiddenException);

      // Attempt 2: Assigning case TO the implicated staff
      await expect(
        service.assignCase(adminUser, 'rep-006', { assignedTo: implicatedInvestigator.id }),
      ).rejects.toThrow(ConflictException);
    });

    // Gate 7: User cannot download another case's evidence by changing attachment ID
    it('GATE 7: user cannot download another case evidence by changing attachment ID', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-007',
        reporterUserId: studentAlice.id,
        reportedUserId: accusedTutor.id,
        evidenceAssetIds: ['asset-valid-1', 'asset-valid-2'],
        messages: [],
      });

      // Attacker attempts to download 'asset-foreign-999' not belonging to this case
      await expect(
        service.getEvidenceAccess(complianceReviewer, 'rep-007', 'asset-foreign-999'),
      ).rejects.toThrow(ForbiddenException);
    });

    // Gate 8: Public API request cannot set case to resolved or closed arbitrarily
    it('GATE 8: unauthorized user cannot arbitrarily resolve or close a case', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-008',
        reporterUserId: studentAlice.id,
        status: 'under_review',
        assignedTo: complianceReviewer.id,
      });

      // Student attempts to resolve the case directly
      await expect(
        service.resolveCase(studentAlice, 'rep-008', {
          resolutionNotes: 'Attempting unauthorized self-resolution',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    // Gate 9: Unauthorized user cannot apply or remove a safety restriction
    it('GATE 9: unauthorized user cannot apply or remove a safety restriction', async () => {
      // Student attempts to apply a tutor safety hold
      await expect(
        service.applySafetyAction(studentAlice, 'rep-009', {
          actionType: 'tutor_safety_hold',
          targetUserId: accusedTutor.id,
          reason: 'I want this tutor suspended',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    // Gate 10: Financial dispute cannot trigger duplicate refund or bypass ledger invariants
    it('GATE 10: financial dispute settlement is frozen when booking is in disputed status', async () => {
      const mockSettlementDataSource = {
        transaction: vi.fn(async (cb) => {
          const manager = {
            findOne: vi.fn().mockImplementation((cls, _opts) => {
              if (cls?.name === 'BookingSessionEntity') {
                return Promise.resolve({
                  id: 'session-disp-1',
                  status: 'completed',
                  booking: {
                    id: 'bk-disputed-1',
                    studentUserId: studentAlice.id,
                    status: 'disputed', // Escrow freeze active
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
        mockSettlementDataSource as any,
      );

      await expect(
        settlementService.settleMilestone(adminUser, { sessionId: 'session-disp-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    // Gate 11: Case notifications do not expose confidential allegations to unauthorized recipients
    it('GATE 11: case notifications do not expose confidential allegations in templates', () => {
      const def = getNotificationDefinition('safeguarding.urgent_review_required');
      expect(def.templateEn.body).not.toContain('allegation');
      expect(def.templateEn.body).not.toContain('accused');
      expect(def.templateEn.body).toBe(
        'Urgent safeguarding alert requires immediate authorized triage (#{{caseId}}).',
      );

      const rendered = interpolateTemplate(def.templateEn.body, { caseId: 'CASE-999' });
      expect(rendered).toBe(
        'Urgent safeguarding alert requires immediate authorized triage (#CASE-999).',
      );
    });

    // Gate 12: Case state update cannot succeed without its required audit record
    it('GATE 12: case state update cannot succeed without committing its required audit event', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-012',
        status: 'submitted',
        assignedTo: complianceReviewer.id,
      });

      // Simulate database failure during event commit
      mockDataSource.transaction.mockImplementationOnce(async () => {
        throw new Error('Database transaction aborted: event commit failed');
      });

      await expect(
        service.updateCaseStatus(complianceReviewer, 'rep-012', {
          status: 'under_review',
          reason: 'Starting formal review',
        }),
      ).rejects.toThrow('Database transaction aborted');
    });
  });

  // ===========================================================================
  // SECTION 2: 5 END-TO-END WORKFLOW TESTS
  // ===========================================================================
  describe('5 End-to-End Workflow Verifications', () => {
    // Flow A: General Complaint
    it('FLOW A: General Service Complaint Lifecycle (Submit -> Assign -> Info Exchange -> Resolve)', async () => {
      // 1. Student submits service complaint
      const report = await service.createReport(studentAlice, {
        category: 'general_complaint',
        severity: 'low',
        description: 'Tutor frequently arrives 15 minutes late to sessions.',
        reportedUserId: accusedTutor.id,
      });
      expect(report.status).toBe('submitted');

      // 2. Staff assigns investigator
      mockReportRepo.findOne.mockResolvedValueOnce(report);
      const assigned = await service.assignCase(complianceReviewer, report.id, {
        assignedTo: complianceReviewer.id,
        reason: 'Assigned for punctuality review',
      });
      expect(assigned.assignedTo).toBe(complianceReviewer.id);

      // 3. Investigator requests additional information
      mockReportRepo.findOne.mockResolvedValue(assigned);
      const infoReq = await service.addCaseMessage(complianceReviewer, report.id, {
        message: 'Please provide the dates of the sessions where the tutor arrived late.',
        isInternalNote: false,
      });
      expect(infoReq.message).toContain('Please provide the dates');

      // 4. Investigator records resolution
      const resolved = await service.resolveCase(complianceReviewer, report.id, {
        resolutionNotes: 'Tutor counseled on timekeeping; 15-minute makeup session scheduled.',
        status: 'resolved',
      });
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolutionNotes).toContain('Tutor counseled');
    });

    // Flow B: Confidential Safeguarding Report
    it('FLOW B: Confidential Safeguarding Report (Child submits -> Protected -> Accused Blocked -> Resolved)', async () => {
      const report = await service.createReport(studentAlice, {
        category: 'child_safety',
        severity: 'critical',
        description: 'Tutor asked minor student for private social media and home address.',
        reportedUserId: accusedTutor.id,
        isConfidential: true,
      });
      expect(report.status).toBe('escalated');
      expect(report.escalationLevel).toBe('urgent_child_safety');
      expect(report.isConfidential).toBe(true);

      // Accused tutor is blocked
      mockReportRepo.findOne.mockResolvedValue(report);
      await expect(service.getReport(accusedTutor, report.id)).rejects.toThrow(ForbiddenException);

      // Authorized compliance reviewer accesses and resolves
      const view = await service.getReport(complianceReviewer, report.id);
      expect(view.id).toBe(report.id);

      const resolved = await service.resolveCase(complianceReviewer, report.id, {
        resolutionNotes: 'Strict warning issued and tutor reassigned.',
      });
      expect(resolved.status).toBe('resolved');
    });

    // Flow C: Urgent Escalation & Immediate Safety Action
    it('FLOW C: Urgent Safety Escalation (Report -> Auto-Escalate -> Protective Hold Applied)', async () => {
      const report = await service.createReport(studentAlice, {
        category: 'physical_safety',
        severity: 'critical',
        description: 'Threats of physical harm made outside the classroom.',
        reportedUserId: accusedTutor.id,
      });
      expect(report.status).toBe('escalated');

      // Apply immediate safety action (tutor safety hold)
      mockReportRepo.findOne.mockResolvedValue(report);
      const action = await service.applySafetyAction(complianceReviewer, report.id, {
        actionType: 'tutor_safety_hold',
        targetUserId: accusedTutor.id,
        reason: 'Immediate protective hold pending physical safety investigation',
      });
      expect(action.actionType).toBe('tutor_safety_hold');
      expect(mockTutorProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          safetyHoldStatus: 'safety_hold',
          publicationStatus: 'unpublished',
        }),
      );
    });

    // Flow D: Conflict of Interest Triage
    it('FLOW D: Conflict of Interest Handling (Implicated staff blocked -> Independent reviewer assigned)', async () => {
      // Report names implicatedInvestigator as accused subject
      const report = await service.createReport(studentAlice, {
        category: 'inappropriate_communication',
        severity: 'high',
        description: 'Implicated staff member breached conduct standards.',
        reportedUserId: implicatedInvestigator.id,
      });

      mockReportRepo.findOne.mockResolvedValue(report);

      // Attempt 1: Implicated staff attempts self-assignment -> REJECTED
      await expect(
        service.assignCase(implicatedInvestigator, report.id, {
          assignedTo: implicatedInvestigator.id,
        }),
      ).rejects.toThrow(ForbiddenException);

      // Attempt 2: Independent senior admin assigns unbiased reviewer -> ACCEPTED
      const assigned = await service.assignCase(adminUser, report.id, {
        assignedTo: complianceReviewer.id,
        reason: 'Assigned to independent compliance reviewer to avoid conflict of interest',
      });
      expect(assigned.assignedTo).toBe(complianceReviewer.id);
    });

    // Flow E: Financial Dispute Integration
    it('FLOW E: Financial Dispute Integration (Dispute Opened -> Settlement Frozen -> Refund Executed)', async () => {
      const mockDisputeRepo = {
        findOne: vi.fn().mockResolvedValue({
          id: 'disp-01',
          bookingId: 'bk-100',
          status: 'opened',
          booking: { id: 'bk-100', status: 'disputed' },
        }),
        save: vi.fn((d) => Promise.resolve(d)),
      };
      const mockRefundsService = {
        requestAndApproveForAdmin: vi.fn().mockResolvedValue({
          id: 'ref-01',
          status: 'approved',
        }),
      };
      const mockBookingRepo = {
        findOne: vi.fn().mockResolvedValue({ id: 'bk-100', status: 'disputed' }),
        save: vi.fn((b) => Promise.resolve(b)),
      };

      const disputesService = new DisputesService(
        mockDisputeRepo as any,
        mockBookingRepo as any,
        mockOutboxRepo as any,
        mockAuditRepo as any,
        mockNotificationService as any,
        mockRefundsService as any,
        mockDataSource as any,
      );

      // Resolve dispute with refund
      const resolved = await disputesService.resolveDispute(adminUser, 'disp-01', {
        resolutionType: 'refund',
        resolutionNotes: 'Tutor no-show verified via server logs; full refund granted.',
      });

      expect(resolved.status).toBe('resolved_refund');
      expect(mockRefundsService.requestAndApproveForAdmin).toHaveBeenCalled();
    });
  });
});
