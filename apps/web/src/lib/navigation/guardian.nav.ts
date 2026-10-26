import {
  LayoutDashboard,
  Search,
  Inbox,
  Bookmark,
  Calendar,
  BookOpen,
  CreditCard,
  Users,
  ShieldAlert,
  MessageSquare,
  Mail,
  User,
  RefreshCw,
} from 'lucide-react';
import type { NavSection } from './types';

export const GUARDIAN_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleBn: 'সারসংক্ষেপ',
    titleEn: 'Overview',
    items: [
      {
        href: '/dashboard/guardian',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
    ],
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
      {
        href: '/dashboard/guardian/safety-reports',
        labelBn: 'শিশু সুরক্ষা ও অভিযোগ',
        labelEn: 'Child Safety & Reports',
        icon: ShieldAlert,
        testId: 'nav-guardian-safety',
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
      {
        href: '/dashboard/guardian/bookmarks',
        labelBn: 'সংরক্ষিত শিক্ষক',
        labelEn: 'Shortlisted Tutors',
        icon: Bookmark,
        testId: 'nav-guardian-bookmarks',
      },
      {
        href: '/tutor-replacements',
        labelBn: 'শিক্ষক পরিবর্তন গ্যারান্টি',
        labelEn: 'Tutor Replacement',
        icon: RefreshCw,
        testId: 'nav-guardian-tutor-replacements',
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
        href: '/dashboard/guardian/messages',
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
