import {
  LayoutDashboard,
  Search,
  Calendar,
  CreditCard,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import type { NavSection } from './types';

/**
 * Tutor Navigation (Clean, 6 essential destinations).
 * Uncluttered workflow separating teaching, tuition discovery, earnings, and credentials.
 */
export const TUTOR_NAV_SECTIONS: NavSection[] = [
  {
    id: 'tutor-hub',
    titleBn: 'শিক্ষক পোর্টাল',
    titleEn: 'Tutor Portal',
    items: [
      {
        href: '/dashboard/tutor',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
      {
        href: '/tuitions',
        labelBn: 'টিউশন জব বোর্ড',
        labelEn: 'Tuition Job Board',
        icon: Search,
        testId: 'nav-tutor-tuition-board',
      },
      {
        href: '/dashboard/tutor/sessions',
        labelBn: 'ক্লাস শিডিউল ও হাজিরা',
        labelEn: 'Schedule & Attendance',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/dashboard/tutor/payments',
        labelBn: 'আয় ও উত্তোলন',
        labelEn: 'Earnings & Payouts',
        icon: CreditCard,
        testId: 'nav-payments',
      },
      {
        href: '/dashboard/tutor/profile',
        labelBn: 'প্রোফাইল ও সনদপত্র',
        labelEn: 'Profile & Credentials',
        icon: UserCheck,
        testId: 'nav-tutor-profile',
      },
      {
        href: '/dashboard/tutor/messages',
        labelBn: 'বার্তা ও ইনবক্স',
        labelEn: 'Messages',
        icon: MessageSquare,
        testId: 'nav-messages',
      },
    ],
  },
];
