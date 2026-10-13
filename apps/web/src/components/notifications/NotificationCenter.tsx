'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCheck,
  Check,
  Calendar,
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Bell,
  WifiOff,
  Inbox,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { cn } from '@/lib/utils';
import type { NotificationCategory } from '@ogroniedu/contracts';

interface NotificationCenterProps {
  locale?: 'bn' | 'en';
}

export function NotificationCenter({ locale = 'bn' }: NotificationCenterProps) {
  const {
    isCenterOpen,
    setIsCenterOpen,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isCenterOpen) return null;

  const filteredItems =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'booking':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'learning':
        return <CheckCircle className="w-4 h-4 text-teal-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'trust':
        return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMinutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
      if (diffMinutes < 1) return locale === 'bn' ? 'এইমাত্র' : 'Just now';
      if (diffMinutes < 60)
        return locale === 'bn' ? `${diffMinutes} মিনিট আগে` : `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return locale === 'bn' ? `${diffHours} ঘন্টা আগে` : `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return locale === 'bn' ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'bn' ? 'বিজ্ঞপ্তি কেন্দ্র' : 'Notification Center'}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md shadow-2xl glass-panel flex flex-col animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {locale === 'bn' ? 'বিজ্ঞপ্তি সমূহ' : 'Notifications'}
          </h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {unreadCount} {locale === 'bn' ? 'অপঠিত' : 'new'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCenterOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Offline Status Warning */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border-b border-amber-200 dark:border-amber-900">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            {locale === 'bn'
              ? 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন রয়েছে। পুনরায় সংযোগের চেষ্টা করা হচ্ছে...'
              : 'Disconnected from notification server. Reconnecting...'}
          </span>
        </div>
      )}

      {/* Controls: Tabs & Mark All As Read */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-colors',
              filter === 'all'
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
            )}
          >
            {locale === 'bn' ? 'সব' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-colors',
              filter === 'unread'
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
            )}
          >
            {locale === 'bn' ? 'অপঠিত' : 'Unread'}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'সব পঠিত করুন' : 'Mark all read'}</span>
          </button>
        )}
      </div>

      {/* Notification Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-1" />
            <p className="mt-3 text-sm font-medium">
              {locale === 'bn' ? 'কোনো বিজ্ঞপ্তি পাওয়া যায়নি' : 'No notifications found'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {locale === 'bn'
                ? 'নতুন বুকিং বা আপডেট আসলে এখানে প্রদর্শিত হবে।'
                : 'New bookings or updates will appear here.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50',
                !item.isRead && 'bg-emerald-50/40 dark:bg-emerald-950/20',
              )}
            >
              <div className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.body}
                </p>

                <div className="mt-2.5 flex items-center justify-between">
                  {item.navigationTarget ? (
                    <a
                      href={item.navigationTarget}
                      onClick={() => !item.isRead && markAsRead(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <span>{locale === 'bn' ? 'কার্যক্রম দেখুন' : 'View Action'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div />
                  )}

                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400"
                      title={locale === 'bn' ? 'পঠিত হিসেবে চিহ্নিত করুন' : 'Mark as read'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'পঠিত' : 'Read'}</span>
                    </button>
                  )}
                </div>
              </div>

              {!item.isRead && (
                <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-emerald-600" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
