import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { GuardianStudentGuard } from '../src/common/guards/guardian-student.guard';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RateLimiterService } from '../src/modules/auth/rate-limiter.service';

describe('Authentication & Authorization Security Tests', () => {
  describe('RolesGuard (RBAC)', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    const createMockContext = (user?: any, handlerRoles?: string[]): ExecutionContext => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(handlerRoles);
      return {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    };

    it('should grant access when user holds required role', () => {
      const ctx = createMockContext({ id: 'u1', roles: ['admin'] }, ['admin']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('should grant access to super_admin regardless of endpoint role', () => {
      const ctx = createMockContext({ id: 'u-super', roles: ['super_admin'] }, ['tutor']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('NEGATIVE TEST: should reject when user does not hold required role (403 Forbidden)', () => {
      const ctx = createMockContext({ id: 'u-student', roles: ['student'] }, ['admin']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject when user has no roles', () => {
      const ctx = createMockContext({ id: 'u-anon', roles: [] }, ['student']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('GuardianStudentGuard (ABAC Ownership)', () => {
    let guardianGuard: GuardianStudentGuard;
    let mockDataSource: any;

    beforeEach(() => {
      mockDataSource = {
        query: vi.fn(),
      };
      guardianGuard = new GuardianStudentGuard(mockDataSource);
    });

    const createMockContext = (user: any, params: any): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, params }),
        }),
      } as unknown as ExecutionContext;
    };

    it('should grant access if user IS the target student', async () => {
      const ctx = createMockContext(
        { id: 'student-1', roles: ['student'] },
        { studentId: 'student-1' },
      );
      const allowed = await guardianGuard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should grant access if user is verified guardian with active relationship in guardian_student_links', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ '?column?': 1 }]);
      const ctx = createMockContext(
        { id: 'guardian-1', roles: ['guardian'] },
        { studentId: 'child-1' },
      );
      const allowed = await guardianGuard.canActivate(ctx);
      expect(allowed).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM guardian_student_links'),
        ['guardian-1', 'child-1'],
      );
    });

    it('NEGATIVE TEST: should deny access if guardian has no active link to student (403 Forbidden)', async () => {
      mockDataSource.query.mockResolvedValueOnce([]); // no link
      const ctx = createMockContext(
        { id: 'unrelated-guardian', roles: ['guardian'] },
        { studentId: 'child-1' },
      );
      await expect(guardianGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('RateLimiterService (Abuse & Brute-Force Protection)', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    it('should allow requests within limit', () => {
      expect(() => {
        rateLimiter.checkLimit('ip-1', 3, 10000);
        rateLimiter.checkLimit('ip-1', 3, 10000);
        rateLimiter.checkLimit('ip-1', 3, 10000);
      }).not.toThrow();
    });

    it('NEGATIVE TEST: should throw 429 Too Many Requests when rate limit exceeded', () => {
      rateLimiter.checkLimit('ip-2', 2, 10000);
      rateLimiter.checkLimit('ip-2', 2, 10000);

      expect(() => rateLimiter.checkLimit('ip-2', 2, 10000)).toThrow(/Rate limit exceeded/);
    });
  });

  describe('AuthGuard (JWT Token Verification)', () => {
    const secret = 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';
    let authGuard: AuthGuard;

    beforeEach(() => {
      authGuard = new AuthGuard();
    });

    const createReqContext = (headers: Record<string, string>): ExecutionContext => {
      const req = { headers, user: null };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as unknown as ExecutionContext;
    };

    it('should validate signed JWT Bearer token and populate request.user', () => {
      const token = jwt.sign(
        { sub: 'user-jwt-1', roles: ['guardian'], preferredLocale: 'bn' },
        secret,
        { expiresIn: '15m' },
      );

      const ctx = createReqContext({ authorization: `Bearer ${token}` });
      const canActivate = authGuard.canActivate(ctx);
      expect(canActivate).toBe(true);

      const req = ctx.switchToHttp().getRequest();
      expect(req.user.id).toBe('user-jwt-1');
      expect(req.user.roles).toContain('guardian');
    });

    it('NEGATIVE TEST: should reject expired JWT token with 401 Unauthorized', () => {
      const expiredToken = jwt.sign({ sub: 'user-expired', roles: ['student'] }, secret, {
        expiresIn: '-1s',
      });

      const ctx = createReqContext({ authorization: `Bearer ${expiredToken}` });
      expect(() => authGuard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('NEGATIVE TEST: should reject token with invalid signature', () => {
      const tamperedToken = jwt.sign(
        { sub: 'user-tampered', roles: ['admin'] },
        'wrong-secret-key',
      );

      const ctx = createReqContext({ authorization: `Bearer ${tamperedToken}` });
      expect(() => authGuard.canActivate(ctx)).toThrow('Invalid or malformed authentication token');
    });
  });
});
