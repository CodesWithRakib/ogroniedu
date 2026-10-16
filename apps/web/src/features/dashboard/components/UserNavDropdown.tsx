'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  LogOut,
  Bell,
  CreditCard,
  ChevronDown,
  BookOpen,
  GraduationCap,
  Users,
  ShieldCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import type { AuthUser, UserRole } from '@/store/slices/auth-slice';

export interface UserNavDropdownProps {
  authUser: AuthUser | null;
  locale: Locale;
  role?: UserRole | string | null;
  onLogout: () => void;
}

const ROLE_LABELS: Record<string, { bn: string; en: string; color: string }> = {
  student: {
    bn: 'শিক্ষার্থী',
    en: 'Student',
    color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  tutor: {
    bn: 'গৃহশিক্ষক',
    en: 'Verified Tutor',
    color: 'bg-[#0df5c4]/15 text-[#0df5c4] border-[#0df5c4]/35',
  },
  guardian: {
    bn: 'অভিভাবক',
    en: 'Guardian',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  admin: {
    bn: 'অ্যাডমিন',
    en: 'Admin',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  super_admin: {
    bn: 'সুপার অ্যাডমিন',
    en: 'Super Admin',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
};

export function UserNavDropdown({ authUser, locale, role, onLogout }: UserNavDropdownProps) {
  const isBn = locale === 'bn';
  const roleKey = (role as string) || authUser?.roles?.[0] || 'student';
  const roleMeta = ROLE_LABELS[roleKey] || ROLE_LABELS.student;

  const displayName = authUser?.displayName || authUser?.phone || (isBn ? 'ব্যবহারকারী' : 'User');
  const userInitials = (displayName || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="user-nav-dropdown-trigger"
          className="group flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full border border-[#0df5c4]/25 bg-[#061f26]/90 hover:bg-[#072730] hover:border-[#0df5c4]/50 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#0df5c4]/40 shadow-sm cursor-pointer"
          title={isBn ? 'ইউজার একাউন্ট ও সেটিংস' : 'User Account & Settings'}
        >
          {/* Avatar with online indicator */}
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-[#0df5c4]/30 group-hover:ring-[#0df5c4]/60 transition-all">
              {authUser?.avatarUrl && <AvatarImage src={authUser.avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-gradient-to-br from-[#0a3540] via-[#052128] to-[#03151a] text-[#0df5c4] font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#061f26]" />
          </div>

          {/* User Name & Role Pill (Hidden on mobile) */}
          <div className="hidden md:flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-[#0df5c4] transition-colors max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-[#0df5c4] transition-transform group-data-[state=open]:rotate-180" />
            </div>
            <span className="text-[10px] text-teal-300/80 truncate max-w-[120px]">
              {isBn ? roleMeta.bn : roleMeta.en}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-68 rounded-2xl bg-[#061f26]/95 border border-[#0df5c4]/30 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_25px_rgba(13,245,196,0.15)] backdrop-blur-xl text-slate-100 animate-in fade-in-0 zoom-in-95 z-50"
      >
        {/* Header Label: Full User Info */}
        <DropdownMenuLabel className="p-2.5 rounded-xl bg-[#041a21]/90 border border-[#0df5c4]/15 mb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0a3540] via-[#052128] to-[#03151a] text-[#0df5c4] font-extrabold text-sm ring-1 ring-[#0df5c4]/35 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-white truncate">{displayName}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {authUser?.email || authUser?.phone || (isBn ? 'আইডি সক্রিয়' : 'Active Account')}
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleMeta.color}`}
                >
                  {isBn ? roleMeta.bn : roleMeta.en}
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[#0df5c4]/15 my-1" />

        {/* Profile Link */}
        <DropdownMenuItem asChild>
          <Link
            href={withLocale('/profile', locale)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
          >
            <User className="h-4 w-4 text-[#0df5c4]" />
            <span>{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</span>
          </Link>
        </DropdownMenuItem>

        {/* Role-Specific Quick Link */}
        {roleKey === 'student' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/student/learning', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
            >
              <BookOpen className="h-4 w-4 text-[#0df5c4]" />
              <span>{isBn ? 'স্টাডি রুম ও সেশন' : 'Study Room & Classes'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {roleKey === 'tutor' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/tutor', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
            >
              <GraduationCap className="h-4 w-4 text-[#0df5c4]" />
              <span>{isBn ? 'টিচিং ড্যাশবোর্ড' : 'Teaching Dashboard'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {roleKey === 'guardian' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/guardian', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
            >
              <Users className="h-4 w-4 text-[#0df5c4]" />
              <span>{isBn ? 'সন্তানদের ড্যাশবোর্ড' : 'Children Overview'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {(roleKey === 'admin' || roleKey === 'super_admin') && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/admin', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-[#0df5c4]" />
              <span>{isBn ? 'অ্যাডমিন কন্ট্রোল সেন্টার' : 'Control Center'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Payments / Escrow Link */}
        <DropdownMenuItem asChild>
          <Link
            href={withLocale(
              roleKey === 'tutor'
                ? '/dashboard/tutor/payments'
                : roleKey === 'guardian'
                  ? '/dashboard/guardian/payments'
                  : '/dashboard/student/payments',
              locale,
            )}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
          >
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <span>{isBn ? 'পেমেন্টস ও এসক্রো লেজার' : 'Payments & Escrow'}</span>
          </Link>
        </DropdownMenuItem>

        {/* Notifications Link */}
        <DropdownMenuItem asChild>
          <Link
            href={withLocale('/notifications', locale)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 hover:text-[#0df5c4] hover:bg-[#0a313b]/70 cursor-pointer transition-colors"
          >
            <Bell className="h-4 w-4 text-amber-400" />
            <span>{isBn ? 'সকল বিজ্ঞপ্তি' : 'All Notifications'}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#0df5c4]/15 my-1" />

        {/* Sign Out Action Item */}
        <DropdownMenuItem
          onClick={onLogout}
          data-testid="header-signout-btn"
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/60 focus:bg-rose-950/60 cursor-pointer transition-colors"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
          <span>{isBn ? 'সাইন আউট (লগআউট)' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
