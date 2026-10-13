'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Menu, X, Globe, User, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemePicker } from '../theme/ThemePicker';
import { getDictionary, type Locale } from '../../lib/i18n';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';

export interface NavbarProps {
  locale: Locale;
}

export function Navbar({ locale }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, refreshToken } = useAppSelector((s) => s.auth);
  const [logoutApi] = useLogoutMutation();
  const dict = getDictionary(locale);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  const showAuthed = mounted && isAuthenticated && user;

  const isBn = locale === 'bn';
  const targetLocale: Locale = isBn ? 'en' : 'bn';

  const targetPath = pathname
    ? pathname.replace(new RegExp(`^/${locale}`), `/${targetLocale}`)
    : `/${targetLocale}`;

  async function handleLogout() {
    try {
      await logoutApi({ refreshToken: refreshToken ?? undefined }).unwrap();
    } catch {
      // Server logout is best-effort; local session always clears.
    }
    dispatch(logout());
    setMobileMenuOpen(false);
    router.replace(withLocale('/login', locale));
  }

  const dashboardHref = user ? dashboardPathForRoles(user.roles, locale) : withLocale('/dashboard', locale);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md shadow-xs transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground font-bengali">
              {dict.common.appName}
            </span>
            <span className="text-[10px] text-primary font-semibold tracking-wide">
              Bangladesh Tutoring Platform
            </span>
          </div>
        </Link>

        <nav
          aria-label={isBn ? 'প্রধান নেভিগেশন' : 'Main Navigation'}
          className="hidden lg:flex items-center gap-5 text-sm font-medium text-muted-foreground"
        >
          <Link href={`/${locale}`} className="hover:text-primary transition-colors">
            {dict.nav.home}
          </Link>
          <Link href={`/${locale}/tutors`} className="hover:text-primary transition-colors font-semibold text-primary">
            {dict.nav.findTutors}
          </Link>
          <Link href={`/${locale}/how-it-works`} className="hover:text-primary transition-colors">
            {dict.nav.howItWorks}
          </Link>
          <Link href={`/${locale}/pricing`} className="hover:text-primary transition-colors">
            {dict.nav.pricing}
          </Link>
          <Link href={`/${locale}/safety`} className="hover:text-primary transition-colors">
            {dict.nav.safety}
          </Link>
          <Link href={`/${locale}/faq`} className="hover:text-primary transition-colors">
            {dict.nav.faq}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
            {dict.nav.contact}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Integrated Theme & Color Customizer */}
          <ThemePicker locale={locale} />

          {/* Bilingual Language Switcher */}
          <Link
            href={targetPath}
            aria-label={`Switch language to ${isBn ? 'English' : 'বাংলা'}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {showAuthed && <NotificationBell locale={locale} />}

          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-2.5">
            {showAuthed ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground font-bold text-xs ring-1 ring-primary/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <Link href={dashboardHref} className="text-xs font-semibold text-foreground hover:text-primary" data-testid="navbar-dashboard-link">
                    {user.displayName}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">{user.roles.join(', ')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={dict.nav.logout}
                  className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                  data-testid="navbar-logout-btn"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {dict.nav.logout}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={withLocale('/login', locale)} className="text-xs font-semibold text-muted-foreground hover:text-primary" data-testid="navbar-login-link">
                  {dict.nav.login}
                </Link>
                <Link href={withLocale('/register', locale)} data-testid="navbar-register-link">
                  <Button size="sm">{dict.nav.register}</Button>
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={isBn ? 'মোবাইল মেনু খুলুন/বন্ধ করুন' : 'Toggle mobile menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          role="region"
          aria-label={isBn ? 'মোবাইল নেভিগেশন মেনু' : 'Mobile Navigation Menu'}
          className="lg:hidden border-b border-border bg-card px-4 pt-2 pb-6 space-y-3"
        >
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <Link href={`/${locale}`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.home}
            </Link>
            <Link href={`/${locale}/tutors`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-primary font-semibold hover:bg-primary-soft">
              {dict.nav.findTutors}
            </Link>
            <Link href={`/${locale}/how-it-works`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.howItWorks}
            </Link>
            <Link href={`/${locale}/pricing`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.pricing}
            </Link>
            <Link href={`/${locale}/safety`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.safety}
            </Link>
            <Link href={`/${locale}/faq`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.faq}
            </Link>
            <Link href={`/${locale}/contact`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-foreground hover:bg-surface-hover">
              {dict.nav.contact}
            </Link>
          </div>
          <div className="pt-2 border-t border-border">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary">
                  {dict.nav.dashboard} — {user.displayName}
                </Link>
                <Button variant="outline" size="sm" className="w-full justify-center" onClick={handleLogout}>
                  {dict.nav.logout}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href={withLocale('/login', locale)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    {dict.nav.login}
                  </Button>
                </Link>
                <Link href={withLocale('/register', locale)} onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full justify-center">
                    {dict.nav.register}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
