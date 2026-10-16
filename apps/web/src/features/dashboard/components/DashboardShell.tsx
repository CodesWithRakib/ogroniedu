'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store';
import { withLocale } from '@/lib/auth';
import { primaryRole, logout, type UserRole } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';
import type { Locale } from '@/lib/i18n';
import { navForRole, ROLE_PRESETS } from '@/lib/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { DashboardMobileNav } from '@/components/dashboard/DashboardMobileNav';

export interface DashboardShellProps {
  children: React.ReactNode;
  locale: Locale;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  role?: UserRole | null;
}

/** Context to prevent duplicate shells when role layout and page both use DashboardShell */
export const DashboardShellContext = createContext<boolean>(false);

/**
 * Modern Role Dashboard Shell:
 * - Fixed/Docked Left Sidebar (no logout button, clean obsidian-cyan look)
 * - Sticky Topbar with Global Search & User Dropdown (including Sign Out)
 * - Scrollable Main Page Area (scroll happens strictly inside main content)
 */
export function DashboardShell({
  children,
  locale,
  title,
  subtitle,
  actions,
  role: roleOverride,
}: DashboardShellProps) {
  const isNested = useContext(DashboardShellContext);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const authUser = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  // The layout's nominal role is only used for nav selection when the signed-in
  // user actually holds it; shared surfaces (e.g. the admin console, which also
  // admits support/compliance staff) must not inherit unrelated nav items (F-7).
  const activeRole: UserRole | null =
    roleOverride && authUser?.roles?.includes(roleOverride)
      ? roleOverride
      : primaryRole(authUser?.roles);
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

  const userInitials = (authUser?.displayName ?? authUser?.phone ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // If already rendered inside an outer RoleDashboardLayout, render only the page inner content & header
  if (isNested) {
    return (
      <div className="space-y-6">
        {(title || subtitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              {title && (
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-teal-300/90 font-medium mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <DashboardShellContext.Provider value={true}>
      <div
        className="h-screen w-full flex bg-[#031317] text-slate-100 antialiased overflow-hidden selection:bg-[#0df5c4] selection:text-[#031317]"
        data-testid="dashboard-shell"
      >
        {/* 1. Desktop Fixed Sidebar */}
        <DashboardSidebar
          items={items}
          locale={locale}
          isBn={isBn}
          pathname={pathname}
          roleKey={roleKey}
          authUser={authUser}
          userInitials={userInitials}
        />

        {/* 2. Mobile Drawer Navigation */}
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

        {/* 3. Main Column: Sticky Topbar + Scrollable Main Content */}
        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#031317]">
          {/* Sticky Topbar */}
          <DashboardTopbar
            locale={locale}
            isBn={isBn}
            actions={actions}
            targetPath={targetPath}
            authUser={authUser}
            role={activeRole}
            onOpenDrawer={() => setMobileDrawerOpen(true)}
            onSearchTutors={() => router.push(withLocale('/tutors', locale))}
            onLogout={handleLogout}
          />

          {/* Scrollable Main Content Body */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-[#031317] focus:outline-none"
          >
            {(title || subtitle) && (
              <div className="mb-2">
                {title && (
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-teal-300 font-medium mt-1">{subtitle}</p>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </DashboardShellContext.Provider>
  );
}
