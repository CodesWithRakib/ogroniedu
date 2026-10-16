'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Globe, ShieldAlert } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { ThemePicker } from '@/components/theme/ThemePicker';
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

/** Sticky Topbar: pinned at top, contains search, theme picker, language switch, notifications & user dropdown. */
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
      <header className="h-16 shrink-0 sticky top-0 z-30 border-b border-[#0df5c4]/20 bg-[#061f26]/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors shadow-sm">
        {/* Left: Mobile Toggle + Search Pill Input */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-lg">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="lg:hidden p-2 rounded-xl border border-[#0df5c4]/25 bg-[#041a21] hover:bg-[#072730] text-slate-200 hover:text-[#0df5c4] transition-colors shrink-0 cursor-pointer"
            aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search Pill Input */}
          <div className="hidden sm:flex items-center w-full max-w-xs md:max-w-sm relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                isBn ? 'শিক্ষক, বিষয় বা সেশন খুঁজুন...' : 'Search tutors, subjects, sessions...'
              }
              className="w-full h-9 pl-9 pr-12 rounded-full border border-[#0df5c4]/20 bg-[#041a21]/90 hover:bg-[#041a21] focus:bg-[#03151a] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0df5c4]/30 focus:border-[#0df5c4]/60 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchTutors();
                }
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded border border-[#0df5c4]/20 bg-[#061f26] pointer-events-none">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Actions + SOS + ThemePicker + Language + Alerts + User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Custom Actions Slot */}
          {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

          {/* Emergency SOS Fast-Dial Action */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/40 bg-red-950/70 hover:bg-red-900/90 text-xs font-black text-red-300 hover:text-white transition-all shadow-md shadow-red-950/40 cursor-pointer animate-pulse"
            title={isBn ? 'জরুরি এসওএস ও শিশু সুরক্ষা' : 'Emergency SOS & Child Safeguarding'}
            data-testid="sos-emergency-trigger-btn"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            <span>{isBn ? 'এসওএস' : 'SOS'}</span>
          </button>

          {/* Theme Palette Picker */}
          <ThemePicker />

          {/* Language Switcher */}
          <Link
            href={targetPath}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#0df5c4]/25 bg-[#041a21]/90 hover:bg-[#072730] text-xs font-semibold text-slate-200 hover:text-[#0df5c4] transition-all shadow-2xs"
            title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe className="h-3.5 w-3.5 text-[#0df5c4]" />
            <span>{isBn ? 'EN' : 'বাং'}</span>
          </Link>

          {/* Notification Bell */}
          <NotificationBell locale={locale} />

          {/* User Dropdown with Profile & Sign Out */}
          <UserNavDropdown authUser={authUser} locale={locale} role={role} onLogout={onLogout} />
        </div>
      </header>

      {/* Emergency SOS Hotline Modal */}
      <EmergencySosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        locale={locale}
      />
    </>
  );
}
