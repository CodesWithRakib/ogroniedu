import {
  LayoutDashboard,
  Search,
  Calendar,
  BookOpen,
  CreditCard,
  Users,
  UserCog,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  Mail,
  FileText,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import type { NavSection } from './types';

export const ADMIN_NAV_SECTIONS: NavSection[] = [
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
      {
        href: '/dashboard/admin/replacements',
        labelBn: 'রিপ্লেসমেন্ট ক্লেইম',
        labelEn: 'Tutor Replacements',
        icon: RefreshCw,
        testId: 'nav-replacements',
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
        href: '/dashboard/admin/messages',
        labelBn: 'বার্তা',
        labelEn: 'Messages',
        icon: Mail,
        testId: 'nav-messages',
      },
      {
        href: '/notifications',
        labelBn: 'সিস্টেম নোটিফিকেশন',
        labelEn: 'System Alerts',
        icon: MessageSquare,
        testId: 'nav-notifications',
      },
    ],
  },
];

export const SUPPORT_AGENT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleBn: 'সারসংক্ষেপ',
    titleEn: 'Overview',
    items: [
      {
        href: '/dashboard/admin',
        labelBn: 'সাপোর্ট কনসোল',
        labelEn: 'Support Console',
        icon: ShieldCheck,
        testId: 'nav-admin',
      },
    ],
  },
  {
    id: 'support_ops',
    titleBn: 'সাপোর্ট কার্যক্রম',
    titleEn: 'Support Operations',
    items: [
      {
        href: '/dashboard/admin/bookings',
        labelBn: 'টিউশন বুকিংস',
        labelEn: 'Tuition Bookings',
        icon: Calendar,
        testId: 'nav-bookings',
      },
      {
        href: '/dashboard/admin/replacements',
        labelBn: 'রিপ্লেসমেন্ট ক্লেইম',
        labelEn: 'Replacements',
        icon: RefreshCw,
        testId: 'nav-replacements',
      },
      {
        href: '/dashboard/admin/disputes',
        labelBn: 'ডিসপিউট সাপোর্ট',
        labelEn: 'Disputes',
        icon: CreditCard,
        testId: 'nav-disputes',
      },
      {
        href: '/dashboard/admin/users',
        labelBn: 'ইউজার ডিরেক্টরি',
        labelEn: 'Users Directory',
        icon: Users,
        testId: 'nav-users',
      },
      {
        href: '/dashboard/admin/messages',
        labelBn: 'বার্তা',
        labelEn: 'Messages',
        icon: Mail,
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

export const COMPLIANCE_REVIEWER_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleBn: 'সারসংক্ষেপ',
    titleEn: 'Overview',
    items: [
      {
        href: '/dashboard/admin',
        labelBn: 'কমপ্লায়েন্স কনসোল',
        labelEn: 'Compliance Console',
        icon: ShieldCheck,
        testId: 'nav-admin',
      },
    ],
  },
  {
    id: 'compliance_ops',
    titleBn: 'কমপ্লায়েন্স কার্যক্রম',
    titleEn: 'Compliance Review',
    items: [
      {
        href: '/dashboard/admin/verification',
        labelBn: 'শিক্ষক যাচাই ও সনদ',
        labelEn: 'Tutor Verification',
        icon: ShieldCheck,
        testId: 'nav-verification',
      },
      {
        href: '/dashboard/admin/audit-logs',
        labelBn: 'অডিট ও নিরাপত্তা লগ',
        labelEn: 'Audit Logs',
        icon: FileText,
        testId: 'nav-audit',
      },
      {
        href: '/dashboard/admin/disputes',
        labelBn: 'ডিসপিউট পর্যবেক্ষণ',
        labelEn: 'Disputes Review',
        icon: CreditCard,
        testId: 'nav-disputes',
      },
      {
        href: '/dashboard/admin/messages',
        labelBn: 'বার্তা',
        labelEn: 'Messages',
        icon: Mail,
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

export const ORGANIZATION_NAV_SECTIONS: NavSection[] = [
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
        href: '/dashboard/organization/messages',
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

export const PUBLIC_NAV_SECTIONS: NavSection[] = [
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
