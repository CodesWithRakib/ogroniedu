'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  GraduationCap,
  PlusCircle,
  Bell,
  User,
  LayoutDashboard,
} from 'lucide-react';
import { type Locale, formatLocalizedNumber } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export interface BottomNavbarProps {
  locale: Locale;
}

export function BottomNavbar({ locale }: BottomNavbarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const { unreadCount } = useNotifications();
  const isBn = locale === 'bn';

  // Do not render bottom navbar on admin routes or if on full-screen editor
  if (pathname?.includes('/admin')) {
    return null;
  }

  const dashboardHref = user
    ? dashboardPathForRoles(user.roles, locale)
    : withLocale('/dashboard', locale);

  const accountHref = isAuthenticated && user
    ? dashboardHref
    : withLocale('/login', locale);

  function isActive(href: string, exact: boolean = false) {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const isHomeActive = isActive(`/${locale}`, true);
  const isTutorsActive = isActive(`/${locale}/tutors`);
  const isRequestsActive = isActive(`/${locale}/requests`);
  const isNotificationsActive = isActive(`/${locale}/notifications`);
  const isAccountActive = isAuthenticated
    ? pathname.includes('/dashboard') || pathname.includes('/profile')
    : pathname.includes('/login') || pathname.includes('/register');

  return (
    <nav
      aria-label={isBn ? 'মোবাইল বটম নেভিগেশন' : 'Mobile Bottom Navigation'}
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#031419]/95 backdrop-blur-2xl border-t border-[#0df5c4]/20 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-2 transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home Tab */}
        <Link
          href={`/${locale}`}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
            isHomeActive
              ? 'text-[#0df5c4] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Home className="h-5 w-5 stroke-[2.2]" />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0df5c4] shadow-[0_0_8px_#0df5c4]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">
            {isBn ? 'হোম' : 'Home'}
          </span>
        </Link>

        {/* 2. Find Tutors Tab */}
        <Link
          href={`/${locale}/tutors`}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
            isTutorsActive
              ? 'text-[#0df5c4] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <GraduationCap className="h-5 w-5 stroke-[2.2]" />
            {isTutorsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0df5c4] shadow-[0_0_8px_#0df5c4]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">
            {isBn ? 'শিক্ষক' : 'Tutors'}
          </span>
        </Link>

        {/* 3. Center Elevated Action: Post Tuition Request */}
        <Link
          href={`/${locale}/requests`}
          className="relative flex flex-col items-center justify-center -top-3.5 px-1 group active:scale-90 transition-transform"
          aria-label={isBn ? 'টিউশন রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#0df5c4] via-[#00e1b2] to-[#00bfa5] text-[#031317] shadow-[0_0_20px_rgba(13,245,196,0.65)] ring-4 ring-[#031419] transition-all group-hover:scale-105 ${
            isRequestsActive ? 'ring-[#0df5c4]/40' : ''
          }`}>
            <PlusCircle className="h-6 w-6 stroke-[2.4]" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${
            isRequestsActive ? 'text-[#0df5c4] font-bold' : 'text-slate-300 font-medium'
          }`}>
            {isBn ? 'টিউশন পোস্ট' : 'Post Request'}
          </span>
        </Link>

        {/* 4. Notifications Tab */}
        <Link
          href={`/${locale}/notifications`}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
            isNotificationsActive
              ? 'text-[#0df5c4] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse">
                {unreadCount > 99 ? '99+' : formatLocalizedNumber(unreadCount, locale)}
              </span>
            )}
            {isNotificationsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0df5c4] shadow-[0_0_8px_#0df5c4]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">
            {isBn ? 'বিজ্ঞপ্তি' : 'Alerts'}
          </span>
        </Link>

        {/* 5. Account / Dashboard Tab */}
        <Link
          href={accountHref}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
            isAccountActive
              ? 'text-[#0df5c4] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            {isAuthenticated && user ? (
              <LayoutDashboard className="h-5 w-5 stroke-[2.2]" />
            ) : (
              <User className="h-5 w-5 stroke-[2.2]" />
            )}
            {isAccountActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0df5c4] shadow-[0_0_8px_#0df5c4]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 truncate max-w-[54px]">
            {isAuthenticated && user
              ? (isBn ? 'ড্যাশবোর্ড' : 'Dashboard')
              : (isBn ? 'প্রোফাইল' : 'Account')}
          </span>
        </Link>
      </div>
    </nav>
  );
}
