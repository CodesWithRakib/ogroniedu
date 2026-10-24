import {
  LayoutDashboard,
  Inbox,
  Calendar,
  BookOpen,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  Mail,
  User,
} from 'lucide-react';
import type { NavSection } from './types';

export const TUTOR_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleBn: 'সারসংক্ষেপ',
    titleEn: 'Overview',
    items: [
      {
        href: '/dashboard/tutor',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
    ],
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
        href: '/dashboard/tutor/messages',
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
