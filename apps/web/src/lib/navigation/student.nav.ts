import {
  LayoutDashboard,
  Inbox,
  CreditCard,
  Calendar,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import type { NavSection } from './types';

/**
 * Student Navigation (Comprehensive, supporting both Standalone Adult Learners and Guided Students).
 * Provides direct access to Tuition Matches, Payments & Escrow, and Academics.
 */
export const STUDENT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'student-tuitions',
    titleBn: 'কমান্ড ও টিউশন',
    titleEn: 'Command & Tuitions',
    items: [
      {
        href: '/dashboard/student',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
      {
        href: '/dashboard/student/requests',
        labelBn: 'টিউশন রিকোয়েস্ট ও শিক্ষক প্রস্তাব',
        labelEn: 'Tuition Matches & Requests',
        icon: Inbox,
        testId: 'nav-requests',
      },
      {
        href: '/dashboard/student/payments',
        labelBn: 'পেমেন্ট ও এসক্রো সিকিউরিটি',
        labelEn: 'Payments & Escrow',
        icon: CreditCard,
        testId: 'nav-payments',
      },
    ],
  },
  {
    id: 'student-academics',
    titleBn: 'শিক্ষা ও ক্লাসরুম',
    titleEn: 'Academics & Study',
    items: [
      {
        href: '/dashboard/student/sessions',
        labelBn: 'ক্লাস শিডিউল ও রুটিন',
        labelEn: 'Class Schedule',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/dashboard/student/learning',
        labelBn: 'স্টাডি রুম ও রিসোর্স',
        labelEn: 'Study Room & Notes',
        icon: BookOpen,
        testId: 'nav-learning',
      },
      {
        href: '/dashboard/student/messages',
        labelBn: 'শিক্ষকের সাথে চ্যাট',
        labelEn: 'Chat with Tutor',
        icon: MessageSquare,
        testId: 'nav-messages',
      },
    ],
  },
];

/**
 * Child Student Navigation (Guided / Dependent minor with active Guardian).
 * Purely academic & learning focused — zero payment, escrow, or financial elements.
 */
export const CHILD_STUDENT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'child-academics',
    titleBn: 'শিক্ষা ও ক্লাসরুম',
    titleEn: 'Academics & Classroom',
    items: [
      {
        href: '/dashboard/student',
        labelBn: 'ড্যাশবোর্ড',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        testId: 'nav-dashboard',
      },
      {
        href: '/dashboard/student/sessions',
        labelBn: 'ক্লাস শিডিউল ও রুটিন',
        labelEn: 'Class Schedule',
        icon: Calendar,
        testId: 'nav-sessions',
      },
      {
        href: '/dashboard/student/learning',
        labelBn: 'স্টাডি রুম ও রিসোর্স',
        labelEn: 'Study Room & Notes',
        icon: BookOpen,
        testId: 'nav-learning',
      },
      {
        href: '/dashboard/student/messages',
        labelBn: 'শিক্ষকের সাথে চ্যাট',
        labelEn: 'Chat with Tutor',
        icon: MessageSquare,
        testId: 'nav-messages',
      },
    ],
  },
];
