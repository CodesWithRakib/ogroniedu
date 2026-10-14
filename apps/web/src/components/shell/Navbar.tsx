'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  Menu,
  X,
  Globe,
  User,
  LogOut,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemePicker } from '../theme/ThemePicker';
import { getDictionary, type Locale } from '@/lib/i18n';
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

  const dashboardHref = user
    ? dashboardPathForRoles(user.roles, locale)
    : withLocale('/dashboard', locale);

  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home, exact: true },
    { href: `/${locale}/tutors`, label: dict.nav.findTutors, isHighlight: true },
    { href: `/${locale}/how-it-works`, label: dict.nav.howItWorks },
    { href: `/${locale}/pricing`, label: dict.nav.pricing },
    { href: `/${locale}/safety`, label: dict.nav.safety },
    { href: `/${locale}/faq`, label: dict.nav.faq },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  function isActive(href: string, exact?: boolean) {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/75 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-xs transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/30 group-hover:scale-105 group-hover:shadow-primary/35 transition-all">
            <GraduationCap className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-card animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground font-bengali">
                {dict.common.appName}
              </span>
              <span className="hidden sm:inline-flex items-center rounded-md bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary-soft-foreground uppercase tracking-wider">
                Ver. 2.0
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline-block">
              {isBn ? 'বিশ্বস্ত শিক্ষক ও শিক্ষার্থী নেটওয়ার্ক' : 'Trusted Tutoring Platform'}
            </span>
          </div>
        </Link>

        {/* Center Pill Navigation */}
        <nav
          aria-label={isBn ? 'প্রধান নেভিগেশন' : 'Main Navigation'}
          className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface-muted/60 border border-border/60 text-xs font-semibold backdrop-blur-sm"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-card text-primary shadow-xs font-bold border border-border/80'
                    : link.isHighlight
                      ? 'text-primary hover:text-primary hover:bg-primary-soft/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover/80'
                }`}
              >
                {link.label}
                {link.isHighlight && !active && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Utility & Auth Area */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme & Palette Switcher */}
          <ThemePicker locale={locale} />

          {/* Bilingual Language Switcher */}
          <Link
            href={targetPath}
            aria-label={`Switch language to ${isBn ? 'English' : 'বাংলা'}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:text-primary transition-all shadow-xs"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {showAuthed && <NotificationBell locale={locale} />}

          {/* Auth CTA Container */}
          <div className="hidden sm:flex items-center gap-2 border-l border-border/70 pl-2.5">
            {showAuthed ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href={dashboardHref}
                  data-testid="navbar-dashboard-link"
                  className="flex items-center gap-2 p-1.5 rounded-full bg-surface-muted/60 hover:bg-surface-hover border border-border/60 transition-all pr-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs ring-1 ring-primary/30">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-foreground">{user.displayName}</span>
                    <span className="text-[9px] text-muted-foreground capitalize">
                      {user.roles[0] || 'Member'}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={dict.nav.logout}
                  className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  data-testid="navbar-logout-btn"
                  title={dict.nav.logout}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href={withLocale('/login', locale)}
                  className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover transition-colors"
                  data-testid="navbar-login-link"
                >
                  {dict.nav.login}
                </Link>
                <Link href={withLocale('/register', locale)} data-testid="navbar-register-link">
                  <Button
                    size="sm"
                    className="rounded-full px-4 text-xs font-bold shadow-sm shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all gap-1.5"
                  >
                    <span>{dict.nav.register}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-80" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={isBn ? 'মোবাইল মেনু খুলুন/বন্ধ করুন' : 'Toggle mobile menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Panel */}
      {mobileMenuOpen && (
        <div
          role="region"
          aria-label={isBn ? 'মোবাইল নেভিগেশন মেনু' : 'Mobile Navigation Menu'}
          className="lg:hidden border-b border-border/80 bg-card/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 shadow-xl"
        >
          <div className="flex flex-col space-y-1 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-colors ${
                    active
                      ? 'bg-primary-soft text-primary font-bold'
                      : 'text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/70">
            {isAuthenticated && user ? (
              <div className="space-y-2.5">
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-surface-muted p-3 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold">{user.displayName}</div>
                    <div className="text-xs text-primary">{dict.nav.dashboard}</div>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {dict.nav.logout}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link href={withLocale('/login', locale)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-center rounded-xl">
                    {dict.nav.login}
                  </Button>
                </Link>
                <Link
                  href={withLocale('/register', locale)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button size="sm" className="w-full justify-center rounded-xl shadow-sm">
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
