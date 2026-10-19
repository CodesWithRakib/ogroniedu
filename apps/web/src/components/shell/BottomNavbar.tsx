'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap, PlusCircle, Bell, User, LayoutDashboard } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);
  const isBn = locale === 'bn';

  // Auth state is restored from localStorage when the auth slice module loads,
  // so the first client render can already be signed in while the server
  // rendered the signed-out variant. Read auth state only after mount to keep
  // hydration stable (same pattern as Navbar).
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const authedUser = mounted && isAuthenticated ? user : null;

  // Do not render bottom navbar on admin routes or if on full-screen editor
  if (pathname?.includes('/admin')) {
    return null;
  }

  const accountHref = authedUser
    ? dashboardPathForRoles(authedUser.roles, locale)
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
  const isAccountActive = authedUser
    ? pathname.includes('/dashboard') || pathname.includes('/profile')
    : pathname.includes('/login') || pathname.includes('/register');

  return (
    <nav
      aria-label={isBn ? 'মোবাইল বটম নেভিগেশন' : 'Mobile Bottom Navigation'}
      className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-card/95 backdrop-blur-2xl border-t border-border shadow-card pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-2 transition-[background-color,border-color] duration-150"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home Tab */}
        <Link
          href={`/${locale}`}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-[color,transform] duration-150 active:scale-95 ${
            isHomeActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            <Home className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">{isBn ? 'হোম' : 'Home'}</span>
        </Link>

        {/* 2. Find Tutors Tab */}
        <Link
          href={`/${locale}/tutors`}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-[color,transform] duration-150 active:scale-95 ${
            isTutorsActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            <GraduationCap className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
            {isTutorsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">{isBn ? 'শিক্ষক' : 'Tutors'}</span>
        </Link>

        {/* 3. Center Elevated Action: Post Tuition Request */}
        <Link
          href={`/${locale}/requests`}
          className="relative flex flex-col items-center justify-center -top-3.5 px-1 min-h-[44px] group active:scale-95 transition-transform duration-150"
          aria-label={isBn ? 'টিউশন রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-md shadow-blue-500/25 ring-4 ring-card transition-transform duration-150 group-hover:scale-105 ${
              isRequestsActive ? 'ring-blue-500/40' : ''
            }`}
          >
            <PlusCircle className="h-6 w-6 stroke-[2.4]" aria-hidden="true" />
          </div>
          <span
            className={`text-[10px] tracking-tight mt-0.5 ${
              isRequestsActive ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
            }`}
          >
            {isBn ? 'টিউশন পোস্ট' : 'Post Request'}
          </span>
        </Link>

        {/* 4. Notifications Tab */}
        <Link
          href={`/${locale}/notifications`}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-[color,transform] duration-150 active:scale-95 ${
            isNotificationsActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                role="status"
                aria-label={`${unreadCount} ${isBn ? 'নতুন বিজ্ঞপ্তি' : 'unread notifications'}`}
                className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-extrabold text-white"
              >
                {unreadCount > 99 ? '99+' : formatLocalizedNumber(unreadCount, locale)}
              </span>
            )}
            {isNotificationsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">{isBn ? 'বিজ্ঞপ্তি' : 'Alerts'}</span>
        </Link>

        {/* 5. Account / Dashboard Tab */}
        <Link
          href={accountHref}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-[color,transform] duration-150 active:scale-95 ${
            isAccountActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            {authedUser ? (
              <LayoutDashboard className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
            ) : (
              <User className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
            )}
            {isAccountActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 truncate max-w-full">
            {authedUser ? (isBn ? 'ড্যাশবোর্ড' : 'Dashboard') : isBn ? 'প্রোফাইল' : 'Account'}
          </span>
        </Link>
      </div>
    </nav>
  );
}
