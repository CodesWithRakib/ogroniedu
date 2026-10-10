import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminOperationsController } from '../src/modules/admin/admin-operations.controller';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('AdminOperationsController & RolesGuard Permissions (Phase 14)', () => {
  let controller: AdminOperationsController;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockAdminService = {
    getOperationalDashboard: vi.fn().mockResolvedValue({ totalRegisteredUsers: 100 }),
    listUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
    getUserDossier: vi.fn().mockResolvedValue({ id: 'u1' }),
    suspendUser: vi.fn().mockResolvedValue({ id: 'u1', status: 'suspended' }),
    reactivateUser: vi.fn().mockResolvedValue({ id: 'u1', status: 'active' }),
    updateUserRoles: vi.fn().mockResolvedValue({ userId: 'u1', assignedRoles: ['admin'] }),
    listAllBookings: vi.fn().mockResolvedValue({ bookings: [], total: 0 }),
    adminCancelBooking: vi.fn().mockResolvedValue({ booking: { id: 'b1' }, refundIssued: true }),
    assignCase: vi.fn().mockResolvedValue({ success: true, message: 'Case assigned' }),
    getReconciliationOverview: vi.fn().mockResolvedValue({ isBalanced: true }),
    getSettings: vi.fn().mockResolvedValue([]),
    updateSetting: vi.fn().mockResolvedValue({ key: 'fee' }),
    getFeatureFlags: vi.fn().mockResolvedValue([]),
    updateFeatureFlag: vi.fn().mockResolvedValue({ key: 'flag' }),
    startImpersonation: vi.fn().mockResolvedValue({
      accessToken: 'mock-jwt-token',
      targetUser: { id: 'u1', displayName: 'Student One' },
      durationMinutes: 15,
    }),
    queryAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  };

  function createMockExecutionContext(
    user: AuthenticatedUser | undefined,
    requiredRoles?: string[],
  ): ExecutionContext {
    return {
      getHandler: () => () => {},
      getClass: () => AdminOperationsController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AdminOperationsController(mockAdminService as any);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe('RBAC RolesGuard on Admin Operations', () => {
    it('POSITIVE TEST: should allow super_admin to access all admin endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const ctx = createMockExecutionContext({
        id: 'user-super-admin',
        roles: ['super_admin'],
      });

      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('POSITIVE TEST: should allow general admin to access admin-level endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const ctx = createMockExecutionContext({
        id: 'user-admin',
        roles: ['admin'],
      });

      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('NEGATIVE TEST: should deny general admin from super_admin-only endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['super_admin']);
      const ctx = createMockExecutionContext({
        id: 'user-admin',
        roles: ['admin'],
      });

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should deny student or tutor from accessing admin endpoints', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const studentCtx = createMockExecutionContext({
        id: 'user-student',
        roles: ['student'],
      });
      const tutorCtx = createMockExecutionContext({
        id: 'user-tutor',
        roles: ['tutor'],
      });

      expect(() => rolesGuard.canActivate(studentCtx)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(tutorCtx)).toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should deny unauthenticated or role-less requests', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const noUserCtx = createMockExecutionContext(undefined);
      const noRolesCtx = createMockExecutionContext({ id: 'anon', roles: [] });

      expect(() => rolesGuard.canActivate(noUserCtx)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(noRolesCtx)).toThrow(ForbiddenException);
    });
  });

  describe('Controller Endpoints Invocation', () => {
    const adminUser: AuthenticatedUser = {
      id: 'admin-1',
      roles: ['admin'],
      preferredLocale: 'en',
    };
    const superAdminUser: AuthenticatedUser = {
      id: 'super-admin-1',
      roles: ['super_admin'],
      preferredLocale: 'bn',
    };

    it('should invoke dashboard overview endpoint', async () => {
      const res = await controller.getDashboard();
      expect(res.success).toBe(true);
      expect(mockAdminService.getOperationalDashboard).toHaveBeenCalled();
    });

    it('should invoke user suspension endpoint', async () => {
      const res = await controller.suspendUser(adminUser, 'u1', { reason: 'Policy violation' });
      expect(res.success).toBe(true);
      expect(mockAdminService.suspendUser).toHaveBeenCalledWith(adminUser, 'u1', {
        reason: 'Policy violation',
      });
    });

    it('should invoke user roles update endpoint', async () => {
      const res = await controller.updateUserRoles(superAdminUser, 'u1', { roles: ['admin'] });
      expect(res.success).toBe(true);
      expect(mockAdminService.updateUserRoles).toHaveBeenCalledWith(superAdminUser, 'u1', {
        roles: ['admin'],
      });
    });

    it('should invoke impersonation start endpoint', async () => {
      const res = await controller.startImpersonation(superAdminUser, {
        targetUserId: '00000000-0000-0000-0000-000000000099',
        reason: 'Debugging emergency issue',
      });
      expect(res.success).toBe(true);
      expect(mockAdminService.startImpersonation).toHaveBeenCalledWith(
        superAdminUser,
        expect.anything(),
      );
    });

    it('should invoke audit logs query endpoint', async () => {
      const res = await controller.queryAuditLogs(adminUser, { limit: 10 });
      expect(res.success).toBe(true);
      expect(mockAdminService.queryAuditLogs).toHaveBeenCalledWith(adminUser, { limit: 10 });
    });
  });
});
