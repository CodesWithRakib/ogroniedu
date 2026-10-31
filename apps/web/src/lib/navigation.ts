'use client';

import { GraduationCap } from 'lucide-react';
import type { UserRole } from '@/store/slices/auth-slice';
import type { NavItem, NavSection } from './navigation/types';
import { STUDENT_NAV_SECTIONS, CHILD_STUDENT_NAV_SECTIONS } from './navigation/student.nav';
import { GUARDIAN_NAV_SECTIONS } from './navigation/guardian.nav';
import { TUTOR_NAV_SECTIONS } from './navigation/tutor.nav';
import {
  ADMIN_NAV_SECTIONS,
  SUPPORT_AGENT_NAV_SECTIONS,
  COMPLIANCE_REVIEWER_NAV_SECTIONS,
  ORGANIZATION_NAV_SECTIONS,
  PUBLIC_NAV_SECTIONS,
} from './navigation/admin.nav';

export * from './navigation/types';
export * from './navigation/presets';
export { GraduationCap, STUDENT_NAV_SECTIONS, CHILD_STUDENT_NAV_SECTIONS };

/** True when the nav item matches the current pathname (shared by all shell navs). */
export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;

  const normalizedPath = pathname.replace(/^\/(bn|en)/, '');
  const normalizedHref = href.replace(/^\/(bn|en)/, '');
  if (normalizedPath === normalizedHref) return true;

  // Never match bare '/dashboard' against sub-dashboards like '/dashboard/student'
  if (normalizedHref === '/dashboard' || href === '/dashboard') {
    return false;
  }

  // Root role dashboard should only match exact to avoid highlighting dashboard on subpages
  if (/^\/dashboard\/(student|tutor|guardian|admin)$/.test(normalizedHref)) {
    return normalizedPath === normalizedHref;
  }
  return normalizedPath.startsWith(normalizedHref);
}

/** Categorized navigation sections for sidebar and mobile drawer. */
export function navSectionsForRole(
  role: UserRole | null,
  options?: { isChildStudent?: boolean },
): NavSection[] {
  switch (role) {
    case 'student':
      return options?.isChildStudent ? CHILD_STUDENT_NAV_SECTIONS : STUDENT_NAV_SECTIONS;
    case 'guardian':
      return GUARDIAN_NAV_SECTIONS;
    case 'tutor':
      return TUTOR_NAV_SECTIONS;
    case 'admin':
    case 'super_admin':
      return ADMIN_NAV_SECTIONS;
    case 'support_agent':
      return SUPPORT_AGENT_NAV_SECTIONS;
    case 'compliance_reviewer':
      return COMPLIANCE_REVIEWER_NAV_SECTIONS;
    case 'organization_owner':
    case 'organization_staff':
      return ORGANIZATION_NAV_SECTIONS;
    default:
      return PUBLIC_NAV_SECTIONS;
  }
}

/** Single source of truth for role → navigation items. DashboardShell renders this. */
export function navForRole(role: UserRole | null, options?: { isChildStudent?: boolean }): NavItem[] {
  return navSectionsForRole(role, options).flatMap((s) => s.items);
}
