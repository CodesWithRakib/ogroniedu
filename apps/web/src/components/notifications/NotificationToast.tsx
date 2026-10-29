'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Calendar,
  CreditCard,
  ShieldCheck,
  Bell,
  X,
  ExternalLink,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { cn } from '@/lib/utils';
import type { NotificationCategory } from '@ogroniedu/contracts';

interface NotificationToastContainerProps {
  locale?: 'bn' | 'en';
}

export function NotificationToastContainer({ locale = 'bn' }: NotificationToastContainerProps) {
  const { toasts, dismissToast, soundEnabled } = useNotifications();

  if (toasts.length === 0) return null;

  const getCategoryMeta = (category: NotificationCategory) => {
    switch (category) {
      case 'booking':
        return {
          icon: <Calendar className="w-5 h-5 text-success-soft-foreground" />,
          accent: 'border-l-success text-success-soft-foreground bg-success-soft',
          badgeBn: 'বুকিং',
          badgeEn: 'Booking',
        };
      case 'learning':
        return {
          icon: <CheckCircle className="w-5 h-5 text-primary-soft-foreground" />,
          accent: 'border-l-primary text-primary-soft-foreground bg-primary-soft',
          badgeBn: 'শিক্ষা ও ক্লাস',
          badgeEn: 'Learning',
        };
      case 'payment':
        return {
          icon: <CreditCard className="w-5 h-5 text-warning-soft-foreground" />,
          accent: 'border-l-warning text-warning-soft-foreground bg-warning-soft',
          badgeBn: 'পেমেন্ট ও এসক্রো',
          badgeEn: 'Payment',
        };
      case 'trust':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-info-soft-foreground" />,
          accent: 'border-l-info text-info-soft-foreground bg-info-soft',
          badgeBn: 'নিরাপত্তা ও ট্রাস্ট',
          badgeEn: 'Trust & Safety',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-interactive-soft-foreground" />,
          accent: 'border-l-interactive text-interactive-soft-foreground bg-interactive-soft',
          badgeBn: 'সিস্টেম নোটিশ',
          badgeEn: 'System',
        };
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => {
        const meta = getCategoryMeta(toast.category);
        const isUrgent = toast.priority === 'urgent';
        const isHigh = toast.priority === 'high';

        return (
          <div
            key={toast.toastId}
            className={cn(
              'pointer-events-auto relative overflow-hidden flex flex-col rounded-xl shadow-md transition-all duration-300',
              'bg-card  backdrop-blur-xl border border-border  text-foreground',
              'border-l-4 animate-in slide-in-from-bottom-5',
              isUrgent
                ? 'border-l-destructive shadow-sm'
                : isHigh
                  ? 'border-l-warning'
                  : meta.accent.split(' ')[0],
            )}
          >
            <div className="p-4 flex items-start gap-3.5">
              <div
                className={cn(
                  'shrink-0 p-2.5 rounded-xl border border-border shadow-xs flex items-center justify-center',
                  meta.accent.split(' ').slice(1).join(' '),
                )}
              >
                {meta.icon}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {locale === 'bn' ? meta.badgeBn : meta.badgeEn}
                  </span>
                  {soundEnabled && (
                    <span
                      title={locale === 'bn' ? 'ধ্বনি সংকেত বাজানো হয়েছে' : 'Audio chime played'}
                      className="inline-flex items-center gap-1 text-[10px] text-info-soft-foreground font-mono"
                    >
                      <Volume2 className="w-3 h-3 text-info-soft-foreground" />
                      <span>{locale === 'bn' ? 'ধ্বনি সহ' : 'Chime'}</span>
                    </span>
                  )}
                  {isUrgent && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive text-white animate-pulse">
                      {locale === 'bn' ? 'জরুরি' : 'Urgent'}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                  {toast.title}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground  line-clamp-2 leading-relaxed">
                  {toast.body}
                </p>

                {toast.navigationTarget && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <Link
                      href={toast.navigationTarget}
                      onClick={() => dismissToast(toast.toastId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-info-soft-foreground hover:text-info-soft-foreground hover:underline transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{locale === 'bn' ? 'কার্যক্রম দেখুন' : 'View Action'}</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.toastId)}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                aria-label={locale === 'bn' ? 'বিজ্ঞপ্তি বন্ধ করুন' : 'Dismiss notification'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual 6-second auto-dismiss progress countdown */}
            <div className="h-0.5 w-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full animate-[shrink_6s_linear_forwards]',
                  isUrgent ? 'bg-destructive' : 'bg-gradient-to-r from-brand to-brand-accent',
                )}
                style={{
                  animation: 'toastCountdown 6s linear forwards',
                }}
              />
            </div>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes toastCountdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
