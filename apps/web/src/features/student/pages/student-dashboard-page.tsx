'use client';

import React from 'react';
import Link from 'next/link';
import { Inbox, Calendar, Bell, BookOpen, Search, Sparkles, ArrowRight } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { StudyTimeTrackerCard } from '@/components/dashboard/StudyTimeTrackerCard';
import { EmptyState, LoadingSpinner } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { useStudentDashboard } from '../hooks/use-student-dashboard';

/** Student dashboard entry: Donezo/Shopeers-inspired aesthetic with real student API data. */
export function StudentDashboardPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { user, requests, sessions, unread, myRequests } = useStudentDashboard();
  const isBn = locale === 'bn';

  const upcomingSession = sessions.data?.data?.[0];

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
          <Link
            href={withLocale('/learning', locale)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-sm shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{isBn ? 'স্টাডি রুম' : 'Study Room'}</span>
          </Link>
          <Link
            href={withLocale('/tutors', locale)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
          </Link>
        </div>
      }
    >
      {/* ======================================================== */}
      {/* DONEZO 4-CARD HERO KPI GRID                              */}
      {/* ======================================================== */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        data-testid="student-overview-grid"
      >
        {/* Card 1: Featured Hero Solid Card (Donezo Style) */}
        <HeroKpiCard
          variant="hero"
          icon={Calendar}
          title={isBn ? 'আসন্ন ক্লাস' : 'Sessions'}
          value={
            sessions.isLoading
              ? '...'
              : formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)
          }
          changeText={isBn ? 'সক্রিয় লার্নিং শিডিউল' : 'Active learning schedule'}
          href={withLocale('/sessions', locale)}
          testId="student-sessions-count"
        />

        {/* Card 2: Requests Secondary Card */}
        <HeroKpiCard
          variant="secondary"
          icon={Inbox}
          title={isBn ? 'বুকিং অনুরোধ' : 'Requests'}
          value={
            requests.isLoading
              ? '...'
              : formatLocalizedNumber(requests.data?.data?.length ?? 0, locale)
          }
          changeText={isBn ? 'টিউটরিং অনুরোধ তালিকা' : 'Tutoring requests sent'}
          href={withLocale('/requests', locale)}
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

        {/* Card 4: Study Pass / Focus Status */}
        <HeroKpiCard
          variant="secondary"
          icon={Sparkles}
          title={isBn ? 'স্টাডি স্ট্রিক' : 'Study Streak'}
          value={isBn ? '৫ দিন 🔥' : '5 Days 🔥'}
          changeText={isBn ? 'ধারাবাহিক লার্নিং সক্রিয়' : 'Consistent learning tracker'}
          href={withLocale('/learning', locale)}
        />
      </div>

      {/* ======================================================== */}
      {/* DONEZO VISUAL ANALYTICS & REMINDER ROW                    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Activity Bar Chart (2 Cols on lg) */}
        <div className="lg:col-span-2">
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

        {/* Live Meeting Reminder Card (1 Col on lg) */}
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
      {/* DONEZO PROGRESS GAUGE & STUDY TRACKER ROW                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProgressGaugeCard
          locale={locale}
          percentage={82}
          title={isBn ? 'পাঠ্যক্রম কভারেজ' : 'Syllabus Progress'}
          subtitle={isBn ? 'অধ্যায় ও অ্যাসাইনমেন্ট সম্পন্ন' : 'Chapters & assignments finished'}
        />

        <StudyTimeTrackerCard
          locale={locale}
          title={isBn ? 'ফোকাস সেশন টাইমার' : 'Study Time Tracker'}
          subtitle={isBn ? 'ধারাবাহিক মনোযোগ ও রিভিশন' : 'Continuous focus timer'}
        />

        {/* Next Steps Card */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'পরবর্তী পদক্ষেপ' : 'Next Steps'}
            </span>
            <h3 className="text-base font-bold text-foreground mt-1">
              {isBn ? 'দ্রুত নেভিগেশন' : 'Quick Actions'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isBn
                ? 'প্রিয় শিক্ষক খুঁজুন অথবা ক্লাসের স্টাডি রুমে নোট রিভিশন করুন।'
                : 'Find trusted tutors or review class notes in your study room.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2 text-sm">
            <Link
              href={withLocale('/tutors', locale)}
              data-testid="student-find-tutors-link"
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs text-center hover:bg-primary-hover shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{dict.nav.findTutors}</span>
            </Link>
            <Link
              href={withLocale('/requests', locale)}
              data-testid="student-requests-link"
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs text-center hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
            >
              <Inbox className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'আমার অনুরোধ দেখুন' : 'View My Requests'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RECENT REQUESTS SECTION (Donezo Team/Project List Style) */}
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
          <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
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
                href={withLocale('/requests', locale)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>{isBn ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border/50" data-testid="student-recent-requests">
              {myRequests.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-surface/50 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                      #{r.id.slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {r.id.slice(0, 12)}…
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.createdAt ? formatDate(r.createdAt, locale) : '—'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                      r.status === 'accepted'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                        : r.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {String(r.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
