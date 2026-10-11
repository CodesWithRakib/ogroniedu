import type { UserRole } from '@/store/slices/auth-slice';
import { dashboardPathForRole, primaryRole } from '@/store/slices/auth-slice';

export type { UserRole };
export { dashboardPathForRole, primaryRole };

export function withLocale(path: string, locale: 'bn' | 'en'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `/${locale}`;
  if (/^\/(bn|en)(\/|$)/.test(normalized)) {
    return normalized.replace(/^\/(bn|en)/, `/${locale}`);
  }
  return `/${locale}${normalized}`;
}

export function dashboardPathForRoles(roles: UserRole[] | undefined, locale: 'bn' | 'en'): string {
  return withLocale(dashboardPathForRole(primaryRole(roles)), locale);
}

export function canAccessAdmin(roles: UserRole[] | undefined): boolean {
  return Boolean(roles?.includes('admin') || roles?.includes('super_admin'));
}

export function isSuperAdmin(roles: UserRole[] | undefined): boolean {
  return Boolean(roles?.includes('super_admin'));
}
