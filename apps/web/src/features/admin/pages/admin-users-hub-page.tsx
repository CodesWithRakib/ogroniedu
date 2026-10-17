'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  UserPlus,
  Users,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  FileText,
  ChevronRight,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';

interface UserHubCard {
  id: string;
  href: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  badgeBn: string;
  badgeEn: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  actionBn: string;
  actionEn: string;
}

const USER_HUB_CARDS: UserHubCard[] = [
  {
    id: 'admins',
    href: '/dashboard/admin/users/admins',
    titleBn: 'অ্যাডমিনিস্ট্রেটর রোস্টার',
    titleEn: 'Administrator Roster',
    descBn: 'সিস্টেম অ্যাডমিনিস্ট্রেটরদের তালিকা, অর্পিত রোল পর্যবেক্ষণ, অ্যাডমিন অ্যাক্সেস ও অনুমতি ব্যবস্থাপনা।',
    descEn: 'Manage system administrators, oversee assigned roles, monitor administrative access, and view permissions.',
    badgeBn: 'সুপার অ্যাডমিন',
    badgeEn: 'Super Admin',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    icon: Shield,
    iconBg: 'bg-primary/10 border-primary/20',
    iconColor: 'text-primary',
    actionBn: 'রোস্টার পরিচালনা করুন',
    actionEn: 'Manage & View',
  },
  {
    id: 'create-staff',
    href: '/dashboard/admin/users/admins?action=create',
    titleBn: 'স্টাফ অ্যাকাউন্ট তৈরি',
    titleEn: 'Create Staff Member',
    descBn: 'নতুন সিস্টেম অ্যাডমিন, সাপোর্ট অপারেটর বা কমপ্লায়েন্স রিভিউর যুক্ত করুন এবং সুনির্দিষ্ট রোল অর্পণ করুন।',
    descEn: 'Quickly onboard a new system administrator, staff operator, or regional support manager with direct role assignment.',
    badgeBn: 'স্টাফ প্রভিশনিং',
    badgeEn: 'Staff Provisioning',
    badgeClass: 'bg-info-soft text-info-soft-foreground border-info/30',
    icon: UserPlus,
    iconBg: 'bg-info-soft border-info/30',
    iconColor: 'text-info',
    actionBn: 'স্টাফ তৈরি করুন',
    actionEn: 'Provision Staff',
  },
  {
    id: 'directory',
    href: '/dashboard/admin/users/directory',
    titleBn: 'সকল নিবন্ধিত ইউজার',
    titleEn: 'All Registered Users',
    descBn: 'শিক্ষার্থী, শিক্ষক, অভিভাবক ও স্টাফসহ প্ল্যাটফর্মের সকল অ্যাকাউন্টের বিস্তারিত তালিকা এবং অবস্থা।',
    descEn: 'Browse, search, and manage all accounts across students, tutors, guardians, and platform participants.',
    badgeBn: 'ডিরেক্টরি',
    badgeEn: 'All Accounts',
    badgeClass: 'bg-surface text-foreground border-border',
    icon: Users,
    iconBg: 'bg-surface border-border',
    iconColor: 'text-foreground',
    actionBn: 'ইউজার ডিরেক্টরি দেখুন',
    actionEn: 'Browse Users',
  },
  {
    id: 'tutors',
    href: '/dashboard/admin/users/tutors',
    titleBn: 'শিক্ষক ও টিউটর ডিরেক্টরি',
    titleEn: 'Tutor & Teacher Directory',
    descBn: 'যাচাইকৃত শিক্ষকদের প্রোফাইল, বিষয়ভিত্তিক পারদর্শিতা, রেটিং এবং সক্রিয় টিচিং কার্যক্রম তদারকি।',
    descEn: 'Oversee verified tutors, inspect teaching performance, review ratings, and manage instructor profiles.',
    badgeBn: 'শিক্ষকবৃন্দ',
    badgeEn: 'Educators',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    icon: GraduationCap,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    actionBn: 'শিক্ষক তালিকা দেখুন',
    actionEn: 'View Directory',
  },
  {
    id: 'verification',
    href: '/dashboard/admin/verification',
    titleBn: 'টিউটর কেওয়াইসি ও ভেরিফিকেশন',
    titleEn: 'Tutor KYC Applications',
    descBn: 'নতুন শিক্ষকদের জাতীয় পরিচয়পত্র, সনদপত্র ও শিক্ষাগত যোগ্যতার আবেদন যাচাই এবং অনুমোদন।',
    descEn: 'Review pending tutor registration applications, verify certificates and NID, and approve new educators.',
    badgeBn: 'কেওয়াইসি যাচাই',
    badgeEn: 'KYC Verification',
    badgeClass: 'bg-warning-soft text-warning-soft-foreground border-warning/30',
    icon: ShieldCheck,
    iconBg: 'bg-warning-soft border-warning/30',
    iconColor: 'text-warning',
    actionBn: 'আবেদন যাচাই করুন',
    actionEn: 'Review KYC',
  },
  {
    id: 'students',
    href: '/dashboard/admin/users/students',
    titleBn: 'শিক্ষার্থী ও অভিভাবকবৃন্দ',
    titleEn: 'Students & Guardians',
    descBn: 'সক্রিয় শিক্ষার্থী ও অভিভাবক অ্যাকাউন্ট, টিউশন এনরোলমেন্ট এবং পারিবারিক প্রোফাইল পর্যবেক্ষণ।',
    descEn: 'Monitor active student enrollments, guardian accounts, assigned tuition sessions, and family profiles.',
    badgeBn: 'শিক্ষার্থীবৃন্দ',
    badgeEn: 'Learners',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    icon: BookOpen,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    actionBn: 'শিক্ষার্থী তালিকা দেখুন',
    actionEn: 'View Learners',
  },
  {
    id: 'audit',
    href: '/dashboard/admin/audit-logs',
    titleBn: 'ইমপারসোনেশন ও নিরাপত্তা অডিট',
    titleEn: 'Security & Access Audit',
    descBn: 'প্রশাসনিক অ্যাকশন, রোল পরিবর্তন, ইউজার ইমপারসোনেশন সেশন ও নিরাপত্তা লগ পরীক্ষা করুন।',
    descEn: 'Inspect comprehensive audit trails, admin actions, role modifications, and login sessions.',
    badgeBn: 'অডিট লগ',
    badgeEn: 'Audit Trail',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    icon: FileText,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    actionBn: 'লগ পরিদর্শন করুন',
    actionEn: 'Inspect Logs',
  },
];

export function AdminUsersHubPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const admin = useAdminDashboard(locale);

  const totalUsers = admin.users.length;
  const adminCount = admin.users.filter((u) =>
    u.roles.some((r) => ['super_admin', 'admin', 'support_agent', 'compliance_reviewer'].includes(r)),
  ).length;

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'ইউজার ও স্টাফ হাব' : 'User & Partner Management Hub'}
    >
      <div className="space-y-6 py-6" data-testid="admin-users-hub">
        {/* Eyebrow & Hero Header (Image 1 Exact Layout) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
              {isBn ? 'ফুল অ্যাক্সেস কন্ট্রোল' : 'FULL ACCESS CONTROL'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground">
              {isSuperAdmin ? 'Master Console' : 'Staff Console'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'ইউজার ও পার্টনার ম্যানেজমেন্ট হাব' : 'User & Partner Management Hub'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {isBn
                  ? 'প্ল্যাটফর্মের সকল রোল: অ্যাডমিনিস্ট্রেটর, স্টাফ, শিক্ষক, শিক্ষার্থী ও অভিভাবকদের কেন্দ্রীয় নিয়ন্ত্রণ হাব।'
                  : 'The master control center for all platform roles: Administrators, staff, tutors, students, and guardians.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
                <Users className="w-3.5 h-3.5" />
                <span>{totalUsers} {isBn ? 'টি অ্যাকাউন্ট' : 'Total Accounts'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Column Card Grid (Image 1 Exact Replica) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {USER_HUB_CARDS.map((card) => {
            const Icon = card.icon;
            const targetUrl = withLocale(card.href, locale);

            return (
              <Link
                key={card.id}
                href={targetUrl}
                data-testid={`user-hub-card-${card.id}`}
                className="group relative bg-card border border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Icon squircle + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${card.badgeClass}`}
                    >
                      <span>{isBn ? card.badgeBn : card.badgeEn}</span>
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-foreground mt-4 group-hover:text-primary transition-colors">
                    {isBn ? card.titleBn : card.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {isBn ? card.descBn : card.descEn}
                  </p>
                </div>

                {/* Footer Link: Action text + Arrow */}
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                  <span>{isBn ? card.actionBn : card.actionEn}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
