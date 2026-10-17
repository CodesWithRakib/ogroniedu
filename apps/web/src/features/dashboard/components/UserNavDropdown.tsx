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
    color: 'bg-interactive/15 text-info-soft-foreground border-info/40',
  },
  tutor: {
    bn: 'গৃহশিক্ষক',
    en: 'Verified Tutor',
    color: 'bg-brand-soft text-primary border-border',
  },
  guardian: {
    bn: 'অভিভাবক',
    en: 'Guardian',
    color: 'bg-primary/15 text-success-soft-foreground border-primary/40',
  },
  admin: {
    bn: 'অ্যাডমিন',
    en: 'Admin',
    color: 'bg-interactive/15 text-interactive border-interactive/30',
  },
  super_admin: {
    bn: 'সুপার অ্যাডমিন',
    en: 'Super Admin',
    color: 'bg-warning/15 text-warning-soft-foreground border-warning/40',
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
          className="group flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full border border-border bg-card/90 hover:bg-card hover:border-brand/60 transition-all duration-200 outline-none focus:ring-2 focus:ring-brand/40 shadow-sm cursor-pointer"
          title={isBn ? 'ইউজার একাউন্ট ও সেটিংস' : 'User Account & Settings'}
        >
          {/* Avatar with online indicator */}
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-brand/30 group-hover:ring-brand/60 transition-all">
              {authUser?.avatarUrl && <AvatarImage src={authUser.avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-brand-soft text-primary font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-border" />
          </div>

          {/* User Name & Role Pill (Hidden on mobile) */}
          <div className="hidden md:flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-transform group-data-[state=open]:rotate-180" />
            </div>
            <span className="text-[10px] text-primary-soft-foreground truncate max-w-[120px]">
              {isBn ? roleMeta.bn : roleMeta.en}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-68 rounded-2xl bg-card/95 border border-border p-2 shadow-sm backdrop-blur-xl text-foreground animate-in fade-in-0 zoom-in-95 z-50"
      >
        {/* Header Label: Full User Info */}
        <DropdownMenuLabel className="p-2.5 rounded-xl bg-card/90 border border-border mb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary font-extrabold text-sm ring-1 ring-brand/35 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
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

        <DropdownMenuSeparator className="bg-brand-soft my-1" />

        {/* Profile Link */}
        <DropdownMenuItem asChild>
          <Link
            href={withLocale('/profile', locale)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
          >
            <User className="h-4 w-4 text-primary" />
            <span>{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</span>
          </Link>
        </DropdownMenuItem>

        {/* Role-Specific Quick Link */}
        {roleKey === 'student' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/student/learning', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>{isBn ? 'স্টাডি রুম ও সেশন' : 'Study Room & Classes'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {roleKey === 'tutor' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/tutor', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
            >
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>{isBn ? 'টিচিং ড্যাশবোর্ড' : 'Teaching Dashboard'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {roleKey === 'guardian' && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/guardian', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>{isBn ? 'সন্তানদের ড্যাশবোর্ড' : 'Children Overview'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {(roleKey === 'admin' || roleKey === 'super_admin') && (
          <DropdownMenuItem asChild>
            <Link
              href={withLocale('/dashboard/admin', locale)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
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
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
          >
            <CreditCard className="h-4 w-4 text-success-soft-foreground" />
            <span>{isBn ? 'পেমেন্টস ও এসক্রো লেজার' : 'Payments & Escrow'}</span>
          </Link>
        </DropdownMenuItem>

        {/* Notifications Link */}
        <DropdownMenuItem asChild>
          <Link
            href={withLocale('/notifications', locale)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:text-primary hover:bg-card/70 cursor-pointer transition-colors"
          >
            <Bell className="h-4 w-4 text-warning-soft-foreground" />
            <span>{isBn ? 'সকল বিজ্ঞপ্তি' : 'All Notifications'}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-brand-soft my-1" />

        {/* Sign Out Action Item */}
        <DropdownMenuItem
          onClick={onLogout}
          data-testid="header-signout-btn"
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-destructive-soft-foreground hover:text-foreground hover:bg-destructive-soft focus:bg-destructive-soft cursor-pointer transition-colors"
        >
          <LogOut className="h-4 w-4 text-destructive-soft-foreground" />
          <span>{isBn ? 'সাইন আউট (লগআউট)' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
