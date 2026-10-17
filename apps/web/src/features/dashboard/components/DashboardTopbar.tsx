'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Globe, ShieldAlert } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserNavDropdown } from './UserNavDropdown';
import { EmergencySosModal } from '@/features/trust';
import type { AuthUser, UserRole } from '@/store/slices/auth-slice';

export interface DashboardTopbarProps {
  locale: Locale;
  isBn: boolean;
  actions?: React.ReactNode;
  targetPath: string;
  authUser: AuthUser | null;
  role?: UserRole | string | null;
  onOpenDrawer: () => void;
  onSearchTutors: () => void;
  onLogout: () => void;
}

/** Sticky Topbar: pinned at top, contains search, language switch, notifications & user dropdown. */
export function DashboardTopbar({
  locale,
  isBn,
  actions,
  targetPath,
  authUser,
  role,
  onOpenDrawer,
  onSearchTutors,
  onLogout,
}: DashboardTopbarProps) {
  const [isSosOpen, setIsSosOpen] = useState(false);

  return (
    <>
      <header className="h-16 shrink-0 sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 shadow-xs">
        {/* Left: Mobile Toggle + Search Pill Input */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-lg">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="lg:hidden p-2 rounded-xl border border-border bg-card hover:bg-surface-hover text-foreground transition-colors shrink-0 cursor-pointer"
            aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search Pill Input */}
          <div className="hidden sm:flex items-center w-full max-w-xs md:max-w-sm relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={
                isBn ? 'শিক্ষক, বিষয় বা সেশন খুঁজুন...' : 'Search tutors, subjects, sessions...'
              }
              aria-label={isBn ? 'গ্লোবাল অনুসন্ধান' : 'Global search'}
              className="w-full h-9 pl-9 pr-12 rounded-full border border-border bg-surface-muted hover:bg-surface-hover focus:bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchTutors();
                }
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-card pointer-events-none">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Actions + SOS + Language + Alerts + User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Custom Actions Slot */}
          {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

          {/* Emergency SOS Fast-Dial Action */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-destructive/30 bg-destructive-soft hover:bg-destructive/15 text-xs font-bold text-destructive transition-colors cursor-pointer"
            title={isBn ? 'জরুরি এসওএস ও শিশু সুরক্ষা' : 'Emergency SOS & Child Safeguarding'}
            data-testid="sos-emergency-trigger-btn"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            <span>{isBn ? 'এসওএস' : 'SOS'}</span>
          </button>

          {/* Language Switcher */}
          <Link
            href={targetPath}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/80 bg-card hover:bg-surface-hover text-xs font-semibold text-foreground transition-colors"
            title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe className="h-3.5 w-3.5 text-interactive" />
            <span>{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {/* Notification Bell */}
          <NotificationBell locale={locale} />

          {/* User Dropdown with Profile & Sign Out */}
          <UserNavDropdown authUser={authUser} locale={locale} role={role} onLogout={onLogout} />
        </div>
      </header>

      {/* Emergency SOS Hotline Modal */}
      <EmergencySosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} locale={locale} />
    </>
  );
}
