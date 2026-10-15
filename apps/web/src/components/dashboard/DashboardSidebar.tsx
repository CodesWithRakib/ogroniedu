'use client';

import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SidebarPromoCard } from './SidebarPromoCard';
import { isNavActive, type NavItem, type RoleConfig } from '@/lib/navigation';
import type { AuthUser } from '@/store/slices/auth-slice';

export interface DashboardSidebarProps {
  items: NavItem[];
  locale: Locale;
  isBn: boolean;
  pathname: string | null;
  roleKey: string;
  rolePreset: RoleConfig;
  authUser: AuthUser | null;
  userInitials: string;
  onLogout: () => void;
}

/** Desktop sidebar: brand, role widget, nav, promo, account snippet. */
export function DashboardSidebar({
  items,
  locale,
  isBn,
  pathname,
  roleKey,
  rolePreset,
  authUser,
  userInitials,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside
      aria-label={isBn ? 'ড্যাশবোর্ড নেভিগেশন' : 'Dashboard navigation'}
      className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col h-screen sticky top-0 border-r border-border bg-card/95 backdrop-blur-md z-30 transition-all select-none"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between gap-3">
        <Link
          href={withLocale(items[0]?.href ?? '/dashboard', locale)}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-xs shadow-primary/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-foreground leading-none">
              {isBn ? 'অগ্রণী' : 'Ogroni'}
              <span className="text-primary font-sans font-extrabold text-sm ml-0.5">
                {isBn ? 'এডু' : 'Edu'}
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {isBn ? 'স্মার্ট লার্নিং প্ল্যাটফর্ম' : 'Smart Learning Platform'}
            </span>
          </div>
        </Link>
        <span
          className={cn(
            'px-2 py-0.5 text-[10px] font-bold rounded-full border',
            rolePreset.badgeClasses,
          )}
        >
          {isBn ? rolePreset.badgeBn : rolePreset.badgeEn}
        </span>
      </div>

      {/* Role Contextual Widget */}
      {rolePreset.widget && (
        <div className="px-3 pt-3.5 pb-1">
          <div className="rounded-xl border border-border/80 bg-surface/75 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <rolePreset.widget.icon
                className={cn('h-4 w-4 shrink-0', rolePreset.widget.accentColor)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {isBn ? rolePreset.widget.titleBn : rolePreset.widget.titleEn}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isBn ? rolePreset.widget.descBn : rolePreset.widget.descEn}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div className="space-y-1">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isBn ? 'মূল মেনু' : 'Menu'}
          </p>

          <nav className="space-y-1">
            {items.map((item) => {
              const href = withLocale(item.href, locale);
              const active = isNavActive(pathname, href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.testId}
                  href={href}
                  data-testid={item.testId}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/20'
                      : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                        active
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-primary',
                      )}
                    />
                    <span className="truncate">{isBn ? item.labelBn : item.labelEn}</span>
                  </div>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/90 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-2">
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
                  ? 'যেকোনো সময় লাইভ ক্লাস ও নোট'
                  : 'Get easy in another way'
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

      {/* User Account Snippet & Logout (Sidebar Footer) */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="rounded-2xl border border-border/80 bg-surface/60 p-2.5 flex items-center justify-between gap-2.5">
          <Link
            href={withLocale('/profile', locale)}
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/40 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User')}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {authUser?.email ||
                  authUser?.phone ||
                  (isBn ? 'সক্রিয় প্রোফাইল' : 'Active Account')}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            aria-label={isBn ? 'লগআউট' : 'Sign out'}
            title={isBn ? 'লগআউট' : 'Sign out'}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
