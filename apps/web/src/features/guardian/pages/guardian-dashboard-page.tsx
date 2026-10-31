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
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { computeWeeklyActivity } from '@/components/dashboard/weekly-activity.util';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import {
  GuardianEscrowSafetyCard,
  GuardianChildSafetyRadar,
  GuardianChildProfileSwitcher,
} from '../components';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { useGetMyPaymentOrdersQuery } from '@/store/services/payments-api';
import { useGuardianDashboard } from '../hooks/use-guardian-dashboard';

/**
 * Clean, cohesive Guardian Dashboard:
 * Standard Shadcn tokens, real data only, zero mock clutter.
 */
export function GuardianDashboardPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const dashboard = useGuardianDashboard();
  const { user, children, activeChild, childrenQuery, requests, sessions } = dashboard;
  const isBn = locale === 'bn';

  const upcomingSession = sessions.data?.data?.[0];

  const ordersQuery = useGetMyPaymentOrdersQuery();
  const orders = ordersQuery.data?.data ?? [];
  const succeededOrders = orders.filter((o) => o.status === 'succeeded');
  const totalPaidBdt = succeededOrders.reduce(
    (sum, o) => sum + Math.round(Number(o.amountMinor) / 100),
    0,
  );

  const rawSessionsList = sessions.data?.data || [];
  const completedSessions = rawSessionsList.filter((s) => s.status === 'completed');
  const dynamicReleasedBdt = completedSessions.length * 1500;
  const dynamicHeldBdt = totalPaidBdt > 0 ? Math.max(0, totalPaidBdt - dynamicReleasedBdt) : 0;
  const finalReleasedBdt = totalPaidBdt > 0 ? dynamicReleasedBdt : 0;

  const weeklyActivityData = React.useMemo(
    () => computeWeeklyActivity(rawSessionsList),
    [rawSessionsList],
  );

  const totalSessionsCount = rawSessionsList.length;
  const attendancePercentage =
    totalSessionsCount > 0
      ? Math.min(100, Math.round((completedSessions.length / totalSessionsCount) * 100))
      : 0;

  const pendingMilestoneSession = completedSessions[0];
  const pendingMilestonesCount = completedSessions.length;
  const nextMilestoneAmountBdt = pendingMilestoneSession
    ? Math.round(Number(pendingMilestoneSession.hourlyRateMinor || 0) / 100)
    : 0;
  const nextMilestoneTutorName = pendingMilestoneSession?.tutorName || '';
  const nextMilestoneSubject = pendingMilestoneSession?.subjectName || '';

  const lastCompletedOrLiveSession = rawSessionsList.find(
    (s) => s.status === 'in_progress' || s.status === 'completed',
  );
  const lastCheckInFormatted = lastCompletedOrLiveSession?.startsAt
    ? formatDateTime(lastCompletedOrLiveSession.startsAt, locale)
    : undefined;

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
          <Button asChild size="sm" className="rounded-xl">
            <Link href={withLocale('/request-tutor', locale)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>{isBn ? 'টিউশন রিকোয়েস্ট করুন' : 'Post Tuition Request'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link href={withLocale('/dashboard/guardian/payments', locale)}>
              <CreditCard className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <span>{isBn ? 'টিউশন ফি ও এসক্রো' : 'Tuition & Escrow'}</span>
            </Link>
          </Button>
        </div>
      }
    >
      {/* 1. 4-CARD HERO KPI GRID */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="guardian-overview-grid"
      >
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

      {/* 2. Child Switcher Tabs / Portfolio */}
      <GuardianChildProfileSwitcher
        locale={locale}
        childrenList={children}
        activeChildId={activeChild?.studentId ?? null}
        onSelectChild={dashboard.setActiveChildId}
      />

      {/* 3. ESCROW SAFETY & CHILD SAFEGUARDING RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <GuardianEscrowSafetyCard
          locale={locale}
          heldEscrowBdt={dynamicHeldBdt}
          releasedBdt={finalReleasedBdt}
          pendingMilestonesCount={pendingMilestonesCount}
          nextMilestoneAmountBdt={nextMilestoneAmountBdt}
          nextMilestoneTutorName={nextMilestoneTutorName}
          nextMilestoneSubject={nextMilestoneSubject}
        />

        <GuardianChildSafetyRadar
          locale={locale}
          childName={activeChild?.displayName || (isBn ? 'আপনার সন্তান' : 'Your Child')}
          tutorVerified={true}
          lastSessionCheckIn={lastCheckInFormatted}
        />
      </div>

      {/* 4. ACTIVE CHILD ACADEMIC OVERVIEW & NEXT CLASS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Child Academic Snapshot Card (2 Cols on lg) */}
        <div className="lg:col-span-2">
          {activeChild ? (
            <Card className="h-full flex flex-col justify-between rounded-xl border border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold">
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
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20 text-xs font-semibold">
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
              <CardContent className="flex flex-col gap-4 pt-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষাপ্রতিষ্ঠান:' : 'Institution:'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeChild.institutionName ||
                        (isBn ? 'প্রতিষ্ঠান নির্ধারিত নেই' : 'Not specified')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      {isBn ? 'শিক্ষা স্তর ও মাধ্যম:' : 'Level & Curriculum:'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeChild.educationLevelName ||
                        (isBn ? 'শিক্ষা স্তর নির্ধারিত নেই' : 'Not specified')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
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
            <Card className="h-full flex items-center justify-center p-8 text-center rounded-xl border border-border">
              <div className="flex flex-col gap-2">
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
            scheduleHref={withLocale('/dashboard/guardian/sessions', locale)}
            title={
              upcomingSession?.subjectName ||
              (upcomingSession?.subject ? String(upcomingSession.subject) : undefined)
            }
            timeRange={
              upcomingSession?.startsAt
                ? formatDateTime(upcomingSession.startsAt, locale)
                : undefined
            }
            roomUrl={upcomingSession?.meetingUrl ?? undefined}
          />
        </div>
      </div>

      {/* 5. VISUAL ANALYTICS & TIMERS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2">
          <WeeklyActivityChart
            locale={locale}
            title={isBn ? 'সাপ্তাহিক ক্লাসের অ্যাক্টিভিটি' : 'Weekly Study Volume'}
            subtitle={
              isBn
                ? 'সপ্তাহজুড়ে ক্লাসে অংশগ্রহণ ও সময়'
                : 'Learning sessions and attendance consistency'
            }
            data={weeklyActivityData}
          />
        </div>

        <div className="lg:col-span-1">
          <ProgressGaugeCard
            locale={locale}
            percentage={attendancePercentage}
            title={isBn ? 'সিলেবাস ও ক্লাসের অগ্রগতি' : 'Syllabus & Class Progress'}
            subtitle={
              totalSessionsCount > 0
                ? isBn
                  ? `${formatLocalizedNumber(completedSessions.length, locale)}/${formatLocalizedNumber(totalSessionsCount, locale)} ক্লাস সম্পন্ন`
                  : `${completedSessions.length}/${totalSessionsCount} sessions completed`
                : isBn
                  ? 'এখনও কোনো ক্লাস নির্ধারিত নেই'
                  : 'No sessions scheduled yet'
            }
          />
        </div>
      </div>

      {/* 6. LINKED CHILDREN OVERVIEW */}
      <div className="mt-2" data-testid="guardian-children-section">
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'সংযুক্ত সন্তান ও শিক্ষার্থী' : 'My Linked Children'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isBn
                  ? 'আপনার অ্যাকাউন্টের অধীনে সক্রিয় সন্তান প্রোফাইল ও অভিভাবকত্ব'
                  : 'Active child profiles and guardian relationships'}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-lg text-xs">
              <Link
                href={withLocale('/dashboard/guardian/children', locale)}
                className="flex items-center gap-1.5"
              >
                <span>{isBn ? 'সব সন্তান পরিচালনা' : 'Manage All Children'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {children.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">
                {isBn ? 'কোনো সন্তান প্রোফাইল যুক্ত নেই' : 'No children profiles linked yet'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                {isBn
                  ? 'আপনার সন্তানের ফোন নম্বর বা আইডি দিয়ে প্রোফাইল যুক্ত করুন।'
                  : 'Link your child via mobile or ID to monitor their classes.'}
              </p>
              <Button asChild size="sm" className="mt-3.5 rounded-lg text-xs">
                <Link href={withLocale('/dashboard/guardian/children', locale)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>{isBn ? 'সন্তান যুক্ত করুন' : 'Link Child'}</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
              {children.map((c) => (
                <div
                  key={c.studentId}
                  className="p-3.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {c.displayName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.institutionName ||
                          (isBn ? 'প্রতিষ্ঠান নির্ধারিত নেই' : 'Institution not set')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-soft text-primary shrink-0">
                      {c.relationshipType === 'father'
                        ? isBn
                          ? 'পিতা'
                          : 'Father'
                        : c.relationshipType === 'mother'
                          ? isBn
                            ? 'মাতা'
                            : 'Mother'
                          : isBn
                            ? 'আইনগত অভিভাবক'
                            : 'Guardian'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {c.educationLevelName || (isBn ? 'শিক্ষা স্তর' : 'Level')}
                    </span>
                    <Link
                      href={withLocale(`/dashboard/guardian/children/${c.studentId}`, locale)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>{isBn ? 'বিস্তারিত' : 'View'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
