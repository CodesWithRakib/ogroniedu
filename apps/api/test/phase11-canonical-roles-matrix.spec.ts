import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CanonicalRole } from '@ogroniedu/contracts';

describe('Phase 11: 9 Canonical Roles Authorization Matrix Integration Tests', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  // The 9 Canonical Roles
  const canonicalRoles: CanonicalRole[] = [
    'student',
    'guardian',
    'tutor',
    'support_agent',
    'compliance_reviewer',
    'admin',
    'super_admin',
    'organization_owner',
    'organization_staff',
  ];

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (userRoles: string[], endpointAllowedRoles?: string[]): ExecutionContext => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(endpointAllowedRoles);
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'test-user-id-001',
            email: 'test@ogroniedu.com',
            roles: userRoles,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('verifies all 9 canonical roles are recognized in @ogroniedu/contracts', () => {
    expect(canonicalRoles).toHaveLength(9);
    expect(canonicalRoles).toContain('student');
    expect(canonicalRoles).toContain('guardian');
    expect(canonicalRoles).toContain('tutor');
    expect(canonicalRoles).toContain('support_agent');
    expect(canonicalRoles).toContain('compliance_reviewer');
    expect(canonicalRoles).toContain('admin');
    expect(canonicalRoles).toContain('super_admin');
    expect(canonicalRoles).toContain('organization_owner');
    expect(canonicalRoles).toContain('organization_staff');
  });

  describe('Super Admin Universal Clearance', () => {
    it('allows super_admin access across all restricted role endpoints', () => {
      const endpoints = [
        ['admin'],
        ['compliance_reviewer'],
        ['support_agent'],
        ['tutor'],
        ['guardian'],
        ['student'],
        ['organization_owner'],
        ['organization_staff'],
      ];

      for (const requiredRoles of endpoints) {
        const ctx = createMockContext(['super_admin'], requiredRoles);
        expect(rolesGuard.canActivate(ctx)).toBe(true);
      }
    });
  });

  describe('Safeguarding Confidentiality Boundary', () => {
    const safeguardingClearanceRoles = ['compliance_reviewer', 'super_admin'];

    it('allows compliance_reviewer into safeguarding reports', () => {
      const ctx = createMockContext(['compliance_reviewer'], safeguardingClearanceRoles);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows super_admin into safeguarding reports', () => {
      const ctx = createMockContext(['super_admin'], safeguardingClearanceRoles);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('DENIES standard admin from unredacted safeguarding reports', () => {
      const ctx = createMockContext(['admin'], safeguardingClearanceRoles);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('DENIES support_agent from unredacted safeguarding reports', () => {
      const ctx = createMockContext(['support_agent'], safeguardingClearanceRoles);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('DENIES tutor, student, guardian, and org roles from safeguarding reports', () => {
      const deniedRoles = ['tutor', 'student', 'guardian', 'organization_owner', 'organization_staff'];
      for (const role of deniedRoles) {
        const ctx = createMockContext([role], safeguardingClearanceRoles);
        expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
      }
    });
  });

  describe('Tutor Application & Verification Clearance', () => {
    it('allows tutor to submit verification evidence', () => {
      const ctx = createMockContext(['tutor'], ['tutor']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('DENIES student and guardian from submitting tutor verification', () => {
      expect(() => rolesGuard.canActivate(createMockContext(['student'], ['tutor']))).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(createMockContext(['guardian'], ['tutor']))).toThrow(ForbiddenException);
    });

    it('allows admin and compliance_reviewer to review verification dossiers', () => {
      const reviewerEndpoint = ['admin', 'compliance_reviewer'];
      expect(rolesGuard.canActivate(createMockContext(['admin'], reviewerEndpoint))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext(['compliance_reviewer'], reviewerEndpoint))).toBe(true);
    });
  });

  describe('Guardian Scoped Management Clearance', () => {
    it('allows guardian role on guardian child endpoints', () => {
      const ctx = createMockContext(['guardian'], ['guardian']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('DENIES tutor and student from accessing guardian management endpoints', () => {
      expect(() => rolesGuard.canActivate(createMockContext(['tutor'], ['guardian']))).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(createMockContext(['student'], ['guardian']))).toThrow(ForbiddenException);
    });
  });

  describe('Financial Ledger & Settlement Clearance', () => {
    const financeStaffRoles = ['admin', 'super_admin'];

    it('allows admin and super_admin to inspect financial ledgers', () => {
      expect(rolesGuard.canActivate(createMockContext(['admin'], financeStaffRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext(['super_admin'], financeStaffRoles))).toBe(true);
    });

    it('DENIES non-finance roles from reading raw double-entry ledgers', () => {
      const deniedRoles = ['student', 'guardian', 'tutor', 'support_agent', 'organization_owner', 'organization_staff'];
      for (const role of deniedRoles) {
        const ctx = createMockContext([role], financeStaffRoles);
        expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
      }
    });
  });

  describe('Multi-Tenant Organization Management Clearance', () => {
    it('allows organization_owner to manage organization roster and settings', () => {
      const ctx = createMockContext(['organization_owner'], ['organization_owner']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows organization_staff to manage assigned roster bookings', () => {
      const ctx = createMockContext(['organization_staff'], ['organization_owner', 'organization_staff']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('DENIES independent tutors and students from organization management', () => {
      expect(() => rolesGuard.canActivate(createMockContext(['tutor'], ['organization_owner']))).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(createMockContext(['student'], ['organization_owner']))).toThrow(ForbiddenException);
    });
  });
});
