'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Globe, ShieldAlert } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserNavDropdown } from './UserNavDropdown';
import { EmergencySosModal } from '@/features/trust';
import { Input } from '@/components/ui/Input';
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

/** Modern Dashboard Header: clean glassmorphism, responsive search, language switch, notifications & user profile. */
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
      <header className="h-16 shrink-0 sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left: Mobile Toggle + Sleek Search Input */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="lg:hidden p-2 rounded-xl border border-border bg-card hover:bg-surface-hover text-foreground transition-colors shrink-0 cursor-pointer shadow-2xs"
            aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search Pill Input */}
          <div className="hidden sm:flex items-center w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="text"
              placeholder={
                isBn ? 'শিক্ষক, বিষয় বা সেশন অনুসন্ধান...' : 'Search tutors, subjects, sessions...'
              }
              aria-label={isBn ? 'গ্লোবাল অনুসন্ধান' : 'Global search'}
              className="w-full h-9 pl-9.5 pr-12 rounded-full text-xs bg-surface/70 border-border/80 focus:bg-card focus:border-primary/60 transition-all shadow-inner"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchTutors();
                }
              }}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-card/90 pointer-events-none shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions + SOS + Language + Alerts + User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Custom Actions Slot */}
          {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

          {/* Emergency SOS Fast-Dial Action */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-destructive/30 bg-destructive-soft hover:bg-destructive/15 text-xs font-bold text-destructive transition-all cursor-pointer shadow-2xs hover:scale-105"
            title={isBn ? 'জরুরি এসওএস ও শিশু সুরক্ষা' : 'Emergency SOS & Safeguarding'}
            data-testid="sos-emergency-trigger-btn"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-destructive animate-pulse" />
            <span>{isBn ? 'এসওএস' : 'SOS'}</span>
          </button>

          {/* Language Switcher Pill */}
          <Link
            href={targetPath}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/80 bg-card hover:bg-surface-hover text-xs font-semibold text-foreground transition-all shadow-2xs"
            title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {/* Notification Bell */}
          <NotificationBell locale={locale} />

          {/* User Nav Dropdown with Profile & Sign Out */}
          <UserNavDropdown authUser={authUser} locale={locale} role={role} onLogout={onLogout} />
        </div>
      </header>

      {/* Emergency SOS Hotline Modal */}
      <EmergencySosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} locale={locale} />
    </>
  );
}
