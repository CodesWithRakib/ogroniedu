import { describe, it, expect } from 'vitest';
import {
  canAccessPath,
  onboardingRequiredForPath,
  policyForPath,
  stripLocale,
} from '../src/lib/route-policy';
import { dashboardPathForRole, primaryRole } from '../src/store/slices/auth-slice';

describe('route policy (Phase 01)', () => {
  it('strips the locale segment before matching', () => {
    expect(stripLocale('/bn/dashboard/tutor')).toBe('/dashboard/tutor');
    expect(stripLocale('/en/admin')).toBe('/admin');
    expect(stripLocale('/bn')).toBe('/');
    expect(stripLocale('/dashboard')).toBe('/dashboard');
  });

  it('uses the longest matching prefix', () => {
    expect(policyForPath('/bn/dashboard/tutor')?.prefix).toBe('/dashboard/tutor');
    expect(policyForPath('/bn/dashboard')?.prefix).toBe('/dashboard');
    expect(policyForPath('/bn/admin/users')?.prefix).toBe('/admin');
    expect(policyForPath('/bn/tutors/search')).toBeNull();
  });

  it('allows only the roles mapped to each prefix', () => {
    expect(canAccessPath(['tutor'], '/bn/dashboard/tutor')).toBe(true);
    expect(canAccessPath(['student'], '/bn/dashboard/tutor')).toBe(false);
    expect(canAccessPath(['student'], '/bn/dashboard/student')).toBe(true);
    expect(canAccessPath(['guardian'], '/bn/dashboard/student')).toBe(false);
  });

  it('keeps the admin family and super_admin boundaries explicit', () => {
    expect(canAccessPath(['admin'], '/bn/admin')).toBe(true);
    expect(canAccessPath(['super_admin'], '/bn/admin')).toBe(true);
    expect(canAccessPath(['support_agent'], '/bn/admin')).toBe(true);
    expect(canAccessPath(['compliance_reviewer'], '/bn/admin')).toBe(true);
    expect(canAccessPath(['tutor'], '/bn/admin')).toBe(false);
    expect(canAccessPath(['organization_owner'], '/bn/admin')).toBe(false);
    expect(canAccessPath([], '/bn/admin')).toBe(false);
    expect(canAccessPath(undefined, '/bn/admin')).toBe(false);
  });

  it('marks self-service onboarding surfaces as not onboarding-gated', () => {
    expect(onboardingRequiredForPath('/bn/onboarding')).toBe(false);
    expect(onboardingRequiredForPath('/bn/profile')).toBe(false);
    expect(onboardingRequiredForPath('/bn/notifications')).toBe(false);
    expect(onboardingRequiredForPath('/bn/dashboard/student')).toBe(true);
    expect(onboardingRequiredForPath('/bn/admin')).toBe(true);
  });

  it('unmapped public paths are never restricted', () => {
    expect(canAccessPath(undefined, '/bn/tutors')).toBe(true);
    expect(onboardingRequiredForPath('/bn/tutors')).toBe(false);
  });
});

describe('nine-role routing model', () => {
  it('resolves primary role across all nine roles', () => {
    expect(primaryRole(['student'])).toBe('student');
    expect(primaryRole(['organization_staff', 'student'])).toBe('organization_staff');
    expect(primaryRole(['organization_owner'])).toBe('organization_owner');
    expect(primaryRole(['compliance_reviewer', 'organization_owner'])).toBe('compliance_reviewer');
    expect(primaryRole(['support_agent', 'organization_owner'])).toBe('support_agent');
    expect(primaryRole(['admin', 'organization_owner'])).toBe('admin');
    expect(primaryRole(['super_admin', 'admin'])).toBe('super_admin');
  });

  it('gives organization roles a real dashboard destination', () => {
    expect(dashboardPathForRole('organization_owner')).toBe('/dashboard');
    expect(dashboardPathForRole('organization_staff')).toBe('/dashboard');
  });
});
