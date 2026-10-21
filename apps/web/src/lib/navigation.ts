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
  badge?: string;
}

export interface NavSection {
  id: string;
  titleBn: string;
  titleEn: string;
  items: NavItem[];
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

/** True when the nav item matches the current pathname (shared by all shell navs). */
export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;

  const normalizedPath = pathname.replace(/^\/(bn|en)/, '');
  const normalizedHref = href.replace(/^\/(bn|en)/, '');
  if (normalizedPath === normalizedHref) return true;

  // Never match bare '/dashboard' against sub-dashboards like '/dashboard/student'
  if (normalizedHref === '/dashboard' || href === '/dashboard') {
    return false;
  }

  // Root role dashboard should only match exact to avoid highlighting dashboard on subpages
  if (/^\/dashboard\/(student|tutor|guardian|admin)$/.test(normalizedHref)) {
    return normalizedPath === normalizedHref;
  }
  return normalizedPath.startsWith(normalizedHref);
}

/** Categorized navigation sections for sidebar and mobile drawer. */
export function navSectionsForRole(role: UserRole | null): NavSection[] {
  if (role === 'student') {
    return [
      {
        id: 'overview',
        titleBn: 'সারসংক্ষেপ',
        titleEn: 'Overview',
        items: [DASHBOARD.student],
      },
      {
        id: 'academics',
        titleBn: 'পড়াশোনা ও ক্লাস',
        titleEn: 'Academics',
        items: [
          {
            href: '/dashboard/student/learning',
            labelBn: 'স্টাডি রুম',
            labelEn: 'Study Room',
            icon: BookOpen,
            testId: 'nav-learning',
          },
          {
            href: '/dashboard/student/sessions',
            labelBn: 'ক্লাস শিডিউল',
            labelEn: 'Sessions',
            icon: Calendar,
            testId: 'nav-sessions',
          },
        ],
      },
      {
        id: 'tutors',
        titleBn: 'শিক্ষক ও অনুরোধ',
        titleEn: 'Tutors & Requests',
        items: [
          {
            href: '/tutors',
            labelBn: 'শিক্ষক খুঁজুন',
            labelEn: 'Find Tutors',
            icon: Search,
            testId: 'nav-tutors',
          },
          {
            href: '/dashboard/student/requests',
            labelBn: 'বুকিং অনুরোধ',
            labelEn: 'Requests',
            icon: Inbox,
            testId: 'nav-requests',
          },
        ],
      },
      {
        id: 'account',
        titleBn: 'অ্যাকাউন্ট ও ফি',
        titleEn: 'Account & Billing',
        items: [
          {
            href: '/dashboard/student/payments',
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
        ],
      },
    ];
  }

  if (role === 'guardian') {
    return [
      {
        id: 'overview',
        titleBn: 'সারসংক্ষেপ',
        titleEn: 'Overview',
        items: [DASHBOARD.guardian],
      },
      {
        id: 'family',
        titleBn: 'সন্তান ও পড়াশোনা',
        titleEn: 'Family & Academics',
        items: [
          {
            href: '/dashboard/guardian/children',
            labelBn: 'সন্তান ও শিক্ষার্থী',
            labelEn: 'My Children',
            icon: Users,
            testId: 'nav-children',
          },
          {
            href: '/dashboard/guardian/learning',
            labelBn: 'পড়াশোনার অগ্রগতি',
            labelEn: 'Academic Progress',
            icon: BookOpen,
            testId: 'nav-learning',
          },
          {
            href: '/dashboard/guardian/sessions',
            labelBn: 'ক্লাস শিডিউল ও হাজিরা',
            labelEn: 'Class Schedule',
            icon: Calendar,
            testId: 'nav-sessions',
          },
        ],
      },
      {
        id: 'tutors',
        titleBn: 'শিক্ষক ও বুকিং',
        titleEn: 'Tutors & Bookings',
        items: [
          {
            href: '/tutors',
            labelBn: 'শিক্ষক খুঁজুন',
            labelEn: 'Find Tutors',
            icon: Search,
            testId: 'nav-tutors',
          },
          {
            href: '/dashboard/guardian/requests',
            labelBn: 'বুকিং অনুরোধ',
            labelEn: 'Requests',
            icon: Inbox,
            testId: 'nav-requests',
          },
        ],
      },
      {
        id: 'account',
        titleBn: 'আর্থিক ও অ্যাকাউন্ট',
        titleEn: 'Finance & Account',
        items: [
          {
            href: '/dashboard/guardian/payments',
            labelBn: 'টিউশন ফি ও এসক্রো',
            labelEn: 'Tuition & Escrow',
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
        ],
      },
    ];
  }

  if (role === 'tutor') {
    return [
      {
        id: 'overview',
        titleBn: 'সারসংক্ষেপ',
        titleEn: 'Overview',
        items: [DASHBOARD.tutor],
      },
      {
        id: 'teaching',
        titleBn: 'ক্লাস ও শিডিউল',
        titleEn: 'Teaching & Schedule',
        items: [
          {
            href: '/dashboard/tutor/requests',
            labelBn: 'বুকিং ইনবক্স',
            labelEn: 'Requests',
            icon: Inbox,
            testId: 'nav-requests',
          },
          {
            href: '/dashboard/tutor/sessions',
            labelBn: 'ক্লাস শিডিউল',
            labelEn: 'Schedule',
            icon: Calendar,
            testId: 'nav-sessions',
          },
          {
            href: '/dashboard/tutor/learning',
            labelBn: 'টিচিং ও অ্যাসাইনমেন্ট',
            labelEn: 'Teaching',
            icon: BookOpen,
            testId: 'nav-learning',
          },
          {
            href: '/dashboard/tutor/lesson-plans',
            labelBn: 'পাঠ পরিকল্পনা',
            labelEn: 'Lesson Plans',
            icon: BookOpen,
            testId: 'nav-lesson-plans',
          },
        ],
      },
      {
        id: 'credentials',
        titleBn: 'সনদ ও আয়',
        titleEn: 'Credentials & Earnings',
        items: [
          {
            href: '/dashboard/tutor/profile',
            labelBn: 'আমার প্রোফাইল',
            labelEn: 'My Profile',
            icon: User,
            testId: 'nav-tutor-profile',
          },
          {
            href: '/dashboard/tutor/verification',
            labelBn: 'সনদ ও ভেরিফিকেশন',
            labelEn: 'Verification',
            icon: ShieldCheck,
            testId: 'nav-verification',
          },
          {
            href: '/dashboard/tutor/payments',
            labelBn: 'আয় ও উত্তোলন',
            labelEn: 'Earnings',
            icon: CreditCard,
            testId: 'nav-payments',
          },
        ],
      },
      {
        id: 'account',
        titleBn: 'অ্যাকাউন্ট',
        titleEn: 'Account',
        items: [
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
        ],
      },
    ];
  }

  if (role === 'admin' || role === 'super_admin') {
    return [
      {
        id: 'overview',
        titleBn: 'সারসংক্ষেপ',
        titleEn: 'Overview',
        items: [
          {
            href: '/dashboard/admin',
            labelBn: 'মাস্টার কনসোল',
            labelEn: 'Master Console',
            icon: LayoutDashboard,
            testId: 'nav-admin',
          },
          {
            href: '/dashboard/admin/analytics',
            labelBn: 'প্ল্যাটফর্ম অ্যানালিটিক্স',
            labelEn: 'Analytics',
            icon: BarChart3,
            testId: 'nav-analytics',
          },
        ],
      },
      {
        id: 'operations',
        titleBn: 'অ্যাকাডেমিক কার্যক্রম',
        titleEn: 'Operations',
        items: [
          {
            href: '/dashboard/admin/verification',
            labelBn: 'শিক্ষক যাচাই ও সনদ',
            labelEn: 'Tutor Verification',
            icon: ShieldCheck,
            testId: 'nav-tutors',
          },
          {
            href: '/dashboard/admin/taxonomy',
            labelBn: 'একাডেমিক ট্যাক্সোনমি',
            labelEn: 'Academic Taxonomy',
            icon: GraduationCap,
            testId: 'nav-taxonomy',
          },
          {
            href: '/dashboard/admin/bookings',
            labelBn: 'টিউশন ও বুকিং ম্যানেজমেন্ট',
            labelEn: 'Tuition Bookings',
            icon: Calendar,
            testId: 'nav-bookings',
          },
          {
            href: '/dashboard/admin/learning',
            labelBn: 'শিক্ষা কার্যক্রম পর্যবেক্ষণ',
            labelEn: 'Learning Oversight',
            icon: BookOpen,
            testId: 'nav-lms-oversight',
          },
        ],
      },
      {
        id: 'governance',
        titleBn: 'প্রশাসন ও নিয়ন্ত্রণ',
        titleEn: 'Governance',
        items: [
          {
            href: '/dashboard/admin/users',
            labelBn: 'ইউজার ও স্টাফ হাব',
            labelEn: 'Users & Staff',
            icon: Users,
            testId: 'nav-users',
          },
          {
            href: '/dashboard/admin/organizations',
            labelBn: 'প্রাতিষ্ঠানিক অর্গানাইজেশন',
            labelEn: 'Organizations',
            icon: Users,
            testId: 'nav-organizations',
          },
          {
            href: '/dashboard/admin/finance',
            labelBn: 'আর্থিক অপারেশন',
            labelEn: 'Finance Operations',
            icon: CreditCard,
            testId: 'nav-finance',
          },
          {
            href: '/dashboard/admin/disputes',
            labelBn: 'লেজার ও রিকনসিলিয়েশন',
            labelEn: 'Finance & Payouts',
            icon: CreditCard,
            testId: 'nav-reconciliation',
          },
          {
            href: '/dashboard/admin/audit-logs',
            labelBn: 'অডিট ও নিরাপত্তা লগ',
            labelEn: 'Audit Logs',
            icon: FileText,
            testId: 'nav-audit',
          },
        ],
      },
      {
        id: 'system',
        titleBn: 'সিস্টেম কনফিগারেশন',
        titleEn: 'System',
        items: [
          {
            href: '/dashboard/admin/settings',
            labelBn: 'প্ল্যাটফর্ম সেটিংস হাব',
            labelEn: 'System Settings',
            icon: UserCog,
            testId: 'nav-settings',
          },
          {
            href: '/notifications',
            labelBn: 'সিস্টেম নোটিফিকেশন',
            labelEn: 'Messages & Alerts',
            icon: MessageSquare,
            testId: 'nav-notifications',
          },
        ],
      },
    ];
  }

  if (role === 'support_agent' || role === 'compliance_reviewer') {
    return [
      {
        id: 'overview',
        titleBn: 'কনসোল',
        titleEn: 'Console',
        items: [
          {
            href: '/dashboard/admin',
            labelBn: role === 'support_agent' ? 'সাপোর্ট কনসোল' : 'কমপ্লায়েন্স কনসোল',
            labelEn: role === 'support_agent' ? 'Support Console' : 'Compliance Console',
            icon: ShieldCheck,
            testId: 'nav-admin',
          },
        ],
      },
    ];
  }

  if (role === 'organization_owner' || role === 'organization_staff') {
    return [
      {
        id: 'overview',
        titleBn: 'অর্গানাইজেশন হাব',
        titleEn: 'Organization Hub',
        items: [
          {
            href: '/dashboard/organization',
            labelBn: 'প্রতিষ্ঠান ড্যাশবোর্ড',
            labelEn: 'Agency Dashboard',
            icon: LayoutDashboard,
            testId: 'nav-organization',
          },
          {
            href: '/dashboard/organization/members',
            labelBn: 'স্টাফ ও শিক্ষক রোস্টার',
            labelEn: 'Staff & Tutors',
            icon: Users,
            testId: 'nav-org-members',
          },
        ],
      },
      {
        id: 'teaching',
        titleBn: 'ক্লাস ও বুকিং',
        titleEn: 'Classes & Bookings',
        items: [
          {
            href: '/messages',
            labelBn: 'ইনস্টিটিউশনাল মেসেজিং',
            labelEn: 'Messages',
            icon: MessageSquare,
            testId: 'nav-messages',
          },
          {
            href: '/notifications',
            labelBn: 'বিজ্ঞপ্তি',
            labelEn: 'Alerts',
            icon: MessageSquare,
            testId: 'nav-notifications',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'public',
      titleBn: 'মেনু',
      titleEn: 'Menu',
      items: [
        {
          href: '/tutors',
          labelBn: 'শিক্ষক খুঁজুন',
          labelEn: 'Find tutors',
          icon: Search,
          testId: 'nav-tutors',
        },
        { href: '/login', labelBn: 'লগইন', labelEn: 'Login', icon: UserCog, testId: 'nav-login' },
      ],
    },
  ];
}

/** Single source of truth for role → navigation items. DashboardShell renders this. */
export function navForRole(role: UserRole | null): NavItem[] {
  return navSectionsForRole(role).flatMap((s) => s.items);
}

export const ROLE_PRESETS: Record<string, RoleConfig> = {
  guardian: {
    badgeBn: 'অভিভাবক পোর্টাল',
    badgeEn: 'Guardian Portal',
    badgeClasses: 'bg-warning/10 text-warning  border-warning/25',
    portalTitleBn: 'অভিভাবক ড্যাশবোর্ড',
    portalTitleEn: 'Guardian Portal',
    widget: {
      titleBn: 'সুরক্ষিত এসক্রো',
      titleEn: 'Secure Escrow',
      descBn: 'ক্লাস যাচাই শেষে পেমেন্ট নিশ্চিতকরণ',
      descEn: 'Disbursement after session verify',
      icon: ShieldCheck,
      accentColor: 'text-warning',
    },
  },
  student: {
    badgeBn: 'শিক্ষার্থী পোর্টাল',
    badgeEn: 'Student Portal',
    badgeClasses: 'bg-primary/10 text-primary  border-primary/25',
    portalTitleBn: 'শিক্ষার্থী ড্যাশবোর্ড',
    portalTitleEn: 'Student Portal',
    widget: {
      titleBn: 'স্টাডি স্ট্রিক 🔥',
      titleEn: 'Study Streak 🔥',
      descBn: 'ধারাবাহিক লার্নিং ট্র্যাক সক্রিয়',
      descEn: 'Consistent learning tracker active',
      icon: Sparkles,
      accentColor: 'text-primary',
    },
  },
  tutor: {
    badgeBn: 'শিক্ষক পোর্টাল',
    badgeEn: 'Tutor Portal',
    badgeClasses: 'bg-primary/10 text-primary  border-primary/25',
    portalTitleBn: 'শিক্ষক ড্যাশবোর্ড',
    portalTitleEn: 'Tutor Portal',
    widget: {
      titleBn: 'টিচিং স্ট্যাটাস',
      titleEn: 'Teaching Status',
      descBn: '🟢 নতুন শিক্ষার্থী গ্রহণে সক্রিয়',
      descEn: '🟢 Open for new bookings',
      icon: CheckCircle2,
      accentColor: 'text-primary',
    },
  },
  admin: {
    badgeBn: 'সুপার অ্যাডমিন',
    badgeEn: 'Super Admin',
    badgeClasses: 'bg-interactive/10 text-interactive  border-interactive/30',
    portalTitleBn: 'অ্যাডমিন কনসোল',
    portalTitleEn: 'Admin Operations',
    widget: {
      titleBn: 'সিস্টেম স্ট্যাটাস',
      titleEn: 'System Health',
      descBn: '⚡ ৯৯.৯৯% আপটাইম ও নিরাপদ',
      descEn: '⚡ 99.99% uptime & secure',
      icon: ShieldCheck,
      accentColor: 'text-interactive',
    },
  },
  support_agent: {
    badgeBn: 'সাপোর্ট কনসোল',
    badgeEn: 'Support Console',
    badgeClasses: 'bg-info/10 text-info-soft-foreground  border-info/30',
    portalTitleBn: 'সাপোর্ট কনসোল',
    portalTitleEn: 'Support Console',
    widget: {
      titleBn: 'সাপোর্ট কিউ',
      titleEn: 'Support Queue',
      descBn: 'টিকিট ট্রায়াজ ও এসএলএ ট্র্যাকিং',
      descEn: 'Ticket triage & SLA tracking',
      icon: MessageSquare,
      accentColor: 'text-info-soft-foreground',
    },
  },
  compliance_reviewer: {
    badgeBn: 'কমপ্লায়েন্স কনসোল',
    badgeEn: 'Compliance Console',
    badgeClasses: 'bg-destructive/10 text-destructive  border-destructive/25',
    portalTitleBn: 'কমপ্লায়েন্স কনসোল',
    portalTitleEn: 'Compliance Console',
    widget: {
      titleBn: 'কমপ্লায়েন্স রিভিউ',
      titleEn: 'Compliance Review',
      descBn: 'নীতিমালা ও ডেটা-রিটেনশন পর্যবেক্ষণ',
      descEn: 'Policy & data-retention oversight',
      icon: ShieldCheck,
      accentColor: 'text-destructive',
    },
  },
  organization_owner: {
    badgeBn: 'অর্গানাইজেশন প্রধান',
    badgeEn: 'Organization Owner',
    badgeClasses: 'bg-primary/10 text-primary border-primary/25',
    portalTitleBn: 'প্রতিষ্ঠান পোর্টাল',
    portalTitleEn: 'Agency Portal',
    widget: {
      titleBn: 'প্রাতিষ্ঠানিক নেটওয়ার্ক',
      titleEn: 'Institutional Network',
      descBn: 'কোচিং সেন্টার ও এজেন্সি ম্যানেজমেন্ট',
      descEn: 'Coaching center & agency roster',
      icon: Users,
      accentColor: 'text-primary',
    },
  },
  organization_staff: {
    badgeBn: 'অর্গানাইজেশন স্টাফ',
    badgeEn: 'Organization Staff',
    badgeClasses: 'bg-info/10 text-info border-info/25',
    portalTitleBn: 'স্টাফ পোর্টাল',
    portalTitleEn: 'Staff Portal',
    widget: {
      titleBn: 'একাডেমিক সমন্বয়',
      titleEn: 'Academic Coordination',
      descBn: 'ক্লাস শিডিউল ও শিক্ষক মনিটরিং',
      descEn: 'Session scheduling & tutor monitoring',
      icon: GraduationCap,
      accentColor: 'text-info',
    },
  },
};

export { GraduationCap };
