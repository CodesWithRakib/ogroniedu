'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { navSectionsForRole, type NavItem, type NavSection } from '@/lib/navigation';
import type { AuthUser, UserRole } from '@/store/slices/auth-slice';
import { SidebarPromoCard } from '@/components/dashboard/SidebarPromoCard';
import { OgroniEduBrand } from '@/components/brand/OgroniEduBrand';

export interface DashboardSidebarProps {
  items: NavItem[];
  sections?: NavSection[];
  locale: Locale;
  isBn: boolean;
  pathname: string | null;
  roleKey: string;
  authUser?: AuthUser | null;
  userInitials?: string;
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
  sections,
  locale,
  isBn,
  pathname,
  roleKey,
}: DashboardSidebarProps) {
  const roleTitle = ROLE_HEADER_TITLES[roleKey] || ROLE_HEADER_TITLES.student;
  const activeSections: NavSection[] =
    sections ??
    (items && items.length > 0 && items.length <= 2
      ? [{ id: 'menu', titleBn: 'মেনু', titleEn: 'Menu', items }]
      : navSectionsForRole(roleKey as UserRole));

  return (
    <aside
      className="hidden lg:flex w-64 xl:w-72 flex-col justify-between h-screen shrink-0 border-r border-border bg-card/95 backdrop-blur-xl z-20 selection:bg-primary selection:text-white"
      data-testid="dashboard-sidebar"
    >
      {/* Top Section: Brand & Nav Links (scrollable) */}
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Brand & Role Header */}
        <div className="space-y-3 pt-1">
          <div className="px-1.5">
            <OgroniEduBrand locale={locale} />
          </div>

          {/* Role Badge Indicator */}
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {isBn ? roleTitle.bn : roleTitle.en}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-soft text-primary border border-primary/20">
              Edu Pro
            </span>
          </div>
        </div>

        {/* Categorized Navigation Sections (Matching User Hierarchy) */}
        <nav className="space-y-4 px-0.5" aria-label="Sidebar navigation">
          {activeSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <div className="px-3 pt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 select-none">
                {isBn ? section.titleBn : section.titleEn}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const targetHref = withLocale(item.href, locale);
                  const active =
                    pathname === targetHref ||
                    (item.href !== '/dashboard' &&
                      item.href !== '/dashboard/admin' &&
                      item.href !== '/dashboard/student' &&
                      item.href !== '/dashboard/tutor' &&
                      item.href !== '/dashboard/guardian' &&
                      pathname?.startsWith(targetHref));

                  return (
                    <Link
                      key={item.href}
                      href={targetHref}
                      data-testid={item.testId}
                      className={cn(
                        'group flex items-center px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                        active
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xs shadow-blue-500/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                            active
                              ? 'text-white'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                        <span className="truncate">{isBn ? item.labelBn : item.labelEn}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: App Download / Promotional Card Only (No user info card) */}
      <div className="p-3 border-t border-border bg-card/60 shrink-0">
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
    </aside>
  );
}
