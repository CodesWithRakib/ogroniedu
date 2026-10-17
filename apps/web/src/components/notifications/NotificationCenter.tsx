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
          icon: <Calendar className="w-4 h-4 text-success-soft-foreground" />,
          bg: 'bg-primary/10 text-success-soft-foreground border-primary/40',
          badgeBn: 'বুকিং',
          badgeEn: 'Booking',
        };
      case 'learning':
        return {
          icon: <CheckCircle className="w-4 h-4 text-primary-soft-foreground" />,
          bg: 'bg-primary/10 text-primary-soft-foreground border-primary/40',
          badgeBn: 'শিক্ষা',
          badgeEn: 'Learning',
        };
      case 'payment':
        return {
          icon: <CreditCard className="w-4 h-4 text-warning-soft-foreground" />,
          bg: 'bg-warning/10 text-warning-soft-foreground border-warning/40',
          badgeBn: 'পেমেন্ট',
          badgeEn: 'Payment',
        };
      case 'trust':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-info-soft-foreground" />,
          bg: 'bg-interactive/10 text-info-soft-foreground border-info/40',
          badgeBn: 'নিরাপত্তা',
          badgeEn: 'Trust',
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-interactive-soft-foreground" />,
          bg: 'bg-interactive/10 text-interactive-soft-foreground border-interactive/40',
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
          'bg-card  backdrop-blur-2xl border-l border-border  text-foreground',
          'animate-in slide-in-from-right duration-300',
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-interactive/10 border border-info/40 text-info-soft-foreground">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  {locale === 'bn' ? 'বিজ্ঞপ্তি কেন্দ্র' : 'Notifications'}
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-interactive/20 text-info-soft-foreground border border-info/40">
                    {unreadCount} {locale === 'bn' ? 'নতুন' : 'new'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
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
                  ? 'bg-interactive/15 border-info/40 text-info-soft-foreground hover:bg-interactive/25'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Sound button */}
            <button
              type="button"
              onClick={() => testSound('chime')}
              title={locale === 'bn' ? 'সাউন্ড টেস্ট করুন' : 'Test Sound'}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-muted hover:bg-surface-hover text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1 transition-all"
            >
              <Play className="w-3 h-3 text-info-soft-foreground fill-info" />
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
                  ? 'bg-interactive/20 border-info/40 text-info-soft-foreground'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsCenterOpen(false)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Volume Slider Panel */}
        {showVolumeSlider && (
          <div className="px-4 py-2.5 bg-muted  border-b border-border flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground shrink-0 font-medium">
              {locale === 'bn' ? 'শব্দের মাত্রা:' : 'Volume:'} {Math.round(soundVolume * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              className="w-full accent-interactive cursor-pointer h-1.5 bg-muted rounded-lg"
            />
            <button
              type="button"
              onClick={() => testSound('urgent')}
              className="text-[11px] text-info-soft-foreground hover:underline shrink-0"
            >
              {locale === 'bn' ? 'অ্যালার্ট' : 'Alert'}
            </button>
          </div>
        )}

        {/* Offline Status Warning */}
        {!isConnected && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive-soft-foreground text-xs border-b border-destructive/40">
            <WifiOff className="w-4 h-4 shrink-0 text-destructive-soft-foreground" />
            <span>
              {locale === 'bn'
                ? 'রিয়েলটাইম সংযোগ বিচ্ছিন্ন। পুনরায় সংযুক্ত হওয়ার চেষ্টা করা হচ্ছে...'
                : 'Disconnected from notification gateway. Reconnecting...'}
            </span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="px-4 py-2 bg-surface-muted border-b border-border flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
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
                  ? 'bg-interactive/20 text-info-soft-foreground border border-info/40 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
              )}
            >
              {locale === 'bn' ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Quick Actions (Mark all read) */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 bg-card  border-b border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 text-xs text-info-soft-foreground hover:text-info-soft-foreground font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'সব বিজ্ঞপ্তি পঠিত করুন' : 'Mark all as read'}</span>
            </button>
          </div>
        )}

        {/* Notification Items Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <div className="p-4 rounded-2xl bg-muted border border-border mb-3">
                <Inbox className="w-10 h-10 text-muted-foreground stroke-1" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {locale === 'bn' ? 'কোনো বিজ্ঞপ্তি পাওয়া যায়নি' : 'No notifications'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
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
                    !item.isRead ? 'bg-interactive/5 hover:bg-interactive/10' : 'hover:bg-surface-hover',
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
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {locale === 'bn' ? meta.badgeBn : meta.badgeEn}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-destructive text-white">
                            {locale === 'bn' ? 'জরুরি' : 'Urgent'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-foreground mt-1 leading-snug">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.body}</p>

                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      {item.navigationTarget ? (
                        <Link
                          href={item.navigationTarget}
                          onClick={() => {
                            if (!item.isRead) markAsRead(item.id);
                            setIsCenterOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-info-soft-foreground hover:text-info-soft-foreground hover:underline"
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
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-info-soft-foreground transition-colors"
                          title={locale === 'bn' ? 'পঠিত হিসেবে চিহ্নিত করুন' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5 text-info-soft-foreground" />
                          <span>{locale === 'bn' ? 'পঠিত' : 'Read'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!item.isRead && (
                    <span className="shrink-0 w-2 h-2 mt-2 rounded-full bg-info shadow-xs shadow-sm" />
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
