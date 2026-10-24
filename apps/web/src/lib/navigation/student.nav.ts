import {
  LayoutDashboard,
  Search,
  Inbox,
  Calendar,
  BookOpen,
  CreditCard,
  MessageSquare,
  Mail,
  User,
} from 'lucide-react';
import type { NavSection } from './types';

export const STUDENT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleBn: 'সারসংক্ষেপ',
    titleEn: 'Overview',
    items: [
      {
        href: '/dashboard/student',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
    ],
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
        href: '/dashboard/student/messages',
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
