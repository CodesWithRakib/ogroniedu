import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { RolesGuard } from '../src/common/guards/roles.guard';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('AnalyticsController & RBAC Security Specifications (Phase 15)', () => {
  let controller: AnalyticsController;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockAnalyticsService = {
    getOperationalOverview: vi.fn().mockResolvedValue({ conversion: { conversionRate: 75 } }),
    getFinancialAnalytics: vi.fn().mockResolvedValue({ providerBreakdown: [] }),
    getTutorPerformanceAnalytics: vi.fn().mockResolvedValue({ topTutors: [] }),
    getRetentionAnalytics: vi.fn().mockResolvedValue({ retentionRate: 40 }),
    getMyTutorAnalytics: vi.fn().mockResolvedValue({ inquiries: { acceptanceRate: 90 } }),
    getFunnelAnalytics: vi.fn().mockResolvedValue({ stages: [] }),
    getActivationAnalytics: vi.fn().mockResolvedValue({ student: {}, guardian: {}, tutor: {} }),
    getLearningEngagementAnalytics: vi.fn().mockResolvedValue({ sessions: {}, homework: {} }),
    getOrganizationAnalytics: vi
      .fn()
      .mockResolvedValue({ organization: { id: 'org-1' }, metrics: {} }),
  };

  const mockEventTrackingService = {
    trackClientEvent: vi.fn().mockResolvedValue({ recorded: true }),
  };

  function createMockExecutionContext(user: AuthenticatedUser | undefined): ExecutionContext {
    return {
      getHandler: () => () => {},
      getClass: () => AnalyticsController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AnalyticsController(
      mockAnalyticsService as any,
      mockAnalyticsService as any,
      mockEventTrackingService as any,
    );
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe('RBAC RolesGuard on Operational Analytics', () => {
    it('POSITIVE TEST: should allow admin and super_admin to access platform analytics', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const adminCtx = createMockExecutionContext({
        id: 'admin-1',
        roles: ['admin'],
      });
      const superAdminCtx = createMockExecutionContext({
        id: 'super-admin-1',
        roles: ['super_admin'],
      });

      expect(rolesGuard.canActivate(adminCtx)).toBe(true);
      expect(rolesGuard.canActivate(superAdminCtx)).toBe(true);
    });

    it('NEGATIVE TEST: should deny students and guardians from accessing operational analytics', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);
      const studentCtx = createMockExecutionContext({
        id: 'student-1',
        roles: ['student'],
      });
      const guardianCtx = createMockExecutionContext({
        id: 'guardian-1',
        roles: ['guardian'],
      });

      expect(() => rolesGuard.canActivate(studentCtx)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(guardianCtx)).toThrow(ForbiddenException);
    });

    it('POSITIVE TEST: should allow tutors to access personal analytics (/tutors/me)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tutor']);
      const tutorCtx = createMockExecutionContext({
        id: 'tutor-1',
        roles: ['tutor'],
      });

      expect(rolesGuard.canActivate(tutorCtx)).toBe(true);
    });

    it('NEGATIVE TEST: should deny non-tutors from accessing /tutors/me', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tutor']);
      const studentCtx = createMockExecutionContext({
        id: 'student-1',
        roles: ['student'],
      });

      expect(() => rolesGuard.canActivate(studentCtx)).toThrow(ForbiddenException);
    });
  });

  describe('Controller Endpoints Invocation', () => {
    const _adminUser: AuthenticatedUser = {
      id: 'admin-1',
      roles: ['admin'],
      preferredLocale: 'en',
    };
    const tutorUser: AuthenticatedUser = {
      id: 'tutor-1',
      roles: ['tutor'],
      preferredLocale: 'bn',
    };

    it('should invoke getOperationalOverview endpoint', async () => {
      const res = await controller.getOperationalOverview({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getOperationalOverview).toHaveBeenCalled();
    });

    it('should invoke getFinancialAnalytics endpoint', async () => {
      const res = await controller.getFinancialAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getFinancialAnalytics).toHaveBeenCalled();
    });

    it('should invoke getTutorPerformanceAnalytics endpoint', async () => {
      const res = await controller.getTutorPerformanceAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getTutorPerformanceAnalytics).toHaveBeenCalled();
    });

    it('should invoke getRetentionAnalytics endpoint', async () => {
      const res = await controller.getRetentionAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getRetentionAnalytics).toHaveBeenCalled();
    });

    it('should invoke getMyTutorAnalytics endpoint with authenticated tutor ID', async () => {
      const res = await controller.getMyTutorAnalytics(tutorUser, {});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getMyTutorAnalytics).toHaveBeenCalledWith(tutorUser.id, {});
    });

    it('should invoke trackEvent endpoint', async () => {
      const res = await controller.trackEvent(
        { eventName: 'tutor_search_performed' as any, sessionId: 'sess-1' },
        tutorUser,
      );
      expect(res.success).toBe(true);
      expect(mockEventTrackingService.trackClientEvent).toHaveBeenCalled();
    });

    it('should invoke getFunnelAnalytics endpoint', async () => {
      const res = await controller.getFunnelAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getFunnelAnalytics).toHaveBeenCalled();
    });

    it('should invoke getActivationAnalytics endpoint', async () => {
      const res = await controller.getActivationAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getActivationAnalytics).toHaveBeenCalled();
    });

    it('should invoke getLearningEngagementAnalytics endpoint', async () => {
      const res = await controller.getLearningEngagementAnalytics({});
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getLearningEngagementAnalytics).toHaveBeenCalled();
    });

    it('should invoke getOrganizationAnalytics endpoint with organization ID', async () => {
      const res = await controller.getOrganizationAnalytics('org-123', {}, tutorUser);
      expect(res.success).toBe(true);
      expect(mockAnalyticsService.getOrganizationAnalytics).toHaveBeenCalledWith(
        'org-123',
        {},
        tutorUser,
      );
    });
  });
});
