'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Globe, User, LogOut, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { OgroniEduBrand } from '../brand/OgroniEduBrand';
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Owl Mascot & Tagline */}
        <OgroniEduBrand locale={locale} />

        {/* Center Pill Navigation */}
        <nav
          aria-label={isBn ? 'প্রধান নেভিগেশন' : 'Main Navigation'}
          className="hidden xl:flex items-center gap-1 p-1 rounded-full text-xs font-medium"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-primary-soft text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Utility & Auth Area */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Bilingual Language Switcher */}
          <Link
            href={targetPath}
            aria-label={`Switch language to ${isBn ? 'English' : 'বাংলা'}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-interactive" />
            <span className="font-semibold">{isBn ? 'বাং' : 'EN'}</span>
          </Link>

          {showAuthed && <NotificationBell locale={locale} />}

          {/* Auth CTA Container */}
          <div className="hidden sm:flex items-center gap-3">
            {showAuthed ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href={dashboardHref}
                  data-testid="navbar-dashboard-link"
                  className="flex items-center gap-2 p-1.5 rounded-full bg-surface-muted hover:bg-surface-hover border border-border transition-colors pr-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground font-bold text-xs">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-foreground">{user.displayName}</span>
                    <span className="text-[9px] text-primary capitalize">
                      {user.roles[0] || 'Member'}
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label={dict.nav.logout}
                  title={dict.nav.logout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  data-testid="navbar-logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={withLocale('/login', locale)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                  data-testid="navbar-login-link"
                >
                  {isBn ? 'লগইন' : 'Login'}
                </Link>
                <Button asChild size="sm" className="rounded-full px-5 font-bold">
                  <Link href={withLocale('/register', locale)} data-testid="navbar-register-link">
                    <span>{isBn ? 'সাইন আপ' : 'Sign Up'}</span>
                    <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={mobileMenuOpen}
            aria-label={isBn ? 'মোবাইল মেনু খুলুন/বন্ধ করুন' : 'Toggle mobile menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden text-muted-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Panel */}
      {mobileMenuOpen && (
        <div
          role="region"
          aria-label={isBn ? 'মোবাইল নেভিগেশন মেনু' : 'Mobile Navigation Menu'}
          className="lg:hidden border-b border-border bg-card px-4 pt-3 pb-6 space-y-4 shadow-card"
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
                      ? 'bg-primary-soft text-primary-soft-foreground font-bold'
                      : 'text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border">
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
