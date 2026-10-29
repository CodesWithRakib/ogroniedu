'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Globe, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { OgroniEduBrand } from '../brand/OgroniEduBrand';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/auth-slice';
import { useLogoutMutation } from '@/store/services/auth-api';
import { UserNavDropdown } from '@/features/dashboard/components/UserNavDropdown';

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

  // Core essential navigation links only (uncluttered)
  const navLinks = [
    { href: `/${locale}/tutors`, label: dict.nav.findTutors, isHighlight: true },
    { href: `/${locale}/how-it-works`, label: dict.nav.howItWorks },
    { href: `/${locale}/pricing`, label: dict.nav.pricing },
    { href: `/${locale}/safety`, label: dict.nav.safety },
  ];

  function isActive(href: string) {
    if (!pathname) return false;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Modern Academic Emblem & Clean Name */}
        <OgroniEduBrand locale={locale} />

        {/* Center Pill Navigation - Essential Links Only */}
        <nav
          aria-label={isBn ? 'প্রধান নেভিগেশন' : 'Main Navigation'}
          className="hidden md:flex items-center gap-1 p-1 rounded-full text-xs font-medium bg-surface/60 border border-border"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="font-semibold">{isBn ? 'বাং' : 'EN'}</span>
          </Link>

          {showAuthed && <NotificationBell locale={locale} />}

          {/* Auth CTA Container */}
          <div className="hidden sm:flex items-center gap-2">
            {showAuthed ? (
              <UserNavDropdown
                authUser={user}
                locale={locale}
                role={user.roles?.[0]}
                onLogout={handleLogout}
              />
            ) : (
              <Link
                href={withLocale('/login', locale)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                data-testid="navbar-login-link"
              >
                <span>{isBn ? 'লগইন' : 'Login'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={mobileMenuOpen}
            aria-label={isBn ? 'মোবাইল মেনু খুলুন/বন্ধ করুন' : 'Toggle mobile menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-muted-foreground rounded-xl min-h-[44px] min-w-[44px]"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Panel */}
      {mobileMenuOpen && (
        <div
          role="region"
          aria-label={isBn ? 'মোবাইল নেভিগেশন মেনু' : 'Mobile Navigation Menu'}
          className="md:hidden border-b border-border bg-card px-4 pt-3 pb-6 flex flex-col gap-4 shadow-card animate-in slide-in-from-top-2"
        >
          <div className="flex flex-col gap-1 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isActive(link.href);
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

          <div className="pt-3 border-t border-border">
            {showAuthed ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-bold text-foreground">{user.displayName}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {user.roles?.[0] || 'Member'}
                    </p>
                  </div>
                  <Link
                    href={withLocale('/profile', locale)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {isBn ? 'প্রোফাইল' : 'Profile'}
                  </Link>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleLogout}
                >
                  {dict.nav.logout}
                </Button>
              </div>
            ) : (
              <Link href={withLocale('/login', locale)} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {dict.nav.login}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
