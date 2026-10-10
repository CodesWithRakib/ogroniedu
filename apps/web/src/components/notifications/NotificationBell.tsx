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
  const { unreadCount, isCenterOpen, setIsCenterOpen, isConnected } = useNotifications();

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
      className={cn(
        'relative inline-flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer',
        'hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
        isCenterOpen && 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400',
        className,
      )}
    >
      <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300 transition-transform duration-200 hover:scale-105" />

      {/* Real-time Unread Badge */}
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold rounded-full',
            'bg-amber-600 text-white shadow-sm animate-in zoom-in-75 duration-200',
          )}
        >
          {formatCount(unreadCount)}
        </span>
      )}

      {/* Online/Offline connection status dot */}
      <span
        title={isConnected ? 'Connected' : 'Offline'}
        className={cn(
          'absolute bottom-1 right-1 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900',
          isConnected ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      />
    </button>
  );
}
