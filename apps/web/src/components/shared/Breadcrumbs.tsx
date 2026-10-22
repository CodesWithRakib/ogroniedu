'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export interface BreadcrumbsProps {
  locale: Locale;
  className?: string;
  customCrumbs?: Array<{ label: string; href?: string }>;
}

const SEGMENT_LABELS: Record<string, { bn: string; en: string }> = {
  dashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  student: { bn: 'শিক্ষার্থী', en: 'Student' },
  guardian: { bn: 'অভিভাবক', en: 'Guardian' },
  tutor: { bn: 'শিক্ষক', en: 'Tutor' },
  admin: { bn: 'অ্যাডমিন', en: 'Admin' },
  learning: { bn: 'স্টাডি রুম', en: 'Study Room' },
  sessions: { bn: 'সেশন শিডিউল', en: 'Sessions' },
  requests: { bn: 'বুকিং অনুরোধ', en: 'Requests' },
  payments: { bn: 'পেমেন্ট ও ফি', en: 'Payments' },
  children: { bn: 'সন্তান ও শিক্ষার্থী', en: 'Children' },
  verification: { bn: 'ভেরিফিকেশন', en: 'Verification' },
  taxonomy: { bn: 'ট্যাক্সোনমি', en: 'Taxonomy' },
  bookings: { bn: 'টিউশন বুকিংস', en: 'Bookings' },
  users: { bn: 'ইউজার ম্যানেজমেন্ট', en: 'Users' },
  organizations: { bn: 'অর্গানাইজেশন', en: 'Organizations' },
  finance: { bn: 'আর্থিক অপারেশন', en: 'Finance' },
  disputes: { bn: 'ডিসপিউট ও লেজার', en: 'Disputes' },
  replacements: { bn: 'রিপ্লেসমেন্ট ক্লেইম', en: 'Replacements' },
  'audit-logs': { bn: 'অডিট লগ', en: 'Audit Logs' },
  settings: { bn: 'সেটিংস', en: 'Settings' },
  analytics: { bn: 'অ্যানালিটিক্স', en: 'Analytics' },
  'lesson-plans': { bn: 'পাঠ পরিকল্পনা', en: 'Lesson Plans' },
  profile: { bn: 'প্রোফাইল', en: 'Profile' },
  tutors: { bn: 'শিক্ষক তালিকা', en: 'Find Tutors' },
  notifications: { bn: 'বিজ্ঞপ্তি', en: 'Alerts' },
  messages: { bn: 'মেসেজ', en: 'Messages' },
  classroom: { bn: 'লাইভ ক্লাসরুম', en: 'Live Classroom' },
  assignments: { bn: 'অ্যাসাইনমেন্ট', en: 'Assignments' },
  progress: { bn: 'অগ্রগতি', en: 'Progress' },
};

export function Breadcrumbs({ locale, className = '', customCrumbs }: BreadcrumbsProps) {
  const pathname = usePathname();
  const isBn = locale === 'bn';

  if (customCrumbs && customCrumbs.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-muted-foreground ${className}`}>
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li className="flex items-center">
            <Link
              href={withLocale('/dashboard', locale)}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          {customCrumbs.map((crumb, idx) => {
            const isLast = idx === customCrumbs.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                {crumb.href && !isLast ? (
                  <Link href={withLocale(crumb.href, locale)} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">{crumb.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  if (!pathname) return null;

  // Clean pathname: remove locale prefix
  const cleanPath = pathname.replace(new RegExp(`^/${locale}`), '');
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return null; // Top-level root or bare /dashboard needs no breadcrumbs
  }

  // Build crumbs array
  const crumbs: Array<{ label: string; href: string; isLast: boolean }> = [];
  let accumulatedHref = '';

  segments.forEach((segment, index) => {
    accumulatedHref += `/${segment}`;
    const isLast = index === segments.length - 1;
    const labelObj = SEGMENT_LABELS[segment];
    const label = labelObj ? (isBn ? labelObj.bn : labelObj.en) : segment.replace(/-/g, ' ');

    crumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href: accumulatedHref,
      isLast,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-muted-foreground ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li className="flex items-center">
          <Link
            href={withLocale('/dashboard', locale)}
            className="hover:text-foreground transition-colors flex items-center gap-1"
            title={isBn ? 'হোম ড্যাশবোর্ড' : 'Home Dashboard'}
          >
            <Home className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            {crumb.isLast ? (
              <span className="font-semibold text-foreground tracking-tight" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={withLocale(crumb.href, locale)}
                className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
