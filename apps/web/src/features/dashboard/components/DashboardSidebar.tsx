'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import type { NavItem } from '@/lib/navigation';
import type { AuthUser } from '@/store/slices/auth-slice';
import { SidebarPromoCard } from '@/components/dashboard/SidebarPromoCard';

export interface DashboardSidebarProps {
  items: NavItem[];
  locale: Locale;
  isBn: boolean;
  pathname: string | null;
  roleKey: string;
  authUser: AuthUser | null;
  userInitials: string;
}

const ROLE_HEADER_TITLES: Record<string, { bn: string; en: string }> = {
  student: { bn: 'শিক্ষার্থী পোর্টাল', en: 'Student Portal' },
  tutor: { bn: 'গৃহশিক্ষক পোর্টাল', en: 'Tutor Portal' },
  guardian: { bn: 'অভিভাবক পোর্টাল', en: 'Guardian Portal' },
  admin: { bn: 'অ্যাডমিন পোর্টাল', en: 'Admin Portal' },
  super_admin: { bn: 'সুপার অ্যাডমিন', en: 'Super Admin Portal' },
  support_agent: { bn: 'সাপোর্ট কনসোল', en: 'Support Console' },
  compliance_reviewer: { bn: 'কমপ্লায়েন্স কনসোল', en: 'Compliance Console' },
};

export function DashboardSidebar({
  items,
  locale,
  isBn,
  pathname,
  roleKey,
  authUser,
  userInitials,
}: DashboardSidebarProps) {
  const roleTitle = ROLE_HEADER_TITLES[roleKey] || ROLE_HEADER_TITLES.student;

  return (
    <aside
      className="hidden lg:flex w-64 xl:w-72 flex-col justify-between h-screen shrink-0 border-r border-[#0df5c4]/20 bg-[#041920]/95 backdrop-blur-xl z-20 overflow-y-auto selection:bg-[#0df5c4] selection:text-[#031317]"
      data-testid="dashboard-sidebar"
    >
      <div className="p-4 space-y-6">
        {/* Brand & Role Header */}
        <div className="space-y-3 pt-1">
          <Link href={withLocale('/', locale)} className="flex items-center gap-3 px-2 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#0df5c4] to-[#00b38c] text-[#031317] font-black text-lg flex items-center justify-center shadow-[0_0_20px_rgba(13,245,196,0.35)] group-hover:scale-105 transition-transform shrink-0">
              অ
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base tracking-tight text-white block group-hover:text-[#0df5c4] transition-colors">
                OgroniEdu
              </span>
              <span className="text-[11px] font-semibold text-teal-300 block -mt-0.5">
                {isBn ? 'অগ্রণী এডু প্ল্যাটফর্ম' : 'Trusted Learning'}
              </span>
            </div>
          </Link>

          {/* Role Badge Indicator */}
          <div className="mx-2 px-3 py-1.5 rounded-xl bg-[#06242c] border border-[#0df5c4]/25 flex items-center justify-between shadow-inner">
            <span className="text-xs font-bold text-[#0df5c4]">
              {isBn ? roleTitle.bn : roleTitle.en}
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#0df5c4]/20 text-[#0df5c4] border border-[#0df5c4]/30">
              v1.0 Pro
            </span>
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav className="space-y-1.5 px-1" aria-label="Sidebar navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const targetHref = withLocale(item.href, locale);
            const active =
              pathname === targetHref ||
              (item.href !== '/dashboard' && pathname?.startsWith(targetHref));

            return (
              <Link
                key={item.href}
                href={targetHref}
                className={cn(
                  'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  active
                    ? 'bg-[#0df5c4]/15 text-[#0df5c4] border border-[#0df5c4]/35 shadow-[0_0_15px_rgba(13,245,196,0.15)] font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-[#072d36]/70 hover:border-[#0df5c4]/20 border border-transparent',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                      active ? 'text-[#0df5c4]' : 'text-slate-400 group-hover:text-[#0df5c4]',
                    )}
                  />
                  <span className="truncate">{isBn ? item.labelBn : item.labelEn}</span>
                </div>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0df5c4] shadow-[0_0_8px_#0df5c4] shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Promotional / Status Card */}
        <div className="pt-2 px-1">
          <SidebarPromoCard
            locale={locale}
            title={
              roleKey === 'tutor'
                ? isBn
                  ? 'টিচিং প্রোফাইল বুস্ট'
                  : 'Boost Tutor Profile'
                : roleKey === 'guardian'
                  ? isBn
                    ? 'এসক্রো নিরাপত্তা পাস'
                    : 'Parent Escrow Pass'
                  : isBn
                    ? 'মোবাইল অ্যাপ নামিয়ে নিন'
                    : 'Download Mobile App'
            }
            subtitle={
              roleKey === 'tutor'
                ? isBn
                  ? 'অনুমোদিত শিক্ষক ব্যাজ পান'
                  : 'Get verified badge & more students'
                : isBn
                  ? 'যেকোনো সময় লাইভ ক্লাস ও নোট'
                  : 'Live classes & verified tutors'
            }
            actionLabel={
              roleKey === 'tutor'
                ? isBn
                  ? 'যাচাই করুন'
                  : 'Verify Now'
                : isBn
                  ? 'ডাউনলোড'
                  : 'Download'
            }
            actionHref={roleKey === 'tutor' ? '/profile' : '/tutors'}
          />
        </div>
      </div>

      {/* Clean User Account Card (NO LOGOUT BUTTON as requested) */}
      <div className="p-3.5 border-t border-[#0df5c4]/20 bg-[#03151a]/80">
        <Link
          href={withLocale('/profile', locale)}
          className="group rounded-2xl border border-[#0df5c4]/20 hover:border-[#0df5c4]/45 bg-[#06242c]/70 hover:bg-[#06242c] p-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm"
          title={isBn ? 'প্রোফাইল সেটিংস দেখুন' : 'View Profile Settings'}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0a3540] via-[#052128] to-[#03151a] border border-[#0df5c4]/35 text-[#0df5c4] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-bold text-white group-hover:text-[#0df5c4] transition-colors truncate">
                {authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User')}
              </p>
              <p className="text-[10px] text-teal-300/80 truncate mt-0.5">
                {authUser?.email ||
                  authUser?.phone ||
                  (isBn ? 'সক্রিয় প্রোফাইল' : 'Active Account')}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0df5c4] group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
