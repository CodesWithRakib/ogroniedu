import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/** Canonical platform-operator roles. Spread into `@Roles(...ADMIN_ROLES)`. */
export const ADMIN_ROLES: readonly string[] = ['admin', 'super_admin'];

/** Single super-admin role literal (least-privilege gates). */
export const SUPER_ADMIN_ROLE = 'super_admin';

/** Staff triage roles for support queues. */
export const SUPPORT_TRIAGE_ROLES: readonly string[] = ['admin', 'super_admin', 'support_agent'];

/**
 * Tutor dossier review roles (Phase 02). `compliance_reviewer` is a first-class
 * reviewer and gets an explicit grant here — it never inherits `admin` powers,
 * and every review action is additionally checked per dossier assignment.
 */
export const TUTOR_REVIEW_ROLES: readonly string[] = [
  'admin',
  'super_admin',
  'compliance_reviewer',
];

/** Roles allowed to review individual dossier documents. */
export const COMPLIANCE_ROLES: readonly string[] = ['compliance_reviewer'];

/** True for tutor dossier reviewers (admin family + compliance reviewer). */
export function isTutorReviewer(user: Pick<AuthenticatedUser, 'roles'> | undefined): boolean {
  return !!user?.roles?.some((role) => TUTOR_REVIEW_ROLES.includes(role));
}

/** True for platform operators (admin or super_admin). Centralizes string-literal role checks. */
export function isAdminRole(user: Pick<AuthenticatedUser, 'roles'> | undefined): boolean {
  return !!user?.roles?.some((role) => ADMIN_ROLES.includes(role));
}

/** True for super_admin (unrestricted bypass). */
export function isSuperAdmin(user: Pick<AuthenticatedUser, 'roles'> | undefined): boolean {
  return !!user?.roles?.includes(SUPER_ADMIN_ROLE);
}

/** Throw-free role membership check used by services. */
export function hasAnyRole(
  user: Pick<AuthenticatedUser, 'roles'> | undefined,
  ...roles: string[]
): boolean {
  if (isSuperAdmin(user)) return true;
  return !!user?.roles?.some((role) => roles.includes(role));
}
