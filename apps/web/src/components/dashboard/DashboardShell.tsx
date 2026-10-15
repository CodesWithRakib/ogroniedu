'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store';
import { withLocale } from '@/lib/auth';
import { primaryRole, logout, type UserRole } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';
import type { Locale } from '@/lib/i18n';
import { navForRole, ROLE_PRESETS, type NavItem, type RoleConfig } from '@/lib/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { DashboardMobileNav } from './DashboardMobileNav';

export type { NavItem, RoleConfig };
export { navForRole, ROLE_PRESETS };

export interface DashboardShellProps {
  children: React.ReactNode;
  locale: Locale;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  role?: UserRole | null;
}

/**
 * Dashboard shell: role-aware nav state + logout, composing the sidebar,
 * topbar, and mobile nav. Presentational pieces live in sibling files.
 */
export function DashboardShell({
  children,
  locale,
  subtitle,
  actions,
  role: roleOverride,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const authUser = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const activeRole: UserRole | null = roleOverride ?? primaryRole(authUser?.roles);
  const items = navForRole(activeRole);
  const isBn = locale === 'bn';

  const roleKey = activeRole === 'super_admin' ? 'admin' : (activeRole ?? 'student');
  const rolePreset = ROLE_PRESETS[roleKey] ?? ROLE_PRESETS.student;

  const targetLocale: Locale = isBn ? 'en' : 'bn';
  const targetPath = pathname
    ? pathname.replace(new RegExp(`^/${locale}`), `/${targetLocale}`)
    : `/${targetLocale}`;

  async function handleLogout() {
    try {
      await logoutApi({ refreshToken: refreshToken ?? undefined }).unwrap();
    } catch {
      // Best effort API logout
    }
    dispatch(logout());
    router.replace(withLocale('/login', locale));
  }

  // User display metadata
  const userInitials = (authUser?.displayName ?? authUser?.phone ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-screen w-full flex bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground"
      data-testid="dashboard-shell"
    >
      <DashboardSidebar
        items={items}
        locale={locale}
        isBn={isBn}
        pathname={pathname}
        roleKey={roleKey}
        rolePreset={rolePreset}
        authUser={authUser}
        userInitials={userInitials}
        onLogout={handleLogout}
      />

      <DashboardMobileNav
        items={items}
        locale={locale}
        isBn={isBn}
        pathname={pathname}
        rolePreset={rolePreset}
        drawerOpen={mobileDrawerOpen}
        onCloseDrawer={() => setMobileDrawerOpen(false)}
        onLogout={handleLogout}
      />

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA & TOPBAR                               */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-background overflow-x-hidden">
        <DashboardTopbar
          locale={locale}
          isBn={isBn}
          actions={actions}
          targetPath={targetPath}
          authUser={authUser}
          userInitials={userInitials}
          onOpenDrawer={() => setMobileDrawerOpen(true)}
          onSearchTutors={() => router.push(withLocale('/tutors', locale))}
        />

        {/* Main Content Body */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
        >
          {subtitle && (
            <div className="mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{subtitle}</p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
