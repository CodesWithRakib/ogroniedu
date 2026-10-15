'use client';

import Link from 'next/link';
import { Menu, Search, Globe } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import type { AuthUser } from '@/store/slices/auth-slice';

export interface DashboardTopbarProps {
  locale: Locale;
  isBn: boolean;
  actions?: React.ReactNode;
  targetPath: string;
  authUser: AuthUser | null;
  userInitials: string;
  onOpenDrawer: () => void;
  onSearchTutors: () => void;
}

/** Sticky topbar: mobile toggle, search pill, actions, theme, locale, bell, profile. */
export function DashboardTopbar({
  locale,
  isBn,
  actions,
  targetPath,
  authUser,
  userInitials,
  onOpenDrawer,
  onSearchTutors,
}: DashboardTopbarProps) {
  return (
    <header className="h-16 shrink-0 sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors">
      {/* Left: Mobile Toggle + Search Bar (Donezo & Shopeers Style) */}
      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="lg:hidden p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors shrink-0"
          aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Donezo & Shopeers Top Search Pill Input */}
        <div className="hidden sm:flex items-center w-full max-w-xs md:max-w-sm relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={
              isBn ? 'শিক্ষক, বিষয় বা সেশন খুঁজুন...' : 'Search tutors, subjects, sessions...'
            }
            className="w-full h-9 pl-9 pr-12 rounded-full border border-border/80 bg-surface/75 hover:bg-surface focus:bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchTutors();
              }
            }}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/80 px-1.5 py-0.5 rounded border border-border/60 bg-card pointer-events-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Actions + ThemePicker + Language + Alerts + Donezo Profile Stack */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Custom Action Passed into Shell */}
        {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

        {/* Centralized Theme Palette Picker (Emerald, Ocean Teal, Sapphire, Midnight, Amber + Mode) */}
        <ThemePicker />

        {/* Language Switcher Button */}
        <Link
          href={targetPath}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-all shadow-2xs"
          title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span>{isBn ? 'EN' : 'বাং'}</span>
        </Link>

        {/* Real-time Notification Bell */}
        <NotificationBell locale={locale} />

        {/* User Profile Mini Trigger (Donezo Style: Avatar + Name + Subtitle) */}
        <Link
          href={withLocale('/profile', locale)}
          className="flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full border border-border/80 bg-surface/75 hover:bg-surface-hover transition-colors"
          title={isBn ? 'আমার প্রোফাইল' : 'My profile'}
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-primary to-primary-hover text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-primary/20">
            {userInitials}
          </div>
          <div className="hidden md:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-foreground max-w-[100px] truncate">
              {authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User')}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {authUser?.email || authUser?.phone || (isBn ? 'প্রোফাইল' : 'Active Account')}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
