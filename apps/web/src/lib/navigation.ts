'use client';

import type { ComponentType } from 'react';
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
  User,
  Sparkles,
  CheckCircle2,
  FileText,
  GraduationCap,
} from 'lucide-react';
import type { UserRole } from '@/store/slices/auth-slice';

export interface NavItem {
  href: string;
  labelBn: string;
  labelEn: string;
  icon: ComponentType<{ className?: string }>;
  testId: string;
}

export interface RoleWidget {
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  icon: ComponentType<{ className?: string }>;
  accentColor: string;
}

export interface RoleConfig {
  badgeBn: string;
  badgeEn: string;
  badgeClasses: string;
  portalTitleBn: string;
  portalTitleEn: string;
  widget?: RoleWidget;
}

const DASHBOARD: Record<string, NavItem> = {
  student: {
    href: '/dashboard/student',
    labelBn: 'ড্যাশবোর্ড',
    labelEn: 'Dashboard',
    icon: LayoutDashboard,
    testId: 'nav-dashboard',
  },
  guardian: {
    href: '/dashboard/guardian',
    labelBn: 'ড্যাশবোর্ড',
    labelEn: 'Dashboard',
    icon: LayoutDashboard,
    testId: 'nav-dashboard',
  },
  tutor: {
    href: '/dashboard/tutor',
    labelBn: 'ড্যাশবোর্ড',
    labelEn: 'Dashboard',
    icon: LayoutDashboard,
    testId: 'nav-dashboard',
  },
};

/** Single source of truth for role → navigation items. DashboardShell renders this. */
export function navForRole(role: UserRole | null): NavItem[] {
  if (role === 'student') {
    return [
      DASHBOARD.student,
      {
        href: '/learning',
        labelBn: 'স্টাডি রুম',
        labelEn: 'Study Room',
        icon: BookOpen,
        testId: 'nav-learning',
      },
      {
        href: '/sessions',
        labelBn: 'ক্লাস শিডিউল',
        labelEn: 'Sessions',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/tutors',
        labelBn: 'শিক্ষক খুঁজুন',
        labelEn: 'Find Tutors',
        icon: Search,
        testId: 'nav-tutors',
      },
      {
        href: '/requests',
        labelBn: 'অনুরোধ',
        labelEn: 'Requests',
        icon: Inbox,
        testId: 'nav-requests',
      },
      {
        href: '/payments',
        labelBn: 'পেমেন্ট ও ফি',
        labelEn: 'Payments',
        icon: CreditCard,
        testId: 'nav-payments',
      },
      {
        href: '/notifications',
        labelBn: 'বিজ্ঞপ্তি',
        labelEn: 'Alerts',
        icon: MessageSquare,
        testId: 'nav-notifications',
      },
      {
        href: '/profile',
        labelBn: 'প্রোফাইল',
        labelEn: 'Profile',
        icon: User,
        testId: 'nav-profile',
      },
    ];
  }
  if (role === 'guardian') {
    return [
      DASHBOARD.guardian,
      {
        href: '/tutors',
        labelBn: 'শিক্ষক খুঁজুন',
        labelEn: 'Find Tutors',
        icon: Search,
        testId: 'nav-tutors',
      },
      {
        href: '/requests',
        labelBn: 'অনুরোধ ও বুকিং',
        labelEn: 'Requests',
        icon: Inbox,
        testId: 'nav-requests',
      },
      {
        href: '/sessions',
        labelBn: 'ক্লাস শিডিউল',
        labelEn: 'Sessions',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/learning',
        labelBn: 'পড়াশোনার অগ্রগতি',
        labelEn: 'Learning',
        icon: BookOpen,
        testId: 'nav-learning',
      },
      {
        href: '/payments',
        labelBn: 'ফি ও এসক্রো',
        labelEn: 'Payments',
        icon: CreditCard,
        testId: 'nav-payments',
      },
      {
        href: '/dashboard/guardian?tab=children',
        labelBn: 'সন্তান তালিকা',
        labelEn: 'Children',
        icon: Users,
        testId: 'nav-children',
      },
      {
        href: '/notifications',
        labelBn: 'বিজ্ঞপ্তি',
        labelEn: 'Alerts',
        icon: MessageSquare,
        testId: 'nav-notifications',
      },
      {
        href: '/profile',
        labelBn: 'প্রোফাইল',
        labelEn: 'Profile',
        icon: User,
        testId: 'nav-profile',
      },
    ];
  }
  if (role === 'tutor') {
    return [
      DASHBOARD.tutor,
      {
        href: '/requests',
        labelBn: 'বুকিং ইনবক্স',
        labelEn: 'Requests',
        icon: Inbox,
        testId: 'nav-requests',
      },
      {
        href: '/sessions',
        labelBn: 'ক্লাস শিডিউল',
        labelEn: 'Schedule',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/learning',
        labelBn: 'টিচিং ও অ্যাসাইনমেন্ট',
        labelEn: 'Teaching',
        icon: BookOpen,
        testId: 'nav-learning',
      },
      {
        href: '/payments',
        labelBn: 'আয় ও উত্তোলন',
        labelEn: 'Earnings',
        icon: CreditCard,
        testId: 'nav-payments',
      },
      {
        href: '/notifications',
        labelBn: 'বিজ্ঞপ্তি',
        labelEn: 'Alerts',
        icon: MessageSquare,
        testId: 'nav-notifications',
      },
      {
        href: '/profile',
        labelBn: 'সনদ ও প্রোফাইল',
        labelEn: 'Profile',
        icon: User,
        testId: 'nav-profile',
      },
    ];
  }
  if (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'support_agent' ||
    role === 'compliance_reviewer'
  ) {
    return [
      {
        href: '/admin',
        labelBn: 'কন্ট্রোল সেন্টার',
        labelEn: 'Control Center',
        icon: ShieldCheck,
        testId: 'nav-admin',
      },
      {
        href: '/analytics',
        labelBn: 'অ্যানালিটিক্স',
        labelEn: 'Analytics',
        icon: BarChart3,
        testId: 'nav-analytics',
      },
      {
        href: '/admin?tab=tutors',
        labelBn: 'শিক্ষক যাচাই',
        labelEn: 'Tutor Verification',
        icon: Search,
        testId: 'nav-tutors',
      },
      {
        href: '/admin?tab=reconciliation',
        labelBn: 'লেজার রিকনসিলিয়েশন',
        labelEn: 'Reconciliation',
        icon: CreditCard,
        testId: 'nav-reconciliation',
      },
      {
        href: '/admin?tab=users',
        labelBn: 'ইউজার ম্যানেজার',
        labelEn: 'User Manager',
        icon: Users,
        testId: 'nav-users',
      },
      {
        href: '/admin?tab=audit',
        labelBn: 'অডিট লগ',
        labelEn: 'Audit Logs',
        icon: FileText,
        testId: 'nav-audit',
      },
      {
        href: '/admin?tab=settings',
        labelBn: 'প্ল্যাটফর্ম সেটিংস',
        labelEn: 'Settings',
        icon: UserCog,
        testId: 'nav-settings',
      },
    ];
  }
  return [
    {
      href: '/tutors',
      labelBn: 'শিক্ষক খুঁজুন',
      labelEn: 'Find tutors',
      icon: Search,
      testId: 'nav-tutors',
    },
    { href: '/login', labelBn: 'লগইন', labelEn: 'Login', icon: UserCog, testId: 'nav-login' },
  ];
}

export const ROLE_PRESETS: Record<string, RoleConfig> = {
  guardian: {
    badgeBn: 'অভিভাবক পোর্টাল',
    badgeEn: 'Guardian Portal',
    badgeClasses: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    portalTitleBn: 'অভিভাবক ড্যাশবোর্ড',
    portalTitleEn: 'Guardian Portal',
    widget: {
      titleBn: 'সুরক্ষিত এসক্রো',
      titleEn: 'Secure Escrow',
      descBn: 'ক্লাস যাচাই শেষে পেমেন্ট নিশ্চিতকরণ',
      descEn: 'Disbursement after session verify',
      icon: ShieldCheck,
      accentColor: 'text-amber-500',
    },
  },
  student: {
    badgeBn: 'শিক্ষার্থী পোর্টাল',
    badgeEn: 'Student Portal',
    badgeClasses: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    portalTitleBn: 'শিক্ষার্থী ড্যাশবোর্ড',
    portalTitleEn: 'Student Portal',
    widget: {
      titleBn: 'স্টাডি স্ট্রিক 🔥',
      titleEn: 'Study Streak 🔥',
      descBn: 'ধারাবাহিক লার্নিং ট্র্যাক সক্রিয়',
      descEn: 'Consistent learning tracker active',
      icon: Sparkles,
      accentColor: 'text-emerald-500',
    },
  },
  tutor: {
    badgeBn: 'শিক্ষক পোর্টাল',
    badgeEn: 'Tutor Portal',
    badgeClasses: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    portalTitleBn: 'শিক্ষক ড্যাশবোর্ড',
    portalTitleEn: 'Tutor Portal',
    widget: {
      titleBn: 'টিচিং স্ট্যাটাস',
      titleEn: 'Teaching Status',
      descBn: '🟢 নতুন শিক্ষার্থী গ্রহণে সক্রিয়',
      descEn: '🟢 Open for new bookings',
      icon: CheckCircle2,
      accentColor: 'text-teal-500',
    },
  },
  admin: {
    badgeBn: 'সুপার অ্যাডমিন',
    badgeEn: 'Super Admin',
    badgeClasses: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    portalTitleBn: 'অ্যাডমিন কনসোল',
    portalTitleEn: 'Admin Operations',
    widget: {
      titleBn: 'সিস্টেম স্ট্যাটাস',
      titleEn: 'System Health',
      descBn: '⚡ ৯৯.৯৯% আপটাইম ও নিরাপদ',
      descEn: '⚡ 99.99% uptime & secure',
      icon: ShieldCheck,
      accentColor: 'text-violet-500',
    },
  },
};

export { GraduationCap };
