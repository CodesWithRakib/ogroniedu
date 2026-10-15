'use client';

import Link from 'next/link';
import { GraduationCap, LogOut, X } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { isNavActive, type NavItem, type RoleConfig } from '@/lib/navigation';

export interface DashboardMobileNavProps {
  items: NavItem[];
  locale: Locale;
  isBn: boolean;
  pathname: string | null;
  rolePreset: RoleConfig;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onLogout: () => void;
}

/** Mobile drawer sidebar + bottom tab bar (first 5 items). */
export function DashboardMobileNav({
  items,
  locale,
  isBn,
  pathname,
  rolePreset,
  drawerOpen,
  onCloseDrawer,
  onLogout,
}: DashboardMobileNavProps) {
  return (
    <>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseDrawer}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="relative z-50 w-72 max-w-[85vw] h-full bg-card border-r border-border flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-serif text-lg font-bold">
                  {isBn ? 'অগ্রণী' : 'Ogroni'}
                  <span className="text-primary font-sans text-sm ml-0.5">
                    {isBn ? 'এডু' : 'Edu'}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseDrawer}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                aria-label={isBn ? 'মেনু বন্ধ করুন' : 'Close menu'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {items.map((item) => {
                const href = withLocale(item.href, locale);
                const active = isNavActive(pathname, href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.testId}
                    href={href}
                    onClick={onCloseDrawer}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{isBn ? item.labelBn : item.labelEn}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-bold rounded-full border',
                  rolePreset.badgeClasses,
                )}
              >
                {isBn ? rolePreset.badgeBn : rolePreset.badgeEn}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isBn ? 'লগআউট' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label={isBn ? 'মোবাইল নেভিগেশন' : 'Mobile navigation'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden shadow-lg"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)` }}
        >
          {items.slice(0, 5).map((item) => {
            const href = withLocale(item.href, locale);
            const active = isNavActive(pathname, href);
            const Icon = item.icon;

            return (
              <Link
                key={item.testId}
                href={href}
                data-testid={`mobile-${item.testId}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'stroke-[2.5px]')} />
                <span className="truncate max-w-[60px]">{isBn ? item.labelBn : item.labelEn}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
