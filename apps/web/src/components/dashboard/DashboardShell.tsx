'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Inbox,
  Calendar,
  BookOpen,
  CreditCard,
  Users,
  UserCog,
  ShieldCheck,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import { primaryRole, type UserRole } from '@/store/slices/auth-slice';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelBn: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}

function navForRole(role: UserRole | null): NavItem[] {
  const dashboard: Record<string, NavItem> = {
    student: { href: '/dashboard/student', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
    guardian: { href: '/dashboard/guardian', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
    tutor: { href: '/dashboard/tutor', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
  };
  const common: NavItem[] = [
    { href: '/tutors', labelBn: 'শিক্ষক খুঁজুন', labelEn: 'Find tutors', icon: Search, testId: 'nav-tutors' },
    { href: '/requests', labelBn: 'অনুরোধ', labelEn: 'Requests', icon: Inbox, testId: 'nav-requests' },
    { href: '/sessions', labelBn: 'ক্লাস', labelEn: 'Sessions', icon: Calendar, testId: 'nav-sessions' },
    { href: '/learning', labelBn: 'শেখা', labelEn: 'Learning', icon: BookOpen, testId: 'nav-learning' },
    { href: '/payments', labelBn: 'পেমেন্ট', labelEn: 'Payments', icon: CreditCard, testId: 'nav-payments' },
  ];
  if (role === 'student') {
    return [
      dashboard.student,
      ...common,
      { href: '/notifications', labelBn: 'বিজ্ঞপ্তি', labelEn: 'Alerts', icon: MessageSquare, testId: 'nav-notifications' },
    ];
  }
  if (role === 'guardian') {
    return [
      dashboard.guardian,
      ...common,
      { href: '/dashboard/guardian?tab=children', labelBn: 'সন্তান', labelEn: 'Children', icon: Users, testId: 'nav-children' },
    ];
  }
  if (role === 'tutor') {
    return [
      dashboard.tutor,
      { href: '/requests', labelBn: 'ইনবক্স', labelEn: 'Inbox', icon: Inbox, testId: 'nav-requests' },
      { href: '/sessions', labelBn: 'ক্লাস', labelEn: 'Classes', icon: Calendar, testId: 'nav-sessions' },
      { href: '/learning', labelBn: 'শেখা', labelEn: 'Teaching', icon: BookOpen, testId: 'nav-learning' },
      { href: '/payments', labelBn: 'আয়', labelEn: 'Earnings', icon: CreditCard, testId: 'nav-payments' },
    ];
  }
  if (role === 'admin' || role === 'super_admin' || role === 'support_agent' || role === 'compliance_reviewer') {
    return [
      { href: '/admin', labelBn: 'অ্যাডমিন', labelEn: 'Admin', icon: ShieldCheck, testId: 'nav-admin' },
      { href: '/analytics', labelBn: 'অ্যানালিটিক্স', labelEn: 'Analytics', icon: BarChart3, testId: 'nav-analytics' },
      { href: '/tutors', labelBn: 'শিক্ষক', labelEn: 'Tutors', icon: Search, testId: 'nav-tutors' },
      { href: '/sessions', labelBn: 'সেশন', labelEn: 'Sessions', icon: Calendar, testId: 'nav-sessions' },
      { href: '/profile', labelBn: 'প্রোফাইল', labelEn: 'Profile', icon: UserCog, testId: 'nav-profile' },
    ];
  }
  return [
    { href: '/tutors', labelBn: 'শিক্ষক খুঁজুন', labelEn: 'Find tutors', icon: Search, testId: 'nav-tutors' },
    { href: '/login', labelBn: 'লগইন', labelEn: 'Login', icon: UserCog, testId: 'nav-login' },
  ];
}

export function DashboardShell({
  children,
  locale,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  locale: Locale;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  // Highest-privilege role drives navigation (a user may hold several roles).
  const role: UserRole | null = primaryRole(user?.roles);
  const items = navForRole(role);
  const isBn = locale === 'bn';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8" data-testid="dashboard-shell">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside aria-label={isBn ? 'ড্যাশবোর্ড নেভিগেশন' : 'Dashboard navigation'} className="hidden lg:block">
          <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            {items.map((item) => {
              const href = withLocale(item.href, locale);
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.testId}
                  href={href}
                  data-testid={item.testId}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isBn ? item.labelBn : item.labelEn}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0 pb-20 lg:pb-0">{children}</section>
      </div>
      <nav
        aria-label={isBn ? 'মোবাইল নেভিগেশন' : 'Mobile navigation'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)` }}>
          {items.slice(0, 5).map((item) => {
            const href = withLocale(item.href, locale);
            const active = pathname === href;
            const Icon = item.icon;
            return (
              <Link
                key={item.testId}
                href={href}
                data-testid={`mobile-${item.testId}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium',
                  active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <Icon className="h-5 w-5" />
                {isBn ? item.labelBn : item.labelEn}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
