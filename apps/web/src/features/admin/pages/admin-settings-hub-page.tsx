'use client';

import React from 'react';
import Link from 'next/link';
import {
  ToggleLeft,
  Sliders,
  CreditCard,
  ShieldCheck,
  Bell,
  GraduationCap,
  ChevronRight,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';

interface SettingHubCard {
  id: string;
  href: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  badgeBn: string;
  badgeEn: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  actionBn: string;
  actionEn: string;
}

const SETTINGS_CARDS: SettingHubCard[] = [
  {
    id: 'flags',
    href: '/dashboard/admin/settings/flags',
    titleBn: 'ক্যানারি ফিচার ফ্ল্যাগ',
    titleEn: 'Canary Feature Flags',
    descBn:
      'রিয়েলটাইম বেটা ফিচার, সিস্টেম-ওয়াইড ক্যানারি ফ্ল্যাগ এবং এক্সপেরিমেন্টাল অপশন পরিচালনা করুন।',
    descEn:
      'Safely toggle runtime beta features, system-wide canary releases, and experimental capabilities without redeployment.',
    badgeBn: 'সুপার অ্যাডমিন',
    badgeEn: 'Super Admin',
    badgeClass: 'bg-primary-soft text-primary-soft-foreground',
    icon: ToggleLeft,
    iconBg: 'bg-primary-soft/70',
    iconColor: 'text-primary',
    actionBn: 'ফ্ল্যাগ পরিচালনা করুন',
    actionEn: 'Manage & View',
  },
  {
    id: 'general',
    href: '/dashboard/admin/settings/general',
    titleBn: 'সিস্টেম রেফারেন্স কনফিগারেশন',
    titleEn: 'System Reference Settings',
    descBn:
      'সার্বিক প্ল্যাটফর্মের মৌলিক সেটিংস, ক্যাশিং টাইমআউট, ডিফল্ট লিমিট ও কনফিগারেশন ভ্যারিয়েবল।',
    descEn:
      'Configure global platform parameters, maintenance mode, timeouts, cache policies, and default operational limits.',
    badgeBn: 'কোর কনফিগ',
    badgeEn: 'Core Config',
    badgeClass: 'bg-surface text-muted-foreground',
    icon: Sliders,
    iconBg: 'bg-surface',
    iconColor: 'text-foreground',
    actionBn: 'সিস্টেম কনফিগার করুন',
    actionEn: 'Manage & View',
  },
  {
    id: 'finance',
    href: '/dashboard/admin/settings/finance',
    titleBn: 'আর্থিক ও কমিশন পলিসি',
    titleEn: 'Financial & Commission Policy',
    descBn: 'প্ল্যাটফর্ম কমিশন শতাংশ, এসক্রো হোল্ড সময়সীমা, ন্যূনতম উত্তোলন এবং রিফান্ড মার্জিন।',
    descEn:
      'Manage platform fee percentages, escrow hold durations, payout minimums, and dispute refund margins.',
    badgeBn: 'আর্থিক পলিসি',
    badgeEn: 'Finance & Escrow',
    badgeClass: 'bg-surface text-muted-foreground',
    icon: CreditCard,
    iconBg: 'bg-surface',
    iconColor: 'text-foreground',
    actionBn: 'পলিসি পরিচালনা করুন',
    actionEn: 'Manage & View',
  },
  {
    id: 'security',
    href: '/dashboard/admin/settings/security',
    titleBn: 'নিরাপত্তা ও অ্যাক্সেস পলিসি',
    titleEn: 'Security & Access Control',
    descBn: 'রেট লিমিটেশন, সেশন টাইমআউট সীমা, ২-স্টেপ ভেরিফিকেশন ও আইপি অ্যাক্সেস নিয়ন্ত্রণ।',
    descEn:
      'Set rate limits, session expiry thresholds, multi-factor authentication policies, and IP whitelist rules.',
    badgeBn: 'নিরাপত্তা',
    badgeEn: 'Security & Access',
    badgeClass: 'bg-surface text-muted-foreground',
    icon: ShieldCheck,
    iconBg: 'bg-surface',
    iconColor: 'text-foreground',
    actionBn: 'নিরাপত্তা দেখুন',
    actionEn: 'Manage & View',
  },
  {
    id: 'notifications',
    href: '/dashboard/admin/settings/notifications',
    titleBn: 'নোটিফিকেশন ও এসএমএস গেটওয়ে',
    titleEn: 'Notification & SMS Gateways',
    descBn: 'এসএমএস প্রোভাইডার (SSL Wireless, Twilio), ইমেইল SMTP এবং পুশ নোটিফিকেশন টেমপ্লেট।',
    descEn:
      'Setup SMS gateways (SSL Wireless, Twilio), email SMTP providers, and automated notification triggers.',
    badgeBn: 'মেসেজিং',
    badgeEn: 'Communication',
    badgeClass: 'bg-surface text-muted-foreground',
    icon: Bell,
    iconBg: 'bg-surface',
    iconColor: 'text-foreground',
    actionBn: 'গেটওয়ে সেটআপ',
    actionEn: 'Manage & View',
  },
  {
    id: 'taxonomy',
    href: '/dashboard/admin/taxonomy',
    titleBn: 'একাডেমিক ট্যাক্সোনমি ও পাঠ্যক্রম',
    titleEn: 'Academic Taxonomy Hub',
    descBn:
      'কারিকুলাম, এডুকেশন লেভেল, বোর্ড, ক্লাস, গ্রেড, বিষয় এবং প্রাতিষ্ঠানিক ক্যাটাগরি ব্যবস্থাপনা।',
    descEn:
      'Manage curriculum education levels, boards, classes, grades, subjects, and institutional categories.',
    badgeBn: 'পাঠ্যক্রম হাব',
    badgeEn: 'Education Hub',
    badgeClass: 'bg-surface text-muted-foreground',
    icon: GraduationCap,
    iconBg: 'bg-surface',
    iconColor: 'text-foreground',
    actionBn: 'ট্যাক্সোনমি পরিচালনা করুন',
    actionEn: 'Manage & View',
  },
];

export function AdminSettingsHubPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  return (
    <AdminLayout locale={locale}>
      <div className="space-y-6 py-6" data-testid="admin-settings-hub">
        {/* Eyebrow & Hero Header (Matching Reference Screenshot Image 1) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
              {isBn ? 'সিস্টেম কনফিগারেশন ও গভর্ন্যান্স' : 'SYSTEM CONFIGURATION & GOVERNANCE'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground">
              {isSuperAdmin ? 'Full Access Control' : 'Standard Administration'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'প্ল্যাটফর্ম সেটিংস হাব' : 'Platform Settings Hub'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {isBn
                  ? 'সিস্টেম পলিসি, ক্যানারি রিলিজ, আর্থিক পরামিতি, অ্যাকাডেমিক ট্যাক্সোনমি, সিকিউরিটি এবং নোটিফিকেশন গেটওয়ের সেন্ট্রাল ম্যানেজমেন্ট হাব।'
                  : 'The master control center for all platform settings: operational thresholds, canary feature toggles, commission policies, academic taxonomy, and notification gateways.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-soft text-primary-soft-foreground">
                <Settings className="w-3.5 h-3.5" />
                <span>6 {isBn ? 'টি মডিউল' : 'Active Modules'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Column Card Grid (Matching Reference Screenshot Image 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {SETTINGS_CARDS.map((card) => {
            const Icon = card.icon;
            const targetUrl = withLocale(card.href, locale);

            return (
              <Link
                key={card.id}
                href={targetUrl}
                data-testid={`settings-card-${card.id}`}
                className="group relative bg-card border border-border hover:border-input hover:shadow-xs transition-all duration-200 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Icon squircle + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${card.badgeClass}`}
                    >
                      <span>{isBn ? card.badgeBn : card.badgeEn}</span>
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-foreground mt-4 group-hover:text-primary transition-colors">
                    {isBn ? card.titleBn : card.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {isBn ? card.descBn : card.descEn}
                  </p>
                </div>

                {/* Footer Link: Action text + Arrow */}
                <div className="mt-5 pt-3 border-t border-border flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                  <span>{isBn ? card.actionBn : card.actionEn}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
