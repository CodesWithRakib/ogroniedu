'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, X, Globe, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NotificationBell } from '../notifications/NotificationBell';
import { getDictionary, type Locale } from '../../lib/i18n';

export interface NavbarProps {
  locale: Locale;
}

export function Navbar({ locale }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dict = getDictionary(locale);

  const isBn = locale === 'bn';
  const targetLocale: Locale = isBn ? 'en' : 'bn';

  // Compute swapped locale path: /bn/... -> /en/... or /en/... -> /bn/...
  const targetPath = pathname
    ? pathname.replace(new RegExp(`^/${locale}`), `/${targetLocale}`)
    : `/${targetLocale}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/20 group-hover:bg-emerald-800 transition-colors">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bengali">
              {dict.common.appName}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Bangladesh Tutoring Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <Link
            href={`/${locale}`}
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            {dict.nav.home}
          </Link>
          <Link
            href={`/${locale}#features`}
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            {dict.nav.howItWorks}
          </Link>
          <Link
            href={`/${locale}#find-tutors`}
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            {dict.nav.findTutors}
          </Link>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <Link
            href={targetPath}
            aria-label={`Switch language to ${isBn ? 'English' : 'বাংলা'}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span>{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {/* Real-time Notification Bell */}
          <NotificationBell locale={locale} />

          {/* User Profile / Login */}
          <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'অভিভাবক অ্যাকাউন্ট' : 'Guardian Account'}
              </span>
              <span className="text-[10px] text-slate-500">Tanvir Ahmed</span>
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle mobile menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          role="region"
          aria-label="Mobile Navigation Menu"
          className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href={`/${locale}`}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {dict.nav.home}
            </Link>
            <Link
              href={`/${locale}#features`}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {dict.nav.howItWorks}
            </Link>
            <Link
              href={`/${locale}#find-tutors`}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {dict.nav.findTutors}
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              {dict.nav.login}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
