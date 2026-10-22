import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityHeadersMiddleware } from '../src/common/middleware/security-headers.middleware';
import { RateLimiterService } from '../src/modules/auth/rate-limiter.service';
import { StructuredLoggerService } from '../src/common/logger/structured-logger.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { HttpStatus, HttpException, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

/**
 * Phase 12: Security, Data Isolation & Performance Test Suite
 *
 * Validates:
 * 1. Multi-tenant IDOR protection and cross-tenant boundary isolation.
 * 2. Sliding window rate limiting policies (HTTP 429 Too Many Requests & retry-after).
 * 3. OWASP defensive security headers (CSP, HSTS, X-Frame-Options, nosniff).
 * 4. PII and credential sanitization across structured loggers and audit streams.
 * 5. Exception filter data leakage prevention (sanitizing raw SQL / driver errors).
 */
describe('Phase 12: Security, Data Isolation & Performance', () => {
  describe('1. Multi-Tenant Data Isolation & IDOR Defense', () => {
    let orgService: OrganizationsService;
    let mockOrgRepo: any;
    let mockMemberRepo: any;

    const orgAlphaId = '11111111-0000-4000-8000-000000000001';
    const orgBetaId = '22222222-0000-4000-8000-000000000002';
    const userAlphaId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const userBetaId = 'bbbbbbbb-0000-4000-8000-000000000002';

    const userAlpha: AuthenticatedUser = {
      id: userAlphaId,
      email: 'owner@alpha-coaching.com',
      roles: ['organization_owner'],
    };

    const userBeta: AuthenticatedUser = {
      id: userBetaId,
      email: 'owner@beta-coaching.com',
      roles: ['organization_owner'],
    };

    beforeEach(() => {
      mockOrgRepo = {
        findOne: vi.fn(async ({ where }: any) => {
          if (where?.id === orgAlphaId) {
            return { id: orgAlphaId, name: 'Alpha Academy', ownerUserId: userAlphaId };
          }
          if (where?.id === orgBetaId) {
            return { id: orgBetaId, name: 'Beta Academy', ownerUserId: userBetaId };
          }
          return null;
        }),
      };

      mockMemberRepo = {
        findOne: vi.fn(async ({ where }: any) => {
          if (where?.organizationId === orgAlphaId && where?.userId === userAlphaId) {
            return { organizationId: orgAlphaId, userId: userAlphaId, role: 'owner', status: 'active' };
          }
          if (where?.organizationId === orgBetaId && where?.userId === userBetaId) {
            return { organizationId: orgBetaId, userId: userBetaId, role: 'owner', status: 'active' };
          }
          return null; // Not authorized for cross-tenant access!
        }),
        find: vi.fn(),
        count: vi.fn().mockResolvedValue(10),
      };

      orgService = new OrganizationsService(
        mockOrgRepo,
        mockMemberRepo,
        {} as any,
        {} as any,
        {} as any,
        { record: vi.fn().mockResolvedValue({ id: 'aud-1' }) } as any,
      );
    });

    it('SUCCESS: Tenant Alpha can access their own organization data', async () => {
      const org = await orgService.getOrganizationById(userAlpha, orgAlphaId);
      expect(org.id).toBe(orgAlphaId);
      expect(org.name).toBe('Alpha Academy');
    });

    it('IDOR DEFENSE: Tenant Alpha is strictly blocked from accessing Tenant Beta data', async () => {
      await expect(orgService.getOrganizationById(userAlpha, orgBetaId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('IDOR DEFENSE: Tenant Alpha cannot list staff or members of Tenant Beta', async () => {
      await expect(orgService.listMembers(userAlpha, orgBetaId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('IDOR DEFENSE: Tenant Alpha cannot modify profile of Tenant Beta', async () => {
      await expect(
        orgService.updateOrganization(userAlpha, orgBetaId, { name: 'Compromised Beta' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Rate Limiting Policies & Abuse Prevention', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    it('SUCCESS: Allows requests within configured window threshold', () => {
      const key = 'auth:login:test-ip-1';
      expect(() => {
        for (let i = 0; i < 5; i++) {
          rateLimiter.checkLimit(key, 5, 60000);
        }
      }).not.toThrow();
    });

    it('ABUSE PREVENTION: Rejects request exceeding rate limit with HTTP 429 and retryAfter', () => {
      const key = 'auth:login:test-ip-2';
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(key, 5, 60000);
      }

      try {
        rateLimiter.checkLimit(key, 5, 60000);
        expect.unreachable('Should have thrown HTTP 429');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const res = err.getResponse();
        expect(res.statusCode).toBe(429);
        expect(res.error).toBe('Too Many Requests');
        expect(res.retryAfter).toBeGreaterThan(0);
        expect(res.message).toContain('Rate limit exceeded');
      }
    });

    it('ISOLATION: Enforces rate limits independently across distinct keys/tenants', () => {
      const keyUserA = 'auth:login:user-a';
      const keyUserB = 'auth:login:user-b';

      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(keyUserA, 5, 60000);
      }

      // User A is now exhausted
      expect(() => rateLimiter.checkLimit(keyUserA, 5, 60000)).toThrow(HttpException);

      // User B should remain uninhibited
      expect(() => rateLimiter.checkLimit(keyUserB, 5, 60000)).not.toThrow();
    });

    it('RESET: Explicit reset frees rate limit counter immediately', () => {
      const key = 'auth:otp:test-phone-1';
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkLimit(key, 3, 120000);
      }

      expect(() => rateLimiter.checkLimit(key, 3, 120000)).toThrow(HttpException);

      rateLimiter.reset(key);
      expect(() => rateLimiter.checkLimit(key, 3, 120000)).not.toThrow();
    });
  });

  describe('3. Defensive Security Headers (OWASP & PCI-DSS Baseline)', () => {
    const middleware = new SecurityHeadersMiddleware();

    it('DEFENSE: Injects all mandatory OWASP security headers', () => {
      const headers: Record<string, string> = {};
      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
          return mockRes as Response;
        },
      };
      const mockReq: Partial<Request> = {};
      const next = vi.fn();

      middleware.use(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      // MIME protection
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      // Anti-clickjacking
      expect(headers['X-Frame-Options']).toBe('DENY');
      // Modern XSS protection
      expect(headers['X-XSS-Protection']).toBe('0');
      // HSTS 1 year with preload
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
      // Referrer policy
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      // CSP frame-ancestors
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
      // Permissions policy restricting sensitive hardware
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
    });
  });

  describe('4. PII & Sensitive Credential Masking', () => {
    const logger = new StructuredLoggerService();

    it('PRIVACY: Masks passwords, JWTs, national IDs, and bank details in telemetry', () => {
      const payload = {
        userId: 'usr-phase12-test',
        password: 'SuperSecretPassword2026!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        nidNumber: '19985214785214569',
        bankAccountNumber: '9876543210123',
        otp: '654321',
      };

      const sanitized = logger.maskPii(payload);
      expect(sanitized.userId).toBe('usr-phase12-test');
      expect(sanitized.password).toBe('***MASKED***');
      expect(sanitized.token).toBe('***MASKED***');
      expect(sanitized.nidNumber).toBe('***MASKED***');
      expect(sanitized.bankAccountNumber).toBe('***MASKED***');
      expect(sanitized.otp).toBe('***MASKED***');
    });

    it('PRIVACY: Redacts phone numbers and emails inside freeform string fields', () => {
      const payload = {
        guardianPhone: '+8801712345678',
        studentEmail: 'student.protect@ogroniedu.com',
      };

      const sanitized = logger.maskPii(payload);
      expect(sanitized.guardianPhone).toBe('1712****78');
      expect(sanitized.studentEmail).toBe('s***@ogroniedu.com');
    });
  });

  describe('5. Information Disclosure & Exception Filter Sanitization', () => {
    const filter = new AllExceptionsFilter();

    it('SECURITY: Conceals internal SQL syntax errors behind standardized HTTP 500 envelope', () => {
      let statusCode = 0;
      let responseBody: any = null;

      const mockRes: Partial<Response> = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              responseBody = b;
            },
          } as any;
        },
      };

      const mockReq: Partial<Request> = {
        url: '/api/v1/sessions/conflict-probe',
        method: 'POST',
        requestId: 'req-phase12-sec-500',
      };

      const host = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      const rawSqlError = new Error(
        'syntax error at or near "SELECT" in query: SELECT * FROM secret_financial_table WHERE id = 123',
      );

      filter.catch(rawSqlError, host);

      expect(statusCode).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_ERROR');
      expect(responseBody.error.message).toContain('Internal server error');
      // Raw query or database stack must NEVER leak into the client response
      expect(JSON.stringify(responseBody)).not.toContain('secret_financial_table');
      expect(JSON.stringify(responseBody)).not.toContain('syntax error');
      expect(responseBody.meta.requestId).toBe('req-phase12-sec-500');
    });
  });
});
