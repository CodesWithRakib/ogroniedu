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
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { StudyTimeTrackerCard } from '@/components/dashboard/StudyTimeTrackerCard';
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
} from '../components';

/** Production-ready Student dashboard: Donezo/Shopeers-inspired aesthetic with full real student API data. */
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

  const attendancePercentage = metrics?.attendanceRate ?? 100;

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
          <Button asChild size="sm" className="rounded-full">
            <Link
              href={withLocale('/dashboard/student/learning', locale)}
              className="flex items-center gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{isBn ? 'স্টাডি রুম' : 'Study Room'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={withLocale('/tutors', locale)} className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
            </Link>
          </Button>
        </div>
      }
    >
      {/* ======================================================== */}
      {/* 0. STUDENT NEXT CLASS HERO ACTION COUNTDOWN              */}
      {/* ======================================================== */}
      <StudentNextClassHero
        locale={locale}
        nextSession={nextSession}
        isLoading={sessions.isLoading}
      />

      {/* ======================================================== */}
      {/* 1. DONEZO 4-CARD HERO KPI GRID                           */}
      {/* ======================================================== */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        data-testid="student-overview-grid"
      >
        {/* Card 1: Featured Hero Solid Card (Sessions) */}
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

        {/* Card 2: Requests Secondary Card */}
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

        {/* Card 3: Notifications Secondary Card */}
        <HeroKpiCard
          variant="secondary"
          icon={Bell}
          title={dict.notifications.title}
          value={formatLocalizedNumber(unread.data?.unreadCount ?? 0, locale)}
          changeText={isBn ? 'নতুন নোটিফিকেশন ও বার্তা' : 'New notifications & alerts'}
          href={withLocale('/notifications', locale)}
          testId="student-unread-count"
        />

        {/* Card 4: Study Streak & Attendance */}
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
                ? 'ধারাবাহিক লার্নিং সক্রিয় 🔥'
                : 'Active study track 🔥'
          }
          href={withLocale('/dashboard/student/learning', locale)}
        />
      </div>

      {/* ======================================================== */}
      {/* QUICK ACTIONS ROW                                        */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <span className="text-xs font-bold text-muted-foreground mr-1.5 flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isBn ? 'দ্রুত সেবা:' : 'Quick Actions:'}
        </span>
        <Link
          href={withLocale('/dashboard/student/learning', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-primary-soft hover:border-primary/30 border border-border/70 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'লার্নিং হাব' : 'Learning Hub'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/student/sessions', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-primary-soft hover:border-primary/30 border border-border/70 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'ক্লাস শিডিউল' : 'Class Schedule'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/student/requests', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-primary-soft hover:border-primary/30 border border-border/70 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <Inbox className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'টিউশন অনুরোধ' : 'Tuition Requests'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/student/payments', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-primary-soft hover:border-primary/30 border border-border/70 text-foreground text-xs font-semibold transition-all duration-150"
        >
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'টিউশন ফি ও পেমেন্ট' : 'Tuition Payments'}</span>
        </Link>
        <Link
          href={withLocale('/tutors', locale)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/25 transition-all sm:ml-auto"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
        </Link>
      </div>

      {/* ======================================================== */}
      {/* 2. ACADEMIC PROFILE & UPCOMING CLASSES ROW (2 COLS)      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

      {/* ======================================================== */}
      {/* 3. MY TUTORS & PENDING HOMEWORK ROW (2 COLS)             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StudentMyTutorsCard locale={locale} tutors={activeTutors} isLoading={requests.isLoading} />

        <StudentPendingAssignmentsCard
          locale={locale}
          assignments={assignments}
          isLoading={isLoading}
        />
      </div>

      {/* ======================================================== */}
      {/* 4. VISUAL ANALYTICS & SUBJECT MASTERY                    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <StudentSubjectMasteryCard
            locale={locale}
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
          />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
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

          <StudyTimeTrackerCard
            locale={locale}
            title={isBn ? 'ফোকাস সেশন টাইমার' : 'Study Time Tracker'}
            subtitle={isBn ? 'ধারাবাহিক মনোযোগ ও রিভিশন' : 'Continuous focus timer'}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. RECENT REQUESTS SECTION                               */}
      {/* ======================================================== */}
      <div className="mt-2">
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
            actionLabel={dict.nav.findTutors}
            actionHref={withLocale('/tutors', locale)}
          />
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
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

            <div className="divide-y divide-border/50" data-testid="student-recent-requests">
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
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                        #{r.id.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {tutorName} •{' '}
                          <span className="font-medium text-muted-foreground">{subjectName}</span>
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
