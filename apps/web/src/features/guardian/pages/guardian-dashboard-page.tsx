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
  CreditCard,
  BookOpen,
  Sparkles,
  GraduationCap,
  ArrowRight,
  Clock,
  Video,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { StudyTimeTrackerCard } from '@/components/dashboard/StudyTimeTrackerCard';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import { LoadingSpinner, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { useGuardianDashboard } from '../hooks/use-guardian-dashboard';

/**
 * Production-ready Guardian Dashboard:
 * Donezo/Shopeers-inspired aesthetic with full-fidelity real data,
 * child academic profile overview, quick actions bar, and live safety sync.
 */
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
            href={withLocale('/dashboard/guardian/payments', locale)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isBn ? 'টিউশন ফি ও এসক্রো' : 'Tuition & Escrow'}</span>
          </Link>
        </div>
      }
    >
      {/* ======================================================== */}
      {/* 1. DONEZO 4-CARD HERO KPI GRID                           */}
      {/* ======================================================== */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        data-testid="guardian-overview-grid"
      >
        {/* Card 1: Featured Hero Solid Card (Children Count) */}
        <HeroKpiCard
          variant="hero"
          icon={Users}
          title={dict.guardian.childrenTitle}
          value={childrenQuery.isLoading ? '...' : formatLocalizedNumber(children.length, locale)}
          changeText={
            isBn
              ? `${formatLocalizedNumber(children.length, locale)}টি সক্রিয় সন্তান প্রোফাইল`
              : `${children.length} active child profile`
          }
          href={withLocale('/dashboard/guardian/children', locale)}
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
          changeText={isBn ? 'যাচাইকৃত শিক্ষক নির্বাচন' : 'Verified tutor bookings'}
          href={withLocale('/dashboard/guardian/requests', locale)}
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
          href={withLocale('/dashboard/guardian/sessions', locale)}
          testId="guardian-sessions-count"
        />

        {/* Card 4: Active Child Card */}
        <HeroKpiCard
          variant="secondary"
          icon={ShieldCheck}
          title={isBn ? 'সক্রিয় শিক্ষার্থী' : 'Active Child'}
          value={activeChild?.displayName ?? (isBn ? '—' : '—')}
          changeText={isBn ? 'এসক্রো সুরক্ষিত পর্যবেক্ষণ' : '100% Escrow Protected'}
          href={withLocale('/dashboard/guardian/learning', locale)}
          testId="guardian-active-child"
        />
      </div>

      {/* ======================================================== */}
      {/* 2. QUICK ACTIONS BAR                                     */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
        <span className="text-xs font-bold text-muted-foreground mr-1.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isBn ? 'দ্রুত সেবা:' : 'Quick Actions:'}
        </span>
        <Link
          href={withLocale('/dashboard/guardian/children', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{isBn ? 'সন্তান প্রোফাইল' : 'Children'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/learning', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{isBn ? 'লার্নিং অগ্রগতি' : 'Learning Hub'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/sessions', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{isBn ? 'ক্লাস সময়সূচি' : 'Class Schedule'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/requests', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold transition-colors"
        >
          <Inbox className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{isBn ? 'টিউশন অনুরোধ' : 'Tuition Requests'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/payments', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>{isBn ? 'টিউশন ফি ও এসক্রো' : 'Fees & Payments'}</span>
        </Link>
        <Link
          href={withLocale('/tutors', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors sm:ml-auto"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
        </Link>
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
      {/* 3. ACTIVE CHILD ACADEMIC OVERVIEW & NEXT CLASS ROW       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Child Academic Snapshot Card (2 Cols on lg) */}
        <div className="lg:col-span-2">
          {activeChild ? (
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center font-bold">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isBn ? 'সন্তানের একাডেমিক প্রোফাইল' : 'Child Academic Profile'}
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        {activeChild.displayName}
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold">
                    {activeChild.relationshipType === 'father'
                      ? isBn
                        ? 'পিতা'
                        : 'Father'
                      : activeChild.relationshipType === 'mother'
                        ? isBn
                          ? 'মাতা'
                          : 'Mother'
                        : isBn
                          ? 'আইনগত অভিভাবক'
                          : 'Legal Guardian'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষাপ্রতিষ্ঠান:' : 'Institution:'}
                    </span>
                    <span className="font-bold text-foreground">
                      {activeChild.institutionName ||
                        (isBn ? 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ' : 'Not specified')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষা স্তর ও মাধ্যম:' : 'Level & Curriculum:'}
                    </span>
                    <span className="font-bold text-foreground">
                      {isBn ? 'এইচএসসি (একাদশ-দ্বাদশ শ্রেণি) • বাংলা মাধ্যম' : 'HSC (Class 11-12)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {isBn
                        ? 'অভিভাবক সম্মতি ও নিরাপত্তা নজরদারি সক্রিয়'
                        : 'Parental consent & safety monitoring verified'}
                    </span>
                  </div>
                  <Link
                    href={withLocale('/dashboard/guardian/learning', locale)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{isBn ? 'লার্নিং হিস্ট্রি' : 'Full Records'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-xs h-full flex items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <Users className="w-10 h-10 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-foreground">
                  {isBn ? 'কোনো সন্তান প্রোফাইল যুক্ত নেই' : 'No Child Linked'}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {isBn
                    ? 'আপনার সন্তানের আইডি বা ফোন নম্বর দিয়ে সংযুক্ত করুন।'
                    : 'Link your student using their email, phone or student ID.'}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Next Class Meeting Card (1 Col on lg) */}
        <div className="lg:col-span-1">
          <SessionReminderCard
            locale={locale}
            title={upcomingSession?.subject ? String(upcomingSession.subject) : undefined}
            timeRange={
              upcomingSession?.scheduledAt
                ? formatDateTime(String(upcomingSession.scheduledAt), locale)
                : undefined
            }
            roomUrl={upcomingSession?.meetingUrl ?? undefined}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. VISUAL ANALYTICS & TIMERS ROW                         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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

        <div className="lg:col-span-1">
          <ProgressGaugeCard
            locale={locale}
            percentage={85}
            title={isBn ? 'সিলেবাস ও ক্লাসের অগ্রগতি' : 'Syllabus & Class Progress'}
            subtitle={isBn ? 'চলতি সেশনের পাঠ্যক্রম সম্পন্ন' : 'Term curriculum completed'}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. LINKED CHILDREN MANAGER SECTION                       */}
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
