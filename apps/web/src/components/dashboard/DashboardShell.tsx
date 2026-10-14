'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X, GraduationCap, Globe, Search } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { withLocale } from '@/lib/auth';
import { primaryRole, logout, type UserRole } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SidebarPromoCard } from './SidebarPromoCard';
import { navForRole, ROLE_PRESETS, type NavItem, type RoleConfig } from '@/lib/navigation';

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

export function DashboardShell({
  children,
  locale,
  title,
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
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR (Full-Viewport Height: h-screen sticky)   */}
      {/* ======================================================== */}
      <aside
        aria-label={isBn ? 'ড্যাশবোর্ড নেভিগেশন' : 'Dashboard navigation'}
        className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col h-screen sticky top-0 border-r border-border bg-card/95 backdrop-blur-md z-30 transition-all select-none"
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between gap-3">
          <Link
            href={withLocale(items[0]?.href ?? '/dashboard', locale)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-xs shadow-primary/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-tight text-foreground leading-none">
                {isBn ? 'অগ্রণী' : 'Ogroni'}
                <span className="text-primary font-sans font-extrabold text-sm ml-0.5">
                  {isBn ? 'এডু' : 'Edu'}
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {isBn ? 'স্মার্ট লার্নিং প্ল্যাটফর্ম' : 'Smart Learning Platform'}
              </span>
            </div>
          </Link>
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded-full border',
              rolePreset.badgeClasses,
            )}
          >
            {isBn ? rolePreset.badgeBn : rolePreset.badgeEn}
          </span>
        </div>

        {/* Role Contextual Widget */}
        {rolePreset.widget && (
          <div className="px-3 pt-3.5 pb-1">
            <div className="rounded-xl border border-border/80 bg-surface/75 p-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <rolePreset.widget.icon
                  className={cn('h-4 w-4 shrink-0', rolePreset.widget.accentColor)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {isBn ? rolePreset.widget.titleBn : rolePreset.widget.titleEn}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {isBn ? rolePreset.widget.descBn : rolePreset.widget.descEn}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          <div className="space-y-1">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'মূল মেনু' : 'Menu'}
            </p>

            <nav className="space-y-1">
              {items.map((item) => {
                const href = withLocale(item.href, locale);
                const active =
                  pathname === href || (item.href !== '/dashboard' && pathname?.startsWith(href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.testId}
                    href={href}
                    data-testid={item.testId}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/20'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                          active
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground group-hover:text-primary',
                        )}
                      />
                      <span className="truncate">{isBn ? item.labelBn : item.labelEn}</span>
                    </div>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/90 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Donezo/Shopeers Bottom Promo Card in Sidebar */}
          <div className="pt-2">
            <SidebarPromoCard
              locale={locale}
              title={
                roleKey === 'tutor'
                  ? isBn
                    ? 'টিচিং প্রোফাইল বুস্ট'
                    : 'Boost Tutor Profile'
                  : roleKey === 'guardian'
                    ? isBn
                      ? 'এসক্রো নিরাপত্তা পাস'
                      : 'Parent Escrow Pass'
                    : isBn
                      ? 'মোবাইল অ্যাপ নামিয়ে নিন'
                      : 'Download Mobile App'
              }
              subtitle={
                roleKey === 'tutor'
                  ? isBn
                    ? 'অনুমোদিত শিক্ষক ব্যাজ পান'
                    : 'Get verified badge & more students'
                  : isBn
                    ? 'যেকোনো সময় লাইভ ক্লাস ও নোট'
                    : 'Get easy in another way'
              }
              actionLabel={
                roleKey === 'tutor'
                  ? isBn
                    ? 'যাচাই করুন'
                    : 'Verify Now'
                  : isBn
                    ? 'ডাউনলোড'
                    : 'Download'
              }
              actionHref={roleKey === 'tutor' ? '/profile' : '/tutors'}
            />
          </div>
        </div>

        {/* User Account Snippet & Logout (Sidebar Footer) */}
        <div className="p-3 border-t border-border bg-card/50">
          <div className="rounded-2xl border border-border/80 bg-surface/60 p-2.5 flex items-center justify-between gap-2.5">
            <Link
              href={withLocale('/profile', locale)}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/40 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User')}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {authUser?.email ||
                    authUser?.phone ||
                    (isBn ? 'সক্রিয় প্রোফাইল' : 'Active Account')}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label={isBn ? 'লগআউট' : 'Sign out'}
              title={isBn ? 'লগআউট' : 'Sign out'}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE DRAWER SIDEBAR                                    */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="relative z-50 w-72 max-w-[85vw] h-full bg-card border-r border-border flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-serif text-lg font-bold">
                  {isBn ? 'অগ্রণী' : 'Ogroni'}
                  <span className="text-primary font-sans text-sm ml-0.5">
                    {isBn ? 'এডু' : 'Edu'}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                aria-label={isBn ? 'মেনু বন্ধ করুন' : 'Close menu'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {items.map((item) => {
                const href = withLocale(item.href, locale);
                const active =
                  pathname === href || (item.href !== '/dashboard' && pathname?.startsWith(href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.testId}
                    href={href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{isBn ? item.labelBn : item.labelEn}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-bold rounded-full border',
                  rolePreset.badgeClasses,
                )}
              >
                {isBn ? rolePreset.badgeBn : rolePreset.badgeEn}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isBn ? 'লগআউট' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA & TOPBAR                               */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-background overflow-x-hidden">
        {/* Topbar: Spans Full Remaining Width */}
        <header className="h-16 shrink-0 sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors">
          {/* Left: Mobile Toggle + Search Bar (Donezo & Shopeers Style) */}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors shrink-0"
              aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Donezo & Shopeers Top Search Pill Input */}
            <div className="hidden sm:flex items-center w-full max-w-xs md:max-w-sm relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={
                  isBn ? 'শিক্ষক, বিষয় বা সেশন খুঁজুন...' : 'Search tutors, subjects, sessions...'
                }
                className="w-full h-9 pl-9 pr-12 rounded-full border border-border/80 bg-surface/75 hover:bg-surface focus:bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push(withLocale('/tutors', locale));
                  }
                }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/80 px-1.5 py-0.5 rounded border border-border/60 bg-card pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right: Actions + ThemePicker + Language + Alerts + Donezo Profile Stack */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Custom Action Passed into Shell */}
            {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

            {/* Centralized Theme Palette Picker (Emerald, Ocean Teal, Sapphire, Midnight, Amber + Mode) */}
            <ThemePicker />

            {/* Language Switcher Button */}
            <Link
              href={targetPath}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-all shadow-2xs"
              title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'EN' : 'বাং'}</span>
            </Link>

            {/* Real-time Notification Bell */}
            <NotificationBell locale={locale} />

            {/* User Profile Mini Trigger (Donezo Style: Avatar + Name + Subtitle) */}
            <Link
              href={withLocale('/profile', locale)}
              className="flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full border border-border/80 bg-surface/75 hover:bg-surface-hover transition-colors"
              title={isBn ? 'আমার প্রোফাইল' : 'My profile'}
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-primary to-primary-hover text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-primary/20">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-foreground max-w-[100px] truncate">
                  {authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User')}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {authUser?.email || authUser?.phone || (isBn ? 'প্রোফাইল' : 'Active Account')}
                </span>
              </div>
            </Link>
          </div>
        </header>

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

      {/* ======================================================== */}
      {/* MOBILE BOTTOM TAB BAR                                    */}
      {/* ======================================================== */}
      <nav
        aria-label={isBn ? 'মোবাইল নেভিগেশন' : 'Mobile navigation'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden shadow-lg"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)` }}
        >
          {items.slice(0, 5).map((item) => {
            const href = withLocale(item.href, locale);
            const active =
              pathname === href || (item.href !== '/dashboard' && pathname?.startsWith(href));
            const Icon = item.icon;

            return (
              <Link
                key={item.testId}
                href={href}
                data-testid={`mobile-${item.testId}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'stroke-[2.5px]')} />
                <span className="truncate max-w-[60px]">{isBn ? item.labelBn : item.labelEn}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
