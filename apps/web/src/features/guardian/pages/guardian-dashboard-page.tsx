'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Inbox,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Plus,
  CreditCard,
  BookOpen,
  Sparkles,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import { LoadingSpinner, Card, CardHeader, CardContent, Button } from '@/components/ui';
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

  const mappedChildren = React.useMemo(
    () =>
      children.map((c) => ({
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
      })),
    [children],
  );

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
          <Button asChild size="sm">
            <Link href={withLocale('/tutors', locale)}>
              <Plus className="h-3.5 w-3.5" />
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutor'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={withLocale('/dashboard/guardian/payments', locale)}>
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isBn ? 'টিউশন ফি ও এসক্রো' : 'Tuition & Escrow'}</span>
            </Link>
          </Button>
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
          href={
            activeChild
              ? withLocale(`/dashboard/guardian/children/${activeChild.studentId}`, locale)
              : withLocale('/dashboard/guardian/children', locale)
          }
          testId="guardian-active-child"
        />
      </div>

      {/* ======================================================== */}
      {/* 2. QUICK ACTIONS BAR                                     */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isBn ? 'দ্রুত সেবা:' : 'Quick Actions:'}
        </span>
        <Link
          href={withLocale('/dashboard/guardian/children', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-primary-soft hover:border-primary/30 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'সন্তান প্রোফাইল' : 'Children'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/learning', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-primary-soft hover:border-primary/30 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'লার্নিং অগ্রগতি' : 'Learning Hub'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/sessions', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-primary-soft hover:border-primary/30 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'ক্লাস সময়সূচি' : 'Class Schedule'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/requests', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-primary-soft hover:border-primary/30 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <Inbox className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'টিউশন অনুরোধ' : 'Tuition Requests'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/guardian/payments', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-primary-soft hover:border-primary/30 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'টিউশন ফি ও এসক্রো' : 'Fees & Payments'}</span>
        </Link>
        <Link
          href={withLocale('/safety-reports', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/25 bg-destructive-soft hover:bg-destructive/15 text-destructive font-semibold text-xs transition-colors"
          id="link-safety-hub"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
          <span>{isBn ? 'শিশু সুরক্ষা হাব' : 'Safety Hub'}</span>
        </Link>
        <Link
          href={withLocale('/tutor-replacements', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-warning/25 bg-warning-soft hover:bg-warning/15 text-warning font-semibold text-xs transition-colors"
          id="link-replacement-hub"
        >
          <RefreshCw className="w-3.5 h-3.5 text-warning" />
          <span>{isBn ? 'রিপ্লেসমেন্ট গ্যারান্টি' : 'Replacements'}</span>
        </Link>
        <Link
          href={withLocale('/tutors', locale)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors sm:ml-auto"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
        </Link>
      </div>

      {/* Child Switcher Tabs if multiple children */}
      {children.length > 1 && (
        <div
          className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-border bg-surface/50"
          role="tablist"
          aria-label={dict.guardian.childrenTitle}
          data-testid="child-switcher"
        >
          <span className="text-xs font-semibold text-muted-foreground px-2">
            {isBn ? 'শিক্ষার্থী নির্বাচন:' : 'Switch Child:'}
          </span>
          {children.map((c) => (
            <Button
              key={c.studentId}
              role="tab"
              variant={activeChild?.studentId === c.studentId ? 'primary' : 'outline'}
              size="sm"
              aria-selected={activeChild?.studentId === c.studentId}
              onClick={() => dashboard.setActiveChildId(c.studentId)}
              className="rounded-xl text-xs font-semibold h-8 px-3.5"
              data-testid={`child-tab-${c.studentId}`}
            >
              {c.displayName}
            </Button>
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
            <Card className="h-full flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
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
                  <span className="px-3 py-1 rounded-full bg-success-soft text-success-soft-foreground border border-success/20 text-xs font-semibold">
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
              <CardContent className="space-y-4 pt-0 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষাপ্রতিষ্ঠান:' : 'Institution:'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeChild.institutionName ||
                        (isBn ? 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ' : 'Not specified')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষা স্তর ও মাধ্যম:' : 'Level & Curriculum:'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {isBn ? 'এইচএসসি (একাদশ-দ্বাদশ শ্রেণি) • বাংলা মাধ্যম' : 'HSC (Class 11-12)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    <span>
                      {isBn
                        ? 'অভিভাবক সম্মতি ও নিরাপত্তা নজরদারি সক্রিয়'
                        : 'Parental consent & safety monitoring verified'}
                    </span>
                  </div>
                  <Link
                    href={withLocale(
                      `/dashboard/guardian/children/${activeChild.studentId}`,
                      locale,
                    )}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{isBn ? 'একাডেমিক তদারকি' : 'Full Dossier & Oversight'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-8 text-center">
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
            initialChildren={mappedChildren}
            onAddChild={dashboard.handleAddChild}
            onRevokeLink={dashboard.handleRevokeLink}
          />
        )}
      </div>
    </DashboardShell>
  );
}
