import type { UserRole } from '@/store/slices/auth-slice';

/**
 * Single source of truth for frontend route → role policy.
 *
 * This is *supplementary* UX protection only: the API enforces authorization
 * server-side. Keeping the mapping here (instead of scattering role checks in
 * components) keeps layouts thin and makes the matrix testable.
 */

export interface RoutePolicy {
  /** Path prefix, matched after the locale segment is stripped. */
  prefix: string;
  /** Roles allowed to view routes under this prefix. */
  allow: UserRole[];
  /**
   * Whether an incomplete onboarding track should divert the user to
   * `/onboarding`. Self-service onboarding surfaces opt out.
   */
  requiresOnboarding: boolean;
}

export const ALL_AUTHENTICATED_ROLES: UserRole[] = [
  'student',
  'guardian',
  'tutor',
  'admin',
  'super_admin',
  'support_agent',
  'compliance_reviewer',
  'organization_owner',
  'organization_staff',
];

export const ADMIN_FAMILY_ROLES: UserRole[] = [
  'admin',
  'super_admin',
  'support_agent',
  'compliance_reviewer',
];

export const ROUTE_POLICIES: RoutePolicy[] = [
  { prefix: '/admin', allow: ADMIN_FAMILY_ROLES, requiresOnboarding: true },
  { prefix: '/dashboard/admin', allow: ADMIN_FAMILY_ROLES, requiresOnboarding: true },
  { prefix: '/dashboard/tutor/verification', allow: ['tutor'], requiresOnboarding: false },
  { prefix: '/dashboard/tutor/profile', allow: ['tutor'], requiresOnboarding: false },
  { prefix: '/dashboard/tutor', allow: ['tutor'], requiresOnboarding: true },
  { prefix: '/dashboard/guardian', allow: ['guardian'], requiresOnboarding: true },
  { prefix: '/dashboard/student', allow: ['student'], requiresOnboarding: true },
  { prefix: '/dashboard', allow: ALL_AUTHENTICATED_ROLES, requiresOnboarding: true },
  { prefix: '/bookings', allow: ['student', 'guardian', 'tutor'], requiresOnboarding: true },
  { prefix: '/requests', allow: ['student', 'guardian', 'tutor'], requiresOnboarding: true },
  {
    prefix: '/tutor',
    allow: ['tutor', 'organization_owner', 'organization_staff'],
    requiresOnboarding: true,
  },
  { prefix: '/profile', allow: ALL_AUTHENTICATED_ROLES, requiresOnboarding: false },
  { prefix: '/notifications', allow: ALL_AUTHENTICATED_ROLES, requiresOnboarding: false },
  { prefix: '/onboarding', allow: ALL_AUTHENTICATED_ROLES, requiresOnboarding: false },
];

/** Strip a leading locale segment (`/bn`, `/en`) from a pathname. */
export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(bn|en)(\/.*)?$/);
  if (!match) return pathname;
  return match[2] && match[2].length > 0 ? match[2] : '/';
}

/** Longest-prefix match wins so `/dashboard/tutor` beats `/dashboard`. */
export function policyForPath(pathname: string): RoutePolicy | null {
  const path = stripLocale(pathname);
  let best: RoutePolicy | null = null;
  for (const policy of ROUTE_POLICIES) {
    if (path === policy.prefix || path.startsWith(`${policy.prefix}/`)) {
      if (!best || policy.prefix.length > best.prefix.length) best = policy;
    }
  }
  return best;
}

export function canAccessPath(roles: UserRole[] | undefined, pathname: string): boolean {
  const policy = policyForPath(pathname);
  if (!policy) return true;
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => policy.allow.includes(role));
}

export function onboardingRequiredForPath(pathname: string): boolean {
  return policyForPath(pathname)?.requiresOnboarding ?? false;
}
