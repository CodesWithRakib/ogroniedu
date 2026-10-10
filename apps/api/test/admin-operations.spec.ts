import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AdminOperationsService,
  redactSensitiveData,
} from '../src/modules/admin/admin-operations.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import jwt from 'jsonwebtoken';

describe('Admin Operations & Security Specifications (Phase 14)', () => {
  let service: AdminOperationsService;

  // Mock repositories and services
  const mockSystemSettingRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockFeatureFlagRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockUserRepo = {
    findOne: vi.fn(),
    count: vi.fn(),
    save: vi.fn(),
  };

  const mockUserRoleRepo = {
    find: vi.fn(),
    save: vi.fn(),
  };

  const mockBookingRepo = {
    findOne: vi.fn(),
    count: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockAuditRepo = {
    find: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockReplacementCaseRepo = {
    count: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockSafetyReportRepo = {
    count: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockPaymentOrderRepo = {
    findOne: vi.fn(),
  };

  const mockAuditService = {
    record: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
    getUserAuditHistory: vi.fn().mockResolvedValue([]),
  };

  const mockLedgerService = {
    verifySystemLedgerIntegrity: vi.fn().mockResolvedValue({
      isBalanced: true,
      totalDebits: 500000n,
      totalCredits: 500000n,
      discrepancy: 0n,
    }),
    runReconciliation: vi.fn().mockResolvedValue({
      isBalanced: true,
      totalDebits: '500000',
      totalCredits: '500000',
      discrepancy: '0',
      accounts: [
        { code: '1010_CASH', name: 'Cash', accountType: 'asset', balance: '500000' },
        { code: '2010_ESCROW', name: 'Escrow', accountType: 'liability', balance: '500000' },
      ],
      status: 'reconciled',
      checkedAt: new Date(),
    }),
  };

  const mockPaymentsService = {
    processRefund: vi.fn().mockResolvedValue({ id: 'refund-1' }),
  };

  const mockDataSource = {
    query: vi.fn(),
    transaction: vi.fn(),
  };

  const superAdminUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: 'Super Admin User',
    email: 'superadmin@ogroni.test',
    roles: ['super_admin', 'admin'],
    preferredLocale: 'bn',
  };

  const adminUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'General Admin User',
    email: 'admin@ogroni.test',
    roles: ['admin'],
    preferredLocale: 'en',
  };

  const regularUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000003',
    displayName: 'Regular Student',
    email: 'student@ogroni.test',
    roles: ['student'],
    preferredLocale: 'bn',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminOperationsService(
      mockSystemSettingRepo as any,
      mockFeatureFlagRepo as any,
      mockUserRepo as any,
      mockUserRoleRepo as any,
      mockBookingRepo as any,
      mockAuditRepo as any,
      mockReplacementCaseRepo as any,
      mockSafetyReportRepo as any,
      mockPaymentOrderRepo as any,
      mockAuditService as any,
      mockLedgerService as any,
      mockPaymentsService as any,
      mockDataSource as any,
    );
  });

  describe('Automated Sensitive Data & PII Redaction', () => {
    it('should recursively redact secrets, passwords, tokens, and hashes from logs', () => {
      const rawPayload = {
        userId: 'u123',
        accountNumber: '1234567890',
        metadata: {
          accessToken: 'jwt-token-string',
          passwordHash: '$2b$12$abcdefg',
          apiSecret: 'secret123',
          normalKey: 'public-data',
        },
        items: [
          { cardPan: '4111222233334444', cvv: '123' },
          { harmlessField: 'ok' },
        ],
      };

      const sanitized = redactSensitiveData(rawPayload);

      expect(sanitized.userId).toBe('u123');
      expect(sanitized.metadata.accessToken).toBe('[REDACTED]');
      expect(sanitized.metadata.passwordHash).toBe('[REDACTED]');
      expect(sanitized.metadata.apiSecret).toBe('[REDACTED]');
      expect(sanitized.metadata.normalKey).toBe('public-data');
      expect(sanitized.items[0].cardPan).toBe('[REDACTED]');
      expect(sanitized.items[0].cvv).toBe('[REDACTED]');
      expect(sanitized.items[1].harmlessField).toBe('ok');
    });
  });

  describe('Operational Dashboard & Verification Queues', () => {
    it('should aggregate queue counts and ledger integrity metrics', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ count: 4 }]); // pending tutors
      mockReplacementCaseRepo.count.mockResolvedValueOnce(2);
      mockSafetyReportRepo.count.mockResolvedValueOnce(1);
      mockBookingRepo.count.mockResolvedValueOnce(15);
      mockUserRepo.count.mockResolvedValueOnce(120);

      const dashboard = await service.getOperationalDashboard();

      expect(dashboard.pendingTutorVerifications).toBe(4);
      expect(dashboard.activeReplacementCases).toBe(2);
      expect(dashboard.openSafetyReports).toBe(1);
      expect(dashboard.activeBookingsCount).toBe(15);
      expect(dashboard.totalRegisteredUsers).toBe(120);
      expect(dashboard.ledgerIntegrity.isBalanced).toBe(true);
      expect(dashboard.ledgerIntegrity.discrepancy).toBe('0');
    });
  });

  describe('User Management & Suspension Controls', () => {
    it('POSITIVE TEST: should allow admin to suspend user with justification and audit trail', async () => {
      const targetUserId = 'target-user-1';
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetUserId,
        status: 'active',
        displayName: 'Suspended Target',
      });
      mockDataSource.query.mockResolvedValueOnce([{ code: 'tutor' }]);
      mockUserRepo.save.mockImplementationOnce((u) => Promise.resolve(u));

      const result = await service.suspendUser(adminUser, targetUserId, {
        reason: 'Fraudulent tutor identity claims detected',
      });

      expect(result.status).toBe('suspended');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: adminUser.id,
          action: 'admin.user.suspended',
          resourceType: 'users',
          resourceId: targetUserId,
          reason: 'Fraudulent tutor identity claims detected',
        }),
      );
    });

    it('NEGATIVE TEST: should disallow self-suspension by administrator', async () => {
      await expect(
        service.suspendUser(adminUser, adminUser.id, { reason: 'Accidental self-suspend' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should disallow non-super_admin from suspending a super_admin', async () => {
      const targetSuperAdminId = 'target-super-admin-id';
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetSuperAdminId,
        status: 'active',
      });
      mockDataSource.query.mockResolvedValueOnce([{ code: 'super_admin' }]);

      await expect(
        service.suspendUser(adminUser, targetSuperAdminId, { reason: 'Unauthorized peer suspension' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('POSITIVE TEST: should reactivate a suspended user', async () => {
      const targetUserId = 'target-user-reactivate';
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetUserId,
        status: 'suspended',
      });
      mockUserRepo.save.mockImplementationOnce((u) => Promise.resolve(u));

      const result = await service.reactivateUser(adminUser, targetUserId);
      expect(result.status).toBe('active');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.user.reactivated',
          resourceId: targetUserId,
        }),
      );
    });
  });

  describe('Role Management (Least Privilege - Super Admin Only)', () => {
    it('NEGATIVE TEST: should deny role assignment when caller lacks super_admin role', async () => {
      await expect(
        service.updateUserRoles(adminUser, 'target-user-id', { roles: ['tutor'] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('POSITIVE TEST: should allow super_admin to update roles with atomic transaction and audit', async () => {
      const targetUserId = 'target-user-roles-id';
      mockUserRepo.findOne.mockResolvedValueOnce({ id: targetUserId });
      mockDataSource.query
        .mockResolvedValueOnce([{ count: 2 }]) // superAdminCountRes
        .mockResolvedValueOnce([
          { id: 'role-uuid-1', code: 'compliance_reviewer' },
          { id: 'role-uuid-2', code: 'support_agent' },
        ]); // roleRows
      mockDataSource.transaction.mockImplementationOnce(async (cb) => {
        const mgr = { query: vi.fn().mockResolvedValue([]) };
        return cb(mgr);
      });

      const result = await service.updateUserRoles(superAdminUser, targetUserId, {
        roles: ['compliance_reviewer', 'support_agent'],
      });

      expect(result.assignedRoles).toEqual(['compliance_reviewer', 'support_agent']);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminUser.id,
          action: 'admin.user_roles.updated',
          resourceId: targetUserId,
        }),
      );
    });

    it('NEGATIVE TEST: should protect against removing super_admin from the sole remaining super_admin', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: superAdminUser.id });
      mockDataSource.query.mockResolvedValueOnce([{ count: 1 }]); // only 1 super_admin exists

      await expect(
        service.updateUserRoles(superAdminUser, superAdminUser.id, { roles: ['student'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Emergency Administrative Booking Cancellation & Escrow Reversal', () => {
    it('POSITIVE TEST: should cancel booking and issue ledger refund if payment order exists', async () => {
      const bookingId = 'booking-intervene-1';
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: bookingId,
        status: 'confirmed',
        serviceAgreementSnapshot: {},
      });
      mockBookingRepo.save.mockImplementationOnce((b) => Promise.resolve(b));
      mockPaymentOrderRepo.findOne.mockResolvedValueOnce({
        id: 'order-1',
        amountMinor: '250000',
        status: 'succeeded',
      });

      const res = await service.adminCancelBooking(adminUser, bookingId, {
        reason: 'Severe safety violation during session',
        refundStudent: true,
      });

      expect(res.booking.status).toBe('cancelled');
      expect(res.refundIssued).toBe(true);
      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          paymentOrderId: 'order-1',
          amountMinor: 250000,
        }),
        expect.stringContaining('admin-refund-'),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.booking.emergency_cancelled',
          resourceId: bookingId,
        }),
      );
    });
  });

  describe('Financial Reconciliation Visibility', () => {
    it('POSITIVE TEST: should fetch balanced ledger overview and record audit log', async () => {
      const recon = await service.getReconciliationOverview(adminUser);
      expect(recon.isBalanced).toBe(true);
      expect(recon.status).toBe('reconciled');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.ledger.reconciliation_inspected',
        }),
      );
    });
  });

  describe('System Settings & Feature Flags Management (Super Admin Restricted)', () => {
    it('POSITIVE TEST: should update system setting with super_admin privileges', async () => {
      mockSystemSettingRepo.findOne.mockResolvedValueOnce({
        key: 'platform_fee_percent',
        value: { percent: 8 },
      });
      mockSystemSettingRepo.save.mockImplementationOnce((s) => Promise.resolve(s));

      const updated = await service.updateSetting(superAdminUser, 'platform_fee_percent', {
        value: { percent: 10 },
      });

      expect(updated.value).toEqual({ percent: 10 });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.system_setting.updated',
          resourceId: 'platform_fee_percent',
        }),
      );
    });

    it('NEGATIVE TEST: should reject setting update from general admin', async () => {
      await expect(
        service.updateSetting(adminUser, 'platform_fee_percent', { value: { percent: 12 } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('POSITIVE TEST: should update feature flag with super_admin privileges', async () => {
      mockFeatureFlagRepo.findOne.mockResolvedValueOnce({
        key: 'emergency_maintenance_mode',
        enabled: false,
      });
      mockFeatureFlagRepo.save.mockImplementationOnce((f) => Promise.resolve(f));

      const updated = await service.updateFeatureFlag(superAdminUser, 'emergency_maintenance_mode', {
        enabled: true,
      });

      expect(updated.enabled).toBe(true);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.feature_flag.updated',
          resourceId: 'emergency_maintenance_mode',
        }),
      );
    });

    it('NEGATIVE TEST: should reject feature flag update from general admin', async () => {
      await expect(
        service.updateFeatureFlag(adminUser, 'emergency_maintenance_mode', { enabled: true }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Strict Time-Limited Audited Impersonation Protocol', () => {
    it('NEGATIVE TEST: should deny impersonation when caller is not super_admin', async () => {
      await expect(
        service.startImpersonation(adminUser, {
          targetUserId: 'target-user-1',
          reason: 'Attempted general admin impersonation',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should deny impersonating another super_admin', async () => {
      const targetSuperAdminId = 'target-super-admin-2';
      mockUserRepo.findOne.mockResolvedValueOnce({ id: targetSuperAdminId });
      mockDataSource.query.mockResolvedValueOnce([{ code: 'super_admin' }]);

      await expect(
        service.startImpersonation(superAdminUser, {
          targetUserId: targetSuperAdminId,
          reason: 'Testing peer impersonation denial',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('POSITIVE TEST: should issue signed token with max 15m duration, impersonator ID and audit log', async () => {
      const targetUserId = 'target-student-1';
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetUserId,
        displayName: 'Target Student',
        email: 'student@target.test',
        preferredLocale: 'bn',
      });
      mockDataSource.query.mockResolvedValueOnce([{ code: 'student' }]);

      const result = await service.startImpersonation(superAdminUser, {
        targetUserId,
        reason: 'Debugging reported payment checkout issue on live account',
        durationMinutes: 10,
      });

      expect(result.durationMinutes).toBe(10);
      expect(result.impersonatorUserId).toBe(superAdminUser.id);
      expect(result.targetUser.displayName).toBe('Target Student');

      // Verify JWT payload contents
      const decoded = jwt.decode(result.accessToken) as any;
      expect(decoded.sub).toBe(targetUserId);
      expect(decoded.isImpersonated).toBe(true);
      expect(decoded.impersonatorUserId).toBe(superAdminUser.id);
      expect(decoded.roles).toContain('student');

      // Verify mandatory high-priority audit log
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminUser.id,
          action: 'admin.impersonation_started',
          resourceType: 'users',
          resourceId: targetUserId,
          reason: 'Debugging reported payment checkout issue on live account',
        }),
      );
    });

    it('POSITIVE TEST: should clamp impersonation duration to maximum 15 minutes if higher duration requested', async () => {
      const targetUserId = 'target-student-2';
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetUserId,
        displayName: 'Target Student 2',
        email: 'student2@target.test',
        preferredLocale: 'en',
      });
      mockDataSource.query.mockResolvedValueOnce([{ code: 'student' }]);

      const result = await service.startImpersonation(superAdminUser, {
        targetUserId,
        reason: 'Operational support review',
        durationMinutes: 60, // Requested 60 minutes, must be capped at 15
      });

      expect(result.durationMinutes).toBe(15);
    });
  });
});
