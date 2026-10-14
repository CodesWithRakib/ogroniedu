import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/** Canonical platform-operator roles. Spread into `@Roles(...ADMIN_ROLES)`. */
export const ADMIN_ROLES: readonly string[] = ['admin', 'super_admin'];

/** Single super-admin role literal (least-privilege gates). */
export const SUPER_ADMIN_ROLE = 'super_admin';

/** Staff triage roles for support queues. */
export const SUPPORT_TRIAGE_ROLES: readonly string[] = ['admin', 'super_admin', 'support_agent'];

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
