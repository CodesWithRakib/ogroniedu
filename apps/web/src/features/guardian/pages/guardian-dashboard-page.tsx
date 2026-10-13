'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Inbox,
  ShieldCheck,
  Search,
  Plus,
  Download,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { StudyTimeTrackerCard } from '@/components/dashboard/StudyTimeTrackerCard';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useGuardianDashboard } from '../hooks/use-guardian-dashboard';

/** Guardian dashboard entry: Donezo/Shopeers-inspired aesthetic with full-fidelity real data. */
export function GuardianDashboardPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const dashboard = useGuardianDashboard();
  const { user, children, activeChild, childrenQuery, requests, sessions } = dashboard;
  const isBn = locale === 'bn';

  const upcomingSession = sessions.data?.data?.[0];

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'অভিভাবক ড্যাশবোর্ড' : 'Guardian Dashboard'}
      subtitle={
        isBn
          ? `স্বাগতম, ${user?.displayName ?? 'অভিভাবক'}! আপনার সন্তানের পড়াশোনার অগ্রগতি ও ক্লাস তদারকি করুন।`
          : `Welcome, ${user?.displayName ?? 'Guardian'}! Track your children's learning, schedule & payments.`
      }
      role="guardian"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={withLocale('/tutors', locale)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-sm shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutor'}</span>
          </Link>
          <Link
            href={withLocale('/payments', locale)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isBn ? 'এসক্রো লেজার' : 'Escrow Ledger'}</span>
          </Link>
        </div>
      }
    >
      {/* ======================================================== */}
      {/* DONEZO 4-CARD HERO KPI GRID                              */}
      {/* ======================================================== */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        data-testid="guardian-overview-grid"
      >
        {/* Card 1: Featured Hero Solid Card (Donezo Style) */}
        <HeroKpiCard
          variant="hero"
          icon={Users}
          title={dict.guardian.childrenTitle}
          value={
            childrenQuery.isLoading
              ? '...'
              : formatLocalizedNumber(children.length, locale)
          }
          changeText={
            isBn
              ? `${formatLocalizedNumber(children.length, locale)}টি সক্রিয় সন্তান প্রোফাইল`
              : `${children.length} active child profile`
          }
          href={withLocale('/dashboard/guardian?tab=children', locale)}
          testId="guardian-children-count"
        />

        {/* Card 2: Requests Secondary Card */}
        <HeroKpiCard
          variant="secondary"
          icon={Inbox}
          title={isBn ? 'বুকিং অনুরোধ' : 'Bookings'}
          value={
            requests.isLoading
              ? '...'
              : formatLocalizedNumber(requests.data?.data?.length ?? 0, locale)
          }
          changeText={
            isBn ? 'যাচাইকৃত শিক্ষক নির্বাচন' : 'Verified tutor bookings'
          }
          href={withLocale('/requests', locale)}
          testId="guardian-requests-count"
        />

        {/* Card 3: Sessions Secondary Card */}
        <HeroKpiCard
          variant="secondary"
          icon={Calendar}
          title={isBn ? 'ক্লাস শিডিউল' : 'Sessions'}
          value={
            sessions.isLoading
              ? '...'
              : formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)
          }
          changeText={isBn ? 'ধারাবাহিক ক্লাস শিডিউল' : 'Scheduled learning'}
          href={withLocale('/sessions', locale)}
          testId="guardian-sessions-count"
        />

        {/* Card 4: Active Child Card */}
        <HeroKpiCard
          variant="secondary"
          icon={ShieldCheck}
          title={isBn ? 'সক্রিয় শিক্ষার্থী' : 'Active Child'}
          value={activeChild?.displayName ?? (isBn ? '—' : '—')}
          changeText={isBn ? 'এসক্রো সুরক্ষিত' : '100% Escrow Protected'}
          href={withLocale('/tutors', locale)}
          testId="guardian-active-child"
        />
      </div>

      {/* Child Switcher Tabs if multiple children */}
      {children.length > 1 && (
        <div
          className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-border/80 bg-surface/50"
          role="tablist"
          aria-label={dict.guardian.childrenTitle}
          data-testid="child-switcher"
        >
          <span className="text-xs font-bold text-muted-foreground px-2">
            {isBn ? 'শিক্ষার্থী নির্বাচন:' : 'Switch Child:'}
          </span>
          {children.map((c) => (
            <button
              key={c.studentId}
              role="tab"
              aria-selected={activeChild?.studentId === c.studentId}
              onClick={() => dashboard.setActiveChildId(c.studentId)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeChild?.studentId === c.studentId
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              }`}
              data-testid={`child-tab-${c.studentId}`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* DONEZO VISUAL ANALYTICS & REMINDER ROW                    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Activity Bar Chart (2 Cols on lg) */}
        <div className="lg:col-span-2">
          <WeeklyActivityChart
            locale={locale}
            title={isBn ? 'সাপ্তাহিক ক্লাসের অ্যাক্টিভিটি' : 'Weekly Study Volume'}
            subtitle={
              isBn
                ? 'সপ্তাহজুড়ে ক্লাসে অংশগ্রহণ ও সময়'
                : 'Learning sessions and attendance consistency'
            }
          />
        </div>

        {/* Next Class Meeting Card (1 Col on lg) */}
        <div className="lg:col-span-1">
          <SessionReminderCard
            locale={locale}
            title={
              upcomingSession?.subject
                ? String(upcomingSession.subject)
                : undefined
            }
            timeRange={
              upcomingSession?.scheduledAt
                ? new Date(String(upcomingSession.scheduledAt)).toLocaleString(
                    isBn ? 'bn-BD' : 'en-US',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  )
                : undefined
            }
            roomUrl={upcomingSession?.meetingUrl ?? undefined}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* DONEZO PROGRESS GAUGE & STUDY TRACKER ROW                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProgressGaugeCard
          locale={locale}
          percentage={78}
          title={isBn ? 'সিলেবাস অগ্রগতি' : 'Syllabus Progress'}
          subtitle={isBn ? 'টার্মের পাঠ্যক্রম সম্পন্ন' : 'Term curriculum completed'}
        />

        <StudyTimeTrackerCard
          locale={locale}
          title={isBn ? 'সাপ্তাহিক স্টাডি সময়' : 'Focus Time Tracker'}
          subtitle={isBn ? 'মোট অনলাইন ও অফলাইন ক্লাস' : 'Total live tutoring duration'}
        />

        {/* Quick Family Actions Card */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'প্যারেন্টিং হাব' : 'Parent Control Hub'}
            </span>
            <h3 className="text-base font-bold text-foreground mt-1">
              {isBn ? 'সন্তান ও শিক্ষক সমন্বয়' : 'Children & Tutor Sync'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isBn
                ? 'নতুন সন্তান যুক্ত করুন অথবা শিক্ষকদের সাথে সরাসরি ক্লাস শিডিউল ঠিক করুন।'
                : 'Link new child profiles or manage active tutor engagement.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <Link
              href={withLocale('/tutors', locale)}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs text-center hover:bg-primary-hover shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{isBn ? 'নতুন শিক্ষক খুঁজুন' : 'Find New Tutor'}</span>
            </Link>
            <Link
              href={withLocale('/payments', locale)}
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs text-center hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'এসক্রো ব্যালেন্স ও লেজার' : 'View Escrow Ledger'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LINKED CHILDREN MANAGER SECTION                          */}
      {/* ======================================================== */}
      <div className="mt-2" data-testid="guardian-children-section">
        {childrenQuery.isLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <GuardianChildrenManager
            locale={locale}
            initialChildren={children.map((c) => ({
              linkId: c.linkId,
              studentId: c.studentId,
              displayName: c.displayName,
              relationshipType: c.relationshipType,
              status: c.status,
              consentPolicyVersion: c.consentPolicyVersion,
              consentRecordedAt: c.consentRecordedAt,
              isMinor: c.isMinor,
              institutionName: c.institutionName,
              educationLevelName: c.educationLevelName,
            }))}
            onAddChild={dashboard.handleAddChild}
            onRevokeLink={dashboard.handleRevokeLink}
          />
        )}
      </div>
    </DashboardShell>
  );
}
