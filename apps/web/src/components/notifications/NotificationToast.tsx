'use client';

import React from 'react';
import {
  CheckCircle,
  Calendar,
  CreditCard,
  ShieldCheck,
  Bell,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { cn } from '@/lib/utils';
import type { NotificationCategory } from '@ogroniedu/contracts';

interface NotificationToastContainerProps {
  locale?: 'bn' | 'en';
}

export function NotificationToastContainer({ locale = 'bn' }: NotificationToastContainerProps) {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'booking':
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      case 'learning':
        return <CheckCircle className="w-5 h-5 text-teal-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-amber-600" />;
      case 'trust':
        return <ShieldCheck className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl glass-panel',
            'border-l-4 transition-all duration-300 animate-in slide-in-from-bottom-5',
            toast.priority === 'urgent'
              ? 'border-l-rose-500'
              : toast.priority === 'high'
                ? 'border-l-amber-500'
                : 'border-l-emerald-600',
          )}
        >
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            {getCategoryIcon(toast.category)}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {toast.title}
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {toast.body}
            </p>

            {toast.navigationTarget && (
              <a
                href={toast.navigationTarget}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <span>{locale === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissToast(toast.toastId)}
            className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={locale === 'bn' ? 'বিজ্ঞপ্তি সরান' : 'Dismiss notification'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
