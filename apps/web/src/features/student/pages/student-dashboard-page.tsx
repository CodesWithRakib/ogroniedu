'use client';

import React from 'react';
import Link from 'next/link';
import {
  Inbox,
  Calendar,
  Bell,
  BookOpen,
  Search,
  Sparkles,
  ArrowRight,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { computeWeeklyActivity } from '@/components/dashboard/weekly-activity.util';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { EmptyState, LoadingSpinner } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { useStudentDashboard } from '../hooks/use-student-dashboard';
import {
  StudentAcademicProfileCard,
  StudentUpcomingClassesCard,
  StudentMyTutorsCard,
  StudentPendingAssignmentsCard,
  StudentNextClassHero,
  StudentSubjectMasteryCard,
  type SubjectMasteryItem,
} from '../components';

/** Clean, cohesive Student dashboard: pure Shadcn tokens, real data only, zero mock clutter. */
export function StudentDashboardPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const {
    user,
    studentProfile,
    isMinor,
    myGuardians,
    requests,
    sessions,
    unread,
    myRequests,
    upcomingSessions,
    nextSession,
    activeTutors,
    metrics,
    assignments,
    isLoading,
  } = useStudentDashboard(locale);
  const isBn = locale === 'bn';

  const isChild = isMinor || myGuardians.length > 0 || user?.hasGuardian === true || user?.isMinor === true;
  const isStandalone = !isChild;

  const dynamicSubjects = React.useMemo<SubjectMasteryItem[]>(() => {
    if (activeTutors.length === 0) return [];

    return activeTutors.map((t, idx) => ({
      id: t.bookingId || `booked-${idx}`,
      nameBn: t.subjectName,
      nameEn: t.subjectName,
      progressPercent: metrics?.totalSessionsRecorded
        ? Math.min(
            100,
            Math.round(
              ((metrics.sessionsAttended ?? 0) / Math.max(1, metrics.totalSessionsRecorded)) * 100,
            ),
          )
        : 0,
      completedChapters: metrics?.assignmentsCompleted ?? 0,
      totalChapters: Math.max(metrics?.assignmentsAssigned ?? 1, 1),
    }));
  }, [activeTutors, metrics]);

  const rawSessionsList = sessions.data?.data || [];
  const weeklyActivityData = React.useMemo(
    () => computeWeeklyActivity(rawSessionsList),
    [rawSessionsList],
  );

  const attendancePercentage = metrics?.attendanceRate ?? 100;
  const dueBookings = React.useMemo(() => {
    return myRequests.filter((r) => r.status === 'accepted' || r.status === 'awaiting_payment');
  }, [myRequests]);

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'শিক্ষার্থী ড্যাশবোর্ড' : 'Student Dashboard'}
      subtitle={
        isBn
          ? `স্বাগতম, ${user?.displayName ?? 'শিক্ষার্থী'}! আজকের শিডিউল, স্টাডি রুম এবং পাঠ্যক্রমের অগ্রগতি দেখুন।`
          : `Welcome, ${user?.displayName ?? 'Student'}! Plan, prioritize, and accomplish your studies with ease.`
      }
      role="student"
      actions={
        <div className="flex items-center gap-2">
          {isStandalone && (
            <Button asChild size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
              <Link
                href={withLocale('/request-tutor', locale)}
                className="flex items-center gap-1.5"
                data-testid="student-btn-new-request"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{isBn ? 'নতুন টিউশন রিকোয়েস্ট' : 'New Request'}</span>
              </Link>
            </Button>
          )}
          {isStandalone && (
            <Button asChild variant="outline" size="sm" className="rounded-xl border-border hover:bg-surface-hover">
              <Link
                href={withLocale('/dashboard/student/payments', locale)}
                className="flex items-center gap-1.5"
                data-testid="student-btn-payments"
              >
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>{isBn ? 'পেমেন্ট ও এসক্রো' : 'Payments'}</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border hover:bg-surface-hover">
            <Link href={withLocale('/dashboard/student/sessions', locale)} className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isBn ? 'ক্লাস শিডিউল' : 'Schedule'}</span>
            </Link>
          </Button>
        </div>
      }
    >
      {/* PENDING ESCROW PAYMENT ALERT BANNER (ONLY FOR STANDALONE INDEPENDENT LEARNERS) */}
      {isStandalone && dueBookings.length > 0 && (
        <div
          className="p-4 sm:p-5 rounded-2xl border border-warning/30 bg-warning/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in"
          data-testid="student-due-payment-banner"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {isBn ? 'টিউটরিং ফি পেমেন্ট বাকি রয়েছে' : 'Tuition Payment Pending'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isBn
                  ? `আপনার ${formatLocalizedNumber(dueBookings.length, locale)}টি গৃহশিক্ষক বুকিং চূড়ান্ত করতে অগ্রণী এডু এসক্রো পেমেন্ট সম্পন্ন করুন।`
                  : `Complete escrow payment for your ${dueBookings.length} booking(s) to activate your classes.`}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0">
            <Link
              href={
                dueBookings[0]?.id
                  ? withLocale(`/dashboard/bookings/${dueBookings[0].id}/pay`, locale)
                  : withLocale('/dashboard/student/payments', locale)
              }
            >
              <CreditCard className="w-4 h-4" />
              <span>{isBn ? 'এখনই পেমেন্ট করুন' : 'Pay Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* CHILD LEARNER REASSURANCE BANNER (FOR GUIDED MINORS WITH GUARDIAN) */}
      {isChild && (
        <div
          className="p-4 rounded-2xl border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          data-testid="child-guardian-protection-card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {isBn ? 'অভিভাবক কর্তৃক পরিচালিত লার্নিং প্রোফাইল' : 'Guardian Managed Academic Profile'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isBn
                  ? 'আপনার সকল টিউশন বুকিং ও ফি আপনার অভিভাবক দ্বারা পরিচালিত হয়। আপনি নিশ্চিন্তে ক্লাসে মনোযোগ দিন।'
                  : 'All your tuition bookings and payments are secured & managed by your legal guardian.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-xs text-primary font-semibold hover:bg-primary/10 shrink-0">
            <Link href={withLocale('/dashboard/student/learning', locale)} className="flex items-center gap-1">
              <span>{isBn ? 'স্টাডি রুমে যান' : 'Go to Study Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 0. STUDENT NEXT CLASS HERO ACTION COUNTDOWN */}
      <StudentNextClassHero
        locale={locale}
        nextSession={nextSession}
        isLoading={sessions.isLoading}
      />

      {/* 1. 4-CARD HERO KPI GRID */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="student-overview-grid"
      >
        <HeroKpiCard
          variant="hero"
          icon={Calendar}
          title={isBn ? 'আসন্ন ক্লাস' : 'Upcoming Classes'}
          value={
            sessions.isLoading ? '...' : formatLocalizedNumber(upcomingSessions.length, locale)
          }
          changeText={
            upcomingSessions.length > 0
              ? isBn
                ? 'সক্রিয় লার্নিং শিডিউল চালু'
                : 'Active scheduled sessions'
              : isBn
                ? 'কোনো আসন্ন ক্লাস নেই'
                : 'No upcoming sessions'
          }
          href={withLocale('/dashboard/student/sessions', locale)}
          testId="student-sessions-count"
        />

        <HeroKpiCard
          variant="secondary"
          icon={Inbox}
          title={isBn ? 'বুকিং অনুরোধ' : 'Tutoring Requests'}
          value={requests.isLoading ? '...' : formatLocalizedNumber(myRequests.length, locale)}
          changeText={
            isBn
              ? `${formatLocalizedNumber(activeTutors.length, locale)} জন গৃহীত শিক্ষক`
              : `${activeTutors.length} Active tutor(s)`
          }
          href={withLocale('/dashboard/student/requests', locale)}
          testId="student-requests-count"
        />

        <HeroKpiCard
          variant="secondary"
          icon={Bell}
          title={dict.notifications.title}
          value={formatLocalizedNumber(unread.data?.unreadCount ?? 0, locale)}
          changeText={isBn ? 'নতুন নোটিফিকেশন ও বার্তা' : 'New notifications & alerts'}
          href={withLocale('/notifications', locale)}
          testId="student-unread-count"
        />

        <HeroKpiCard
          variant="secondary"
          icon={Sparkles}
          title={isBn ? 'ক্লাস উপস্থিতি' : 'Attendance Rate'}
          value={`${formatLocalizedNumber(Math.round(attendancePercentage), locale)}%`}
          changeText={
            metrics?.averageScore !== null && metrics?.averageScore !== undefined
              ? isBn
                ? `গড় নম্বর: ${formatLocalizedNumber(metrics.averageScore, locale)}%`
                : `Avg Score: ${metrics.averageScore}%`
              : isBn
                ? 'ধারাবাহিক লার্নিং ট্র্যাক সক্রিয়'
                : 'Active study track'
          }
          href={withLocale('/dashboard/student/learning', locale)}
        />
      </div>

      {/* 2. ACADEMIC PROFILE & UPCOMING CLASSES ROW (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <StudentAcademicProfileCard
          locale={locale}
          studentProfile={studentProfile}
          isMinor={isMinor}
          guardians={myGuardians}
          studentName={user?.displayName}
        />

        <StudentUpcomingClassesCard
          locale={locale}
          sessions={upcomingSessions}
          isLoading={sessions.isLoading}
        />
      </div>

      {/* 3. MY TUTORS & PENDING HOMEWORK ROW (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <StudentMyTutorsCard locale={locale} tutors={activeTutors} isLoading={requests.isLoading} />

        <StudentPendingAssignmentsCard
          locale={locale}
          assignments={assignments}
          isLoading={isLoading}
        />
      </div>

      {/* 4. VISUAL ANALYTICS & SUBJECT MASTERY (3 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-1">
          <StudentSubjectMasteryCard
            locale={locale}
            subjects={dynamicSubjects}
            averageScore={metrics?.averageScore}
          />
        </div>

        <div className="lg:col-span-1">
          <WeeklyActivityChart
            locale={locale}
            title={isBn ? 'সাপ্তাহিক পড়াশোনার সময়' : 'Weekly Study Analytics'}
            subtitle={
              isBn
                ? 'সপ্তাহের বিভিন্ন দিনে সম্পন্ন করা ক্লাস ও টাস্ক'
                : 'Study and session volume across the week'
            }
            data={weeklyActivityData}
          />
        </div>

        <div className="lg:col-span-1">
          <ProgressGaugeCard
            locale={locale}
            percentage={Math.round(attendancePercentage)}
            title={isBn ? 'উপস্থিতি ও সিলেবাস অগ্রগতি' : 'Attendance & Progress'}
            subtitle={
              metrics
                ? isBn
                  ? `${formatLocalizedNumber(metrics.assignmentsCompleted, locale)}/${formatLocalizedNumber(metrics.assignmentsAssigned, locale)} অ্যাসাইনমেন্ট সম্পন্ন`
                  : `${metrics.assignmentsCompleted}/${metrics.assignmentsAssigned} assignments done`
                : isBn
                  ? 'অধ্যায় ও অ্যাসাইনমেন্ট সম্পন্ন'
                  : 'Chapters & assignments finished'
            }
          />
        </div>
      </div>

      {/* 5. RECENT REQUESTS SECTION */}
      <div>
        {requests.isLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : myRequests.length === 0 ? (
          <EmptyState
            title={dict.feedback.emptyStateTitle}
            description={
              isBn
                ? 'এখনও কোনো টিউটরিং অনুরোধ নেই। যাচাইকৃত শিক্ষক খুঁজে প্রথম অনুরোধ পাঠান।'
                : 'No tutoring requests yet. Find a verified tutor to send your first request.'
            }
            actionLabel={isBn ? 'স্টাডি রুমে যান' : 'Go to Study Room'}
            actionHref={withLocale('/dashboard/student/learning', locale)}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'সাম্প্রতিক টিউটরিং অনুরোধ' : 'Recent Tutoring Requests'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBn
                    ? 'শিক্ষকদের কাছে পাঠানো আপনার বুকিংয়ের বর্তমান অবস্থা'
                    : 'Current status of your booking requests'}
                </p>
              </div>
              <Link
                href={withLocale('/dashboard/student/requests', locale)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>{isBn ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border/40" data-testid="student-recent-requests">
              {myRequests.slice(0, 5).map((r) => {
                const tp =
                  r.tutorProfile && typeof r.tutorProfile === 'object' ? r.tutorProfile : null;
                const tu =
                  tp && 'user' in tp && typeof tp.user === 'object' && tp.user !== null
                    ? (tp.user as { displayName?: string })
                    : null;
                const tutorName: string =
                  tu?.displayName ??
                  (typeof r.tutorName === 'string' ? r.tutorName : null) ??
                  (isBn ? 'শিক্ষক' : 'Tutor');

                const subj =
                  r.subject && typeof r.subject === 'object'
                    ? (r.subject as { nameBn?: string; nameEn?: string })
                    : null;
                const subjectName: string =
                  (isBn ? subj?.nameBn : subj?.nameEn) ??
                  subj?.nameBn ??
                  subj?.nameEn ??
                  (typeof r.subjectName === 'string' ? r.subjectName : null) ??
                  (isBn ? 'সাধারণ পাঠ্যক্রম' : 'General Tutoring');

                return (
                  <div
                    key={r.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                        #{r.id.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {tutorName} •{' '}
                          <span className="font-normal text-muted-foreground">{subjectName}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.createdAt ? formatDate(r.createdAt, locale) : '—'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                        r.status === 'accepted'
                          ? 'bg-success-soft text-success-soft-foreground'
                          : r.status === 'rejected'
                            ? 'bg-destructive-soft text-destructive-soft-foreground'
                            : 'bg-warning-soft text-warning-soft-foreground'
                      }`}
                    >
                      {String(r.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
