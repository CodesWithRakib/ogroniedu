import { SelfSignupRoles, SupportedLocales } from '@ogroniedu/contracts';

export type SelfSignupRole = (typeof SelfSignupRoles)[number];
export type SupportedLocale = (typeof SupportedLocales)[number];

/**
 * Roles a user may self-assign at registration.
 *
 * Everything else (admin, super_admin, support_agent, compliance_reviewer,
 * organization_owner, organization_staff) is *provisioned*: it requires an
 * explicit administrative grant through the admin surface, with the actor,
 * target and timestamp recorded in the audit log. A client can never obtain a
 * privileged role by posting it to the registration endpoint.
 */
export const SELF_SIGNUP_ROLES: readonly SelfSignupRole[] = SelfSignupRoles;

/** Privileged roles that only an authorized provisioner (super_admin) can grant. */
export const PRIVILEGED_PROVISIONED_ROLES: readonly string[] = [
  'admin',
  'super_admin',
  'support_agent',
  'compliance_reviewer',
  'organization_owner',
  'organization_staff',
];

export function isSelfSignupRole(role: string): role is SelfSignupRole {
  return (SELF_SIGNUP_ROLES as readonly string[]).includes(role);
}

export function isPrivilegedProvisionedRole(role: string): boolean {
  return PRIVILEGED_PROVISIONED_ROLES.includes(role);
}

/** Normalize a locale to a supported value, defaulting to Bengali. */
export function normalizeLocale(locale: string | undefined | null): SupportedLocale {
  return locale === 'en' ? 'en' : 'bn';
}
