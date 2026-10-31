import {
  LayoutDashboard,
  Users,
  Inbox,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import type { NavSection } from './types';

/**
 * Guardian Navigation (Streamlined to 5 high-leverage parent command centers).
 * Unnecessary browsing, bookmarks, and fragmented duplicate routes are consolidated.
 */
export const GUARDIAN_NAV_SECTIONS: NavSection[] = [
  {
    id: 'guardian-hub',
    titleBn: 'অভিভাবক নিয়ন্ত্রণ',
    titleEn: 'Guardian Hub',
    items: [
      {
        href: '/dashboard/guardian',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
      {
        href: '/dashboard/guardian/children',
        labelBn: 'সন্তান ও পড়াশোনা',
        labelEn: 'Children & Academics',
        icon: Users,
        testId: 'nav-children',
      },
      {
        href: '/dashboard/guardian/requests',
        labelBn: 'টিউশন ও শিক্ষক প্রস্তাব',
        labelEn: 'Tuition Matches & Requests',
        icon: Inbox,
        testId: 'nav-requests',
      },
      {
        href: '/dashboard/guardian/payments',
        labelBn: 'পেমেন্ট ও এসক্রো সিকিউরিটি',
        labelEn: 'Payments & Escrow',
        icon: CreditCard,
        testId: 'nav-payments',
      },
      {
        href: '/dashboard/guardian/messages',
        labelBn: 'বার্তা ও ইনবক্স',
        labelEn: 'Messages',
        icon: MessageSquare,
        testId: 'nav-messages',
      },
    ],
  },
];
