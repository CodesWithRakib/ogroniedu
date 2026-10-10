'use client';

import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Save,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

export interface UserNotificationPreference {
  category: 'booking' | 'schedule' | 'payment' | 'learning' | 'system' | 'marketing';
  channel: 'in_app' | 'email' | 'sms' | 'push';
  isEnabled: boolean;
}

interface NotificationPreferencesViewProps {
  locale: Locale;
  initialPreferences?: UserNotificationPreference[];
  onSavePreferences?: (prefs: UserNotificationPreference[]) => Promise<void>;
}

export function NotificationPreferencesView({
  locale,
  initialPreferences,
  onSavePreferences,
}: NotificationPreferencesViewProps) {
  const dict = getDictionary(locale);
  const n = dict.notifications;

  const categories: Array<{
    id: UserNotificationPreference['category'];
    label: string;
    description: string;
  }> = [
    {
      id: 'booking',
      label: n.catBooking,
      description: 'Requests, tutor acceptances, confirmations and cancellations',
    },
    {
      id: 'schedule',
      label: n.catSchedule,
      description: 'Session reminders, online meeting links, and reschedule notices',
    },
    {
      id: 'payment',
      label: n.catPayment,
      description: 'Escrow deposits, verified receipts, and milestone settlements',
    },
    {
      id: 'learning',
      label: n.catLearning,
      description: 'Attendance records, homework grades, score revision audits',
    },
    {
      id: 'system',
      label: n.catSystem,
      description: 'Account security, policy affirmations, and platform updates',
    },
    {
      id: 'marketing',
      label: n.catMarketing,
      description: 'Discount packages, seasonal academic courses, and newsletters',
    },
  ];

  const channels: Array<{
    id: UserNotificationPreference['channel'];
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'in_app', label: n.channelInApp, icon: <Bell className="w-4 h-4 text-emerald-600" /> },
    { id: 'email', label: n.channelEmail, icon: <Mail className="w-4 h-4 text-indigo-600" /> },
    { id: 'sms', label: n.channelSms, icon: <MessageSquare className="w-4 h-4 text-amber-600" /> },
    { id: 'push', label: n.channelPush, icon: <Smartphone className="w-4 h-4 text-purple-600" /> },
  ];

  // Initialize preference state with defaults (all true except marketing on SMS/push)
  const defaultPrefs: Record<string, boolean> = {};
  categories.forEach((cat) => {
    channels.forEach((ch) => {
      const key = `${cat.id}:${ch.id}`;
      defaultPrefs[key] =
        cat.id === 'marketing' && (ch.id === 'sms' || ch.id === 'push') ? false : true;
    });
  });

  if (initialPreferences) {
    initialPreferences.forEach((p) => {
      defaultPrefs[`${p.category}:${p.channel}`] = p.isEnabled;
    });
  }

  const [preferences, setPreferences] = useState<Record<string, boolean>>(defaultPrefs);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const togglePreference = (category: string, channel: string) => {
    const key = `${category}:${channel}`;
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: UserNotificationPreference[] = Object.entries(preferences).map(
        ([key, isEnabled]) => {
          const [category, channel] = key.split(':') as [
            UserNotificationPreference['category'],
            UserNotificationPreference['channel'],
          ];
          return { category, channel, isEnabled };
        },
      );

      if (onSavePreferences) {
        await onSavePreferences(payload);
      } else {
        await new Promise((res) => setTimeout(res, 500));
      }
      setSaveSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {n.preferencesTitle}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{n.preferencesSubtitle}</p>
      </div>

      {/* Safety Notice & Delivery Failure Invariant Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-sm">
            High Reliability Standard: Delivery Failure Isolation
          </div>
          <div>
            Third-party SMS or email delivery outages never delay or corrupt your confirmed bookings
            or financial escrow payments. Outbox workers automatically retry with exponential
            backoff.
          </div>
        </div>
      </div>

      {/* Preferences Matrix Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Channels & Categories</span>
            {saveSuccess && (
              <Badge variant="success" className="flex items-center gap-1 font-normal text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {n.preferencesSaved}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle your notification delivery channels. Critical security & guardian safety alerts
            are always sent in-app.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 divide-y divide-border/40">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="md:max-w-xs">
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {cat.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>
              </div>

              {/* Channels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {channels.map((ch) => {
                  const isChecked = !!preferences[`${cat.id}:${ch.id}`];
                  return (
                    <label
                      key={ch.id}
                      onClick={() => togglePreference(cat.id, ch.id)}
                      className={`cursor-pointer border rounded-lg p-2.5 flex items-center gap-2 transition-all select-none ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                          : 'border-border bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {ch.icon}
                        <span className="truncate">{ch.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="border-t border-border/50 pt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>{n.guardianOversightNote}</span>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? dict.common.loading : dict.common.save}</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
