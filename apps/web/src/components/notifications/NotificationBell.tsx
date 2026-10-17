'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  locale?: 'bn' | 'en';
}

export function NotificationBell({ className, locale = 'bn' }: NotificationBellProps) {
  const { unreadCount, isCenterOpen, setIsCenterOpen, isConnected, soundEnabled } =
    useNotifications();

  // Convert digits to Bengali when in Bengali locale
  const formatCount = (count: number): string => {
    if (count > 99) return locale === 'bn' ? '৯৯+' : '99+';
    if (locale === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(count)
        .split('')
        .map((d) => bnDigits[Number(d)] ?? d)
        .join('');
    }
    return String(count);
  };

  const ariaLabel =
    locale === 'bn'
      ? `বিজ্ঞপ্তি (${formatCount(unreadCount)}টি অপঠিত)`
      : `Notifications (${unreadCount} unread)`;

  return (
    <button
      type="button"
      onClick={() => setIsCenterOpen(!isCenterOpen)}
      aria-label={ariaLabel}
      aria-expanded={isCenterOpen}
      title={
        locale === 'bn'
          ? `বিজ্ঞপ্তি সমূহ (${unreadCount} নতুন) — অডিও ধ্বনি: ${soundEnabled ? 'চালু' : 'বন্ধ'}`
          : `Notifications (${unreadCount} unread) — Audio: ${soundEnabled ? 'Enabled' : 'Muted'}`
      }
      className={cn(
        'relative inline-flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer',
        'hover:bg-cyan-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
        isCenterOpen && 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
        className,
      )}
    >
      <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200 transition-transform duration-200 hover:scale-105" />

      {/* Real-time Unread Badge with animated ping effect */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
          <span
            className={cn(
              'relative inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-black rounded-full',
              'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md shadow-cyan-500/40',
            )}
          >
            {formatCount(unreadCount)}
          </span>
        </span>
      )}

      {/* Online/Offline connection status dot */}
      <span
        title={isConnected ? 'Live WebSockets Connected' : 'Gateway Offline'}
        className={cn(
          'absolute bottom-1 right-1 w-2 h-2 rounded-full border-2 border-white dark:border-slate-950',
          isConnected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/80' : 'bg-rose-500',
        )}
      />
    </button>
  );
}
