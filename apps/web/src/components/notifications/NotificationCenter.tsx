'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Volume2,
  VolumeX,
  Play,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { cn } from '@/lib/utils';
import type { NotificationCategory } from '@ogroniedu/contracts';

interface NotificationCenterProps {
  locale?: 'bn' | 'en';
}

type FilterType = 'all' | 'unread' | NotificationCategory;

export function NotificationCenter({ locale = 'bn' }: NotificationCenterProps) {
  const {
    isCenterOpen,
    setIsCenterOpen,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
    soundEnabled,
    toggleSound,
    soundVolume,
    setSoundVolume,
    testSound,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  if (!isCenterOpen) return null;

  const filteredItems = notifications.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const getCategoryMeta = (category: NotificationCategory) => {
    switch (category) {
      case 'booking':
        return {
          icon: <Calendar className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          badgeBn: 'বুকিং',
          badgeEn: 'Booking',
        };
      case 'learning':
        return {
          icon: <CheckCircle className="w-4 h-4 text-teal-400" />,
          bg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
          badgeBn: 'শিক্ষা',
          badgeEn: 'Learning',
        };
      case 'payment':
        return {
          icon: <CreditCard className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          badgeBn: 'পেমেন্ট',
          badgeEn: 'Payment',
        };
      case 'trust':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          badgeBn: 'নিরাপত্তা',
          badgeEn: 'Trust',
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-indigo-400" />,
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          badgeBn: 'সিস্টেম',
          badgeEn: 'System',
        };
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMinutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
      if (diffMinutes < 1) return locale === 'bn' ? 'এইমাত্র' : 'Just now';
      if (diffMinutes < 60)
        return locale === 'bn' ? `${diffMinutes} মিনিট আগে` : `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return locale === 'bn' ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return locale === 'bn' ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsCenterOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={locale === 'bn' ? 'বিজ্ঞপ্তি কেন্দ্র' : 'Notification Center'}
        className={cn(
          'absolute inset-y-0 right-0 max-w-md w-full shadow-2xl flex flex-col',
          'bg-slate-900/95 dark:bg-[#031317]/95 backdrop-blur-2xl border-l border-slate-700/60 dark:border-cyan-500/30 text-white',
          'animate-in slide-in-from-right duration-300',
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {locale === 'bn' ? 'বিজ্ঞপ্তি কেন্দ্র' : 'Notifications'}
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {unreadCount} {locale === 'bn' ? 'নতুন' : 'new'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isConnected
                  ? locale === 'bn'
                    ? 'সার্ভারের সাথে সার্বক্ষণিক যুক্ত'
                    : 'Real-time connected'
                  : locale === 'bn'
                    ? 'সংযোগ বিচ্ছিন্ন'
                    : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={
                soundEnabled
                  ? locale === 'bn'
                    ? 'সাউন্ড সক্রিয় (মিউট করতে ক্লিক করুন)'
                    : 'Sound enabled'
                  : locale === 'bn'
                    ? 'সাউন্ড বন্ধ'
                    : 'Sound muted'
              }
              className={cn(
                'p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5',
                soundEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white',
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Sound button */}
            <button
              type="button"
              onClick={() => testSound('chime')}
              title={locale === 'bn' ? 'সাউন্ড টেস্ট করুন' : 'Test Sound'}
              className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all"
            >
              <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
              <span>{locale === 'bn' ? 'টেস্ট' : 'Test'}</span>
            </button>

            {/* Volume slider toggle */}
            <button
              type="button"
              onClick={() => setShowVolumeSlider((v) => !v)}
              title={locale === 'bn' ? 'ভলিউম নিয়ন্ত্রণ' : 'Volume Control'}
              className={cn(
                'p-2 rounded-xl border transition-all text-xs',
                showVolumeSlider
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white',
              )}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsCenterOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Volume Slider Panel */}
        {showVolumeSlider && (
          <div className="px-4 py-2.5 bg-slate-800/80 dark:bg-[#051c22] border-b border-white/10 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-300 shrink-0 font-medium">
              {locale === 'bn' ? 'শব্দের মাত্রা:' : 'Volume:'} {Math.round(soundVolume * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
            />
            <button
              type="button"
              onClick={() => testSound('urgent')}
              className="text-[11px] text-cyan-400 hover:underline shrink-0"
            >
              {locale === 'bn' ? 'অ্যালার্ট' : 'Alert'}
            </button>
          </div>
        )}

        {/* Offline Status Warning */}
        {!isConnected && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-300 text-xs border-b border-rose-500/20">
            <WifiOff className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {locale === 'bn'
                ? 'রিয়েলটাইম সংযোগ বিচ্ছিন্ন। পুনরায় সংযুক্ত হওয়ার চেষ্টা করা হচ্ছে...'
                : 'Disconnected from notification gateway. Reconnecting...'}
            </span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'all', labelBn: 'সব', labelEn: 'All' },
            { id: 'unread', labelBn: `অপঠিত (${unreadCount})`, labelEn: `Unread (${unreadCount})` },
            { id: 'booking', labelBn: 'বুকিং', labelEn: 'Booking' },
            { id: 'learning', labelBn: 'শিক্ষা', labelEn: 'Learning' },
            { id: 'payment', labelBn: 'পেমেন্ট', labelEn: 'Payment' },
            { id: 'trust', labelBn: 'নিরাপত্তা', labelEn: 'Safety' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as FilterType)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all shrink-0',
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              {locale === 'bn' ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Quick Actions (Mark all read) */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 bg-slate-900/60 dark:bg-black/30 border-b border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'সব বিজ্ঞপ্তি পঠিত করুন' : 'Mark all as read'}</span>
            </button>
          </div>
        )}

        {/* Notification Items Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-3">
                <Inbox className="w-10 h-10 text-slate-500 stroke-1" />
              </div>
              <p className="text-sm font-semibold text-white">
                {locale === 'bn' ? 'কোনো বিজ্ঞপ্তি পাওয়া যায়নি' : 'No notifications'}
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-xs">
                {locale === 'bn'
                  ? 'নতুন ক্লাস রিমাইন্ডার, পেমেন্ট বা আপডেট আসলে তাৎক্ষণিক এখানে যুক্ত হবে।'
                  : 'New reminders, payments, or booking updates will appear here.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const meta = getCategoryMeta(item.category);
              const isUrgent = item.priority === 'urgent';

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-4 transition-colors relative group',
                    !item.isRead ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-white/5',
                  )}
                >
                  <div
                    className={cn(
                      'shrink-0 p-2.5 rounded-xl border flex items-center justify-center shadow-xs',
                      meta.bg,
                    )}
                  >
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {locale === 'bn' ? meta.badgeBn : meta.badgeEn}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white">
                            {locale === 'bn' ? 'জরুরি' : 'Urgent'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white mt-1 leading-snug">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{item.body}</p>

                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      {item.navigationTarget ? (
                        <Link
                          href={item.navigationTarget}
                          onClick={() => {
                            if (!item.isRead) markAsRead(item.id);
                            setIsCenterOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{locale === 'bn' ? 'বিস্তারিত দেখুন' : 'View Action'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div />
                      )}

                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => markAsRead(item.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
                          title={locale === 'bn' ? 'পঠিত হিসেবে চিহ্নিত করুন' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{locale === 'bn' ? 'পঠিত' : 'Read'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!item.isRead && (
                    <span className="shrink-0 w-2 h-2 mt-2 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/50" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
