import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AdminUsersService } from '../src/modules/admin/services/admin-users.service';
import { AdminPlatformService } from '../src/modules/admin/services/admin-platform.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 8: Admin & Super Admin Governance Verification', () => {
  // Shared mock users
  const superAdminCaller: AuthenticatedUser = {
    id: '00000000-0000-4000-a000-000000000000',
    email: 'superadmin.demo@ogroniedu.com',
    roles: ['super_admin', 'admin'],
    preferredLocale: 'bn',
  };

  const regularAdminCaller: AuthenticatedUser = {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'admin.support@ogroniedu.com',
    roles: ['admin'],
    preferredLocale: 'en',
  };

  const studentTargetUser = {
    id: '00000000-0000-4000-b000-000000000001',
    displayName: 'Tanvir Hossain',
    email: 'student.tanvir@ogroniedu.com',
    phoneE164: '+8801711000001',
    status: 'active',
    preferredLocale: 'bn',
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    phoneVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    lastLoginAt: new Date('2026-01-10T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const superAdminTargetUser = {
    id: '00000000-0000-4000-a000-000000000009',
    displayName: 'Peer Super Admin',
    email: 'peer.superadmin@ogroniedu.com',
    phoneE164: '+8801711000009',
    status: 'active',
    preferredLocale: 'en',
  };

  describe('1. User Governance & Least-Privilege Invariants (AdminUsersService)', () => {
    let usersService: AdminUsersService;
    let mockUserRepo: any;
    let mockDataSource: any;
    let mockAuditService: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockUserRepo = {
        findOne: vi.fn(),
        save: vi.fn().mockImplementation((u) => Promise.resolve(u)),
      };

      mockDataSource = {
        query: vi.fn(),
        transaction: vi.fn().mockImplementation(async (cb) => {
          const manager = {
            query: vi.fn().mockResolvedValue([]),
          };
          return cb(manager);
        }),
      };

      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-id-1' }),
        getUserAuditHistory: vi.fn().mockResolvedValue([]),
      };

      usersService = new AdminUsersService(mockUserRepo, mockDataSource, mockAuditService);
    });

    it('INVARIANT: Administrator cannot suspend their own account', async () => {
      await expect(
        usersService.suspendUser(regularAdminCaller, regularAdminCaller.id, {
          reason: 'Self-suspension attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('INVARIANT: Suspending a non-existent user throws NotFoundException', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        usersService.suspendUser(regularAdminCaller, '00000000-0000-4000-0000-000000000999', {
          reason: 'Test non-existent user',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('INVARIANT: Regular admin cannot suspend a super_admin', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(superAdminTargetUser);
      // Target roles include super_admin
      mockDataSource.query.mockResolvedValueOnce([{ code: 'super_admin' }, { code: 'admin' }]);

      await expect(
        usersService.suspendUser(regularAdminCaller, superAdminTargetUser.id, {
          reason: 'Unauthorized suspension of super_admin',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUCCESS: Super admin can suspend another super admin with audit trail', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(superAdminTargetUser);
      mockDataSource.query.mockResolvedValueOnce([{ code: 'super_admin' }]);

      const result = await usersService.suspendUser(superAdminCaller, superAdminTargetUser.id, {
        reason: 'Security compromise on peer account',
      });

      expect(result.status).toBe('suspended');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminCaller.id,
          action: 'admin.user.suspended',
          resourceType: 'users',
          resourceId: superAdminTargetUser.id,
          reason: 'Security compromise on peer account',
        }),
      );
    });

    it('INVARIANT: Regular admin cannot update user roles (super_admin restricted)', async () => {
      await expect(
        usersService.updateUserRoles(regularAdminCaller, studentTargetUser.id, {
          roles: ['tutor'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('INVARIANT: Cannot demote sole remaining super_admin in the platform', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(superAdminCaller);
      // Query for total super admins returns 1
      mockDataSource.query.mockResolvedValueOnce([{ count: 1 }]);

      await expect(
        usersService.updateUserRoles(superAdminCaller, superAdminCaller.id, {
          roles: ['admin'], // Attempting to drop super_admin
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('INVARIANT: Role assignment fails if catalog does not contain requested role code', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(studentTargetUser);
      mockDataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('count(DISTINCT')) return [{ count: 2 }];
        if (sql.includes('SELECT id, code FROM roles')) {
          return [
            { id: 'role-1', code: 'student' },
            { id: 'role-2', code: 'tutor' },
          ];
        }
        return [];
      });

      await expect(
        usersService.updateUserRoles(superAdminCaller, studentTargetUser.id, {
          roles: ['student', 'non_existent_role' as any],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SUCCESS: Super admin successfully updates user roles inside transaction with audit log', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(studentTargetUser);
      mockDataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('count(DISTINCT')) return [{ count: 2 }];
        if (sql.includes('SELECT id, code FROM roles')) {
          return [
            { id: 'role-tutor-id', code: 'tutor' },
            { id: 'role-student-id', code: 'student' },
          ];
        }
        return [];
      });

      const result = await usersService.updateUserRoles(superAdminCaller, studentTargetUser.id, {
        roles: ['tutor', 'student'],
      });

      expect(result.assignedRoles).toEqual(['tutor', 'student']);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminCaller.id,
          action: 'admin.user_roles.updated',
          resourceType: 'users',
          resourceId: studentTargetUser.id,
        }),
      );
    });

    it('SUCCESS: Reactivating a user sets status to active and records audit log', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        ...studentTargetUser,
        status: 'suspended',
      });

      const result = await usersService.reactivateUser(regularAdminCaller, studentTargetUser.id);
      expect(result.status).toBe('active');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: regularAdminCaller.id,
          action: 'admin.user.reactivated',
          resourceType: 'users',
          resourceId: studentTargetUser.id,
        }),
      );
    });
  });

  describe('2. Platform Governance & Impersonation Protocol (AdminPlatformService)', () => {
    let platformService: AdminPlatformService;
    let mockSystemSettingRepo: any;
    let mockFeatureFlagRepo: any;
    let mockUserRepo: any;
    let mockAuditRepo: any;
    let mockDataSource: any;
    let mockAuditService: any;
    let mockLedgerService: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockSystemSettingRepo = {
        find: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn().mockImplementation((d) => ({ ...d })),
        save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
      };

      mockFeatureFlagRepo = {
        find: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn().mockImplementation((d) => ({ ...d })),
        save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
      };

      mockUserRepo = {
        findOne: vi.fn(),
      };

      mockAuditRepo = {
        createQueryBuilder: vi.fn(),
      };

      mockDataSource = {
        query: vi.fn(),
      };

      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      };

      mockLedgerService = {
        runReconciliation: vi.fn().mockResolvedValue({
          isBalanced: true,
          status: 'reconciled',
        }),
      };

      platformService = new AdminPlatformService(
        mockSystemSettingRepo,
        mockFeatureFlagRepo,
        mockUserRepo,
        mockAuditRepo,
        mockDataSource,
        mockAuditService,
        mockLedgerService,
      );
    });

    it('INVARIANT: Non-super_admin cannot update system settings', async () => {
      await expect(
        platformService.updateSetting(regularAdminCaller, 'commission_rate', {
          value: { rate: 0.15 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUCCESS: Super admin can update system setting and record audit log', async () => {
      mockSystemSettingRepo.findOne.mockResolvedValueOnce({
        key: 'platform_fee',
        value: { fee: 100 },
        description: 'Old fee',
      });

      const updated = await platformService.updateSetting(superAdminCaller, 'platform_fee', {
        value: { fee: 150 },
        description: 'Updated fee for 2026',
      });

      expect(updated.value).toEqual({ fee: 150 });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminCaller.id,
          action: 'admin.system_setting.updated',
          resourceType: 'system_settings',
          resourceId: 'platform_fee',
        }),
      );
    });

    it('INVARIANT: Non-super_admin cannot update feature flags', async () => {
      await expect(
        platformService.updateFeatureFlag(regularAdminCaller, 'enable_ai_tutor_matching', {
          enabled: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUCCESS: Super admin can toggle feature flag with custom rules and audit trail', async () => {
      mockFeatureFlagRepo.findOne.mockResolvedValueOnce({
        key: 'enable_ai_matching',
        enabled: false,
        rules: {},
      });

      const updated = await platformService.updateFeatureFlag(
        superAdminCaller,
        'enable_ai_matching',
        {
          enabled: true,
          rules: { rolloutPercentage: 25 },
        },
      );

      expect(updated.enabled).toBe(true);
      expect(updated.rules).toEqual({ rolloutPercentage: 25 });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminCaller.id,
          action: 'admin.feature_flag.updated',
          resourceType: 'feature_flags',
        }),
      );
    });

    it('INVARIANT: Non-super_admin is forbidden from starting impersonation', async () => {
      await expect(
        platformService.startImpersonation(regularAdminCaller, {
          targetUserId: studentTargetUser.id,
          reason: 'Investigate student issue',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('INVARIANT: Cannot start impersonation for non-existent target user', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        platformService.startImpersonation(superAdminCaller, {
          targetUserId: '00000000-0000-4000-0000-000000000999',
          reason: 'Test non-existent user impersonation',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('INVARIANT: Cannot impersonate another super_admin (privilege escalation prevention)', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(superAdminTargetUser);
      mockDataSource.query.mockResolvedValueOnce([{ code: 'super_admin' }]);

      await expect(
        platformService.startImpersonation(superAdminCaller, {
          targetUserId: superAdminTargetUser.id,
          reason: 'Testing peer impersonation restriction',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUCCESS: Super admin generates signed JWT with isImpersonated=true and max 15m duration', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(studentTargetUser);
      mockDataSource.query.mockResolvedValueOnce([{ code: 'student' }]);

      const session = await platformService.startImpersonation(superAdminCaller, {
        targetUserId: studentTargetUser.id,
        reason: 'Troubleshoot stuck booking request on student dashboard',
        durationMinutes: 30, // Requesting 30, should be clamped to 15 max
      });

      expect(session.durationMinutes).toBe(15);
      expect(session.targetUser.id).toBe(studentTargetUser.id);
      expect(session.impersonatorUserId).toBe(superAdminCaller.id);

      // Verify signed JWT payload
      const decoded: any = jwt.decode(session.accessToken);
      expect(decoded.sub).toBe(studentTargetUser.id);
      expect(decoded.isImpersonated).toBe(true);
      expect(decoded.impersonatorUserId).toBe(superAdminCaller.id);
      expect(decoded.impersonationReason).toBe(
        'Troubleshoot stuck booking request on student dashboard',
      );
      expect(decoded.roles).toContain('student');

      // Verify audit log recorded
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: superAdminCaller.id,
          action: 'admin.impersonation_started',
          resourceType: 'users',
          resourceId: studentTargetUser.id,
        }),
      );
    });

    it('SUCCESS: Audit logs query sanitizes sensitive fields and masks PII', async () => {
      const rawLog = {
        id: 'audit-log-1',
        actorUserId: superAdminCaller.id,
        action: 'user.password_changed',
        resourceType: 'users',
        resourceId: studentTargetUser.id,
        safeMetadata: {
          clientIp: '127.0.0.1',
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          passwordHash: '$2b$12$securehashsecretstring',
          nidNumber: '19951234567890123',
          normalField: 'acceptable_value',
        },
        createdAt: new Date(),
      };

      const qbMock: any = {
        orderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[rawLog], 1]),
      };

      mockAuditRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await platformService.queryAuditLogs(regularAdminCaller, {
        action: 'user.password_changed',
      });

      expect(result.total).toBe(1);
      const sanitized = result.logs[0] as any;
      expect(sanitized.safeMetadata.normalField).toBe('acceptable_value');
      expect(sanitized.safeMetadata.accessToken).toBe('[REDACTED]');
      expect(sanitized.safeMetadata.passwordHash).toBe('[REDACTED]');
      expect(sanitized.safeMetadata.nidNumber).toBe('[REDACTED]');
    });
  });
});
