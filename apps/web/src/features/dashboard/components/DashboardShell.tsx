'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store';
import { withLocale } from '@/lib/auth';
import { primaryRole, logout, type UserRole } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';
import type { Locale } from '@/lib/i18n';
import { navForRole, navSectionsForRole, ROLE_PRESETS } from '@/lib/navigation';
import { useGetMyGuardiansQuery } from '@/store/services/guardians-api';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
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

  // The auth store is only populated on the client, so every user-dependent
  // chrome value must render the same fallback during SSR and the first client
  // render (mount gate) — otherwise shared pages that render this shell
  // directly hydrate against stale nav/user markup. Role layouts already run
  // behind RequireRole's mount gate, which is why this only bit direct usages.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const effectiveUser = mounted ? authUser : null;

  // The layout's nominal role is only used for nav selection when the signed-in
  // user actually holds it; shared surfaces (e.g. the admin console, which also
  // admits support/compliance staff) must not inherit unrelated nav items (F-7).
  const activeRole: UserRole | null =
    roleOverride && effectiveUser?.roles?.includes(roleOverride)
      ? roleOverride
      : primaryRole(effectiveUser?.roles);

  const { data: myGuardians } = useGetMyGuardiansQuery(undefined, {
    skip: !effectiveUser?.id || activeRole !== 'student',
  });
  const hasLinkedGuardian = Boolean(myGuardians && myGuardians.length > 0);
  const isChildStudent =
    activeRole === 'student' &&
    Boolean(effectiveUser?.hasGuardian || effectiveUser?.isMinor || hasLinkedGuardian);

  const items = navForRole(activeRole, { isChildStudent });
  const sections = navSectionsForRole(activeRole, { isChildStudent });
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

  const userInitials = (effectiveUser?.displayName ?? effectiveUser?.phone ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // If already rendered inside an outer RoleDashboardLayout, render only the page inner content & header
  if (isNested) {
    return (
      <div className="flex flex-col gap-6">
        {(title || subtitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              {title && (
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  {subtitle}
                </p>
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
        className="h-screen w-full flex bg-background text-foreground antialiased overflow-hidden selection:bg-brand selection:text-brand-foreground"
        data-testid="dashboard-shell"
      >
        {/* 1. Desktop Fixed Sidebar */}
        <DashboardSidebar
          items={items}
          sections={sections}
          locale={locale}
          isBn={isBn}
          pathname={pathname}
          roleKey={roleKey}
          authUser={effectiveUser}
          userInitials={userInitials}
        />

        {/* 2. Mobile Drawer Navigation */}
        <DashboardMobileNav
          items={items}
          sections={sections}
          locale={locale}
          isBn={isBn}
          pathname={pathname}
          rolePreset={rolePreset}
          drawerOpen={mobileDrawerOpen}
          onCloseDrawer={() => setMobileDrawerOpen(false)}
          onLogout={handleLogout}
        />

        {/* 3. Main Column: Sticky Topbar + Scrollable Main Content */}
        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-background">
          {/* Sticky Topbar */}
          <DashboardTopbar
            locale={locale}
            isBn={isBn}
            actions={actions}
            targetPath={targetPath}
            authUser={effectiveUser}
            role={activeRole}
            onOpenDrawer={() => setMobileDrawerOpen(true)}
            onSearchTutors={() => router.push(withLocale('/request-tutor', locale))}
            onLogout={handleLogout}
          />

          {/* Scrollable Main Content Body */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 bg-background focus-visible:outline-none pb-24 lg:pb-8"
          >
            {/* Breadcrumb Navigation Trail */}
            <Breadcrumbs locale={locale} className="mb-2" />

            {(title || subtitle) && (
              <div className="mb-2">
                {title && (
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    {subtitle}
                  </p>
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
