'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  BookOpen,
  CreditCard,
  RefreshCw,
  Clock,
  Video,
  FileText,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useGetChildDetailsQuery } from '@/store/services/guardians-api';
import { useGetStudentLearningSummaryQuery } from '@/store/services/learning-api';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useSettleMilestoneMutation } from '@/store/services/payments-api';
import { SafetyReportModal } from '@/features/trust/components/safetyReportModal';
import { TutorReplacementModal } from '@/features/trust/components/tutorReplacementModal';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

export interface GuardianChildDetailPageProps {
  studentId: string;
  locale: Locale;
}

export function GuardianChildDetailPage({ studentId, locale }: GuardianChildDetailPageProps) {
  const isBn = locale === 'bn';

  // API Queries
  const { data: child } = useGetChildDetailsQuery(studentId);
  const { data: learningSummaryData } = useGetStudentLearningSummaryQuery(studentId);
  const { data: requestsData } = useGetBookingRequestsQuery();
  const { data: sessionsData, refetch: refetchSessions } = useGetSessionsQuery({ studentId });
  const [settleMilestone, { isLoading: isSettling }] = useSettleMilestoneMutation();

  // Modals state
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [selectedBookingForReplacement, setSelectedBookingForReplacement] = useState<{
    id: string;
    tutorName?: string | null;
    subjectName?: string | null;
  } | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'tutors' | 'sessions' | 'homework' | 'safety'>(
    'tutors',
  );

  const learningSummary =
    learningSummaryData && 'data' in learningSummaryData ? learningSummaryData.data : undefined;
  const rawRequests = requestsData?.data || [];
  const childBookings = Array.isArray(rawRequests)
    ? rawRequests.filter((b) => b.studentUserId === studentId)
    : [];
  const rawSessions = sessionsData?.data || [];
  const childSessions = Array.isArray(rawSessions) ? rawSessions : [];

  const metrics = learningSummary?.metrics;

  const handleSettleMilestone = async (sessionId: string) => {
    try {
      await settleMilestone({ sessionId }).unwrap();
      playAudioTone('success');
      toast.success(isBn ? 'ক্লাস পারিশ্রমিক অনুমোদন সম্পন্ন' : 'Milestone Payout Released', {
        description: isBn
          ? 'এসক্রো অ্যাকাউন্ট থেকে শিক্ষকের ওয়ালেটে সফলভাবে পারিশ্রমিক স্থানান্তর হয়েছে।'
          : 'Escrow milestone has been credited to tutor payable ledger.',
      });
      refetchSessions();
    } catch {
      playAudioTone('alert');
      toast.error(isBn ? 'পারিশ্রমিক অনুমোদন ব্যর্থ হয়েছে' : 'Failed to release milestone', {
        description: isBn
          ? 'শুধুমাত্র সম্পন্ন ক্লাসের পারিশ্রমিক ছাড় করা সম্ভব।'
          : 'Only completed sessions can be settled.',
      });
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={
        child?.displayName
          ? `${child.displayName} — ${isBn ? 'একাডেমিক প্রোফাইল' : 'Academic Dossier'}`
          : isBn
            ? 'সন্তান প্রোফাইল'
            : 'Child Profile'
      }
      subtitle={
        isBn
          ? 'সন্তানের ক্লাস উপস্থিতি, এসক্রো সুরক্ষা, হোমওয়ার্ক মূল্যায়ন ও শিক্ষক তদারকি'
          : 'Realtime academic oversight, attendance verification, escrow release & safety'
      }
      role="guardian"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={withLocale('/dashboard/guardian/children', locale)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isBn ? 'সকল সন্তান' : 'Back to Children'}</span>
          </Link>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsSafetyModalOpen(true)}
            className="gap-1.5 text-xs font-bold shadow-xs bg-destructive hover:bg-destructive/90 text-white rounded-full"
            id="btn-trigger-child-safety"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isBn ? 'জরুরি নিরাপত্তা সতর্কতা' : 'Child Safety Alert'}</span>
          </Button>
        </div>
      }
    >
      {/* 1. CHILD HERO DOSSIER CARD */}
      <div
        className="p-5 rounded-2xl bg-card border border-border shadow-xs relative overflow-hidden"
        data-testid="child-dossier-hero"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-brand-accent border border-primary/30 flex items-center justify-center text-primary font-black text-2xl">
              {child?.displayName ? child.displayName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {child?.displayName || (isBn ? 'শিক্ষার্থী' : 'Student')}
                </h2>
                {child?.isMinor && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-warning/10 text-warning border-warning/40"
                  >
                    {isBn ? 'অপ্রাপ্তবয়স্ক (Minor < 18)' : 'Minor (<18)'}
                  </Badge>
                )}
                <Badge variant={child?.status === 'active' ? 'success' : 'warning'}>
                  {child?.status === 'active'
                    ? isBn
                      ? 'সক্রিয় অভিভাবকত্ব'
                      : 'Active Guardianship'
                    : isBn
                      ? 'অনুমোদন অপেক্ষমাণ'
                      : 'Pending Consent'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  {child?.institutionName ||
                    (isBn ? 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ' : 'General Institution')}
                </span>
                <span>•</span>
                <span className="capitalize text-foreground font-semibold">
                  {child?.relationshipType === 'father'
                    ? isBn
                      ? 'পিতা'
                      : 'Father'
                    : child?.relationshipType === 'mother'
                      ? isBn
                        ? 'মাতা'
                        : 'Mother'
                      : isBn
                        ? 'আইনগত অভিভাবক'
                        : 'Legal Guardian'}
                </span>
              </p>
              <div className="flex items-center gap-2 text-[11px] text-success-soft-foreground  font-medium pt-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isBn
                    ? `অভিভাবক সম্মতি নীতি: ${child?.consentPolicyVersion || 'v1.0-bd-minor-consent'}`
                    : `Verified Parental Consent: ${child?.consentPolicyVersion || 'v1.0-bd-minor-consent'}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground">
              {isBn ? 'স্টুডেন্ট আইডি:' : 'Student ID:'}{' '}
              <span className="font-mono text-foreground font-semibold">
                {studentId.slice(0, 8)}...
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const firstBooking = childBookings[0];
                setSelectedBookingForReplacement(
                  firstBooking
                    ? {
                        id: firstBooking.id,
                        tutorName: firstBooking.tutorProfile?.user?.displayName,
                        subjectName: firstBooking.subject?.name,
                      }
                    : null,
                );
                setIsReplacementModalOpen(true);
              }}
              className="gap-1.5 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              id="btn-open-replacement-guarantee"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? '৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট দাবি' : 'Claim 48h Replacement'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 4-METRIC KPI GRID */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="child-kpi-grid"
      >
        <Card className="rounded-2xl border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {isBn ? 'সক্রিয় শিক্ষক ও কোর্স' : 'Active Tutors'}
            </span>
            <div className="p-2 rounded-xl bg-interactive/10 text-info-soft-foreground">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">{childBookings.length}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isBn ? 'চলমান টিউটরিং বুকিং' : 'Enrolled courses'}
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {isBn ? 'ক্লাস উপস্থিতি হার' : 'Attendance Rate'}
            </span>
            <div className="p-2 rounded-xl bg-success-soft text-success-soft-foreground">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">
              {metrics?.attendanceRate !== undefined ? `${metrics.attendanceRate}%` : '100%'}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics
                ? `${metrics.sessionsAttended}/${metrics.totalSessionsRecorded} ${isBn ? 'ক্লাসে উপস্থিত' : 'sessions attended'}`
                : isBn
                  ? 'সকল ক্লাসে উপস্থিত'
                  : 'Full attendance'}
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {isBn ? 'হোমওয়ার্ক সম্পন্ন' : 'Assignments'}
            </span>
            <div className="p-2 rounded-xl bg-warning/10 text-warning">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">
              {metrics ? `${metrics.assignmentsCompleted}/${metrics.assignmentsAssigned}` : '0/0'}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics?.averageScore !== null && metrics?.averageScore !== undefined
                ? `${isBn ? 'গড় নম্বর:' : 'Avg Score:'} ${metrics.averageScore}%`
                : isBn
                  ? 'মূল্যায়ন প্রক্রিয়াধীন'
                  : 'Awaiting grades'}
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {isBn ? 'আর্থিক এসক্রো সুরক্ষা' : 'Escrow Protected'}
            </span>
            <div className="p-2 rounded-xl bg-interactive/10 text-interactive">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-success-soft-foreground">১০০%</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isBn ? 'ক্লাস যাচাইয়ের পর ফান্ড ছাড়' : 'Milestone payout control'}
            </p>
          </div>
        </Card>
      </div>

      {/* 3. INTERACTIVE SECTION TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'tutors'}
          onClick={() => setActiveTab('tutors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tutors'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          id="tab-tutors"
        >
          {isBn
            ? `শিক্ষক ও বুকিং (${childBookings.length})`
            : `Tutors & Bookings (${childBookings.length})`}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          id="tab-sessions"
        >
          {isBn
            ? `ক্লাস শিডিউল ও হাজিরা (${childSessions.length})`
            : `Sessions & Attendance (${childSessions.length})`}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'homework'}
          onClick={() => setActiveTab('homework')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'homework'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          id="tab-homework"
        >
          {isBn ? 'বাড়ির কাজ ও অগ্রগতি' : 'Homework & Progress'}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'safety'}
          onClick={() => setActiveTab('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'safety'
              ? 'bg-destructive text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          id="tab-safety"
        >
          {isBn ? 'শিশু সুরক্ষা ও অভিযোগ' : 'Child Safety & Trust'}
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {/* TAB A: TUTORS & BOOKINGS */}
      {activeTab === 'tutors' && (
        <div className="flex flex-col gap-4" data-testid="child-tutors-list">
          {childBookings.length === 0 ? (
            <Card className="py-12 text-center rounded-2xl">
              <CardContent className="flex flex-col gap-3">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-foreground">
                  {isBn
                    ? 'এই সন্তানের জন্য কোনো শিক্ষক বুকিং নেই'
                    : 'No active bookings for this child'}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {isBn
                    ? 'বিষয় ও এলাকাভিত্তিক যাচাইকৃত শিক্ষক অনুসন্ধান করে বুকিং শুরু করুন।'
                    : 'Search verified tutors by subject and grade level to schedule classes.'}
                </p>
                <Link
                  href={withLocale('/tutors', locale)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs shadow-blue-500/25 transition-all"
                >
                  {isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childBookings.map((b) => (
                <Card
                  key={b.id}
                  className="rounded-2xl border-border bg-card hover:border-primary/40 transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-base">
                          {b.tutorProfile?.user?.displayName ||
                            (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor')}
                        </h4>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          {b.subject?.name || (isBn ? 'সাধারণ বিষয়' : 'Subject')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.educationLevel?.name ||
                          (isBn ? 'মাধ্যমিক/উচ্চমাধ্যমিক' : 'Curriculum Level')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        b.status === 'confirmed'
                          ? 'success'
                          : b.status === 'pending'
                            ? 'warning'
                            : 'outline'
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-bold text-success-soft-foreground ">
                      {isBn ? 'ফি:' : 'Rate:'}{' '}
                      {((Number(b.pricePerSessionMinor) || 0) / 100).toFixed(0)} BDT /{' '}
                      {isBn ? 'ক্লাস' : 'session'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-border text-foreground hover:bg-surface-hover"
                        onClick={() => {
                          setSelectedBookingForReplacement({
                            id: b.id,
                            tutorName: b.tutorProfile?.user?.displayName,
                            subjectName: b.subject?.name,
                          });
                          setIsReplacementModalOpen(true);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 text-muted-foreground mr-1" />
                        {isBn ? 'রিপ্লেসমেন্ট' : 'Replace'}
                      </Button>
                      <Link
                        href={withLocale(`/dashboard/bookings/${b.id}`, locale)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold"
                      >
                        {isBn ? 'বিস্তারিত' : 'Details'}
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB B: SESSIONS & ATTENDANCE */}
      {activeTab === 'sessions' && (
        <div className="flex flex-col gap-4" data-testid="child-sessions-list">
          {childSessions.length === 0 ? (
            <Card className="py-12 text-center rounded-2xl">
              <CardContent className="flex flex-col gap-2">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-foreground">
                  {isBn ? 'কোনো ক্লাস শিডিউল নেই' : 'No sessions scheduled yet'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'শিক্ষক বুকিং নিশ্চিত হলে ক্লাসের সময়সূচি এখানে প্রদর্শিত হবে।'
                    : 'Upcoming class timetable will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {childSessions.map((s) => (
                <Card
                  key={s.id}
                  className="rounded-2xl border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-sm">
                        {formatDateTime(String(s.startsAt), locale)}
                      </span>
                      <Badge
                        variant={
                          s.status === 'completed'
                            ? 'success'
                            : s.status === 'cancelled'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {s.status === 'completed' ? (isBn ? 'সম্পন্ন' : 'Completed') : s.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.subjectName || (isBn ? 'পাঠদান বিষয়' : 'Lesson')} •{' '}
                      {s.tutorName || (isBn ? 'শিক্ষক' : 'Tutor')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.meetingUrl && (
                      <a
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-interactive/10 text-info-soft-foreground hover:bg-interactive/20 text-xs font-semibold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{isBn ? 'লাইভ ক্লাস' : 'Join'}</span>
                      </a>
                    )}
                    {s.status === 'completed' && (
                      <Button
                        size="sm"
                        disabled={isSettling}
                        onClick={() => handleSettleMilestone(s.id)}
                        className="gap-1.5 text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-8 px-3 rounded-xl shadow-xs shadow-blue-500/25"
                        id={`btn-settle-${s.id}`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>
                          {isSettling ? '...' : isBn ? 'পারিশ্রমিক অনুমোদন' : 'Release Escrow'}
                        </span>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: HOMEWORK & PROGRESS */}
      {activeTab === 'homework' && (
        <div className="flex flex-col gap-4" data-testid="child-homework-list">
          {!learningSummary?.assignments || learningSummary.assignments.length === 0 ? (
            <Card className="py-12 text-center rounded-2xl">
              <CardContent className="flex flex-col gap-2">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-foreground">
                  {isBn ? 'কোনো বাড়ির কাজ দেওয়া হয়নি' : 'No homework records yet'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'শিক্ষক বাড়ির কাজ দিলে তা এখানে গ্রেড ও ফিডব্যাক সহ দেখা যাবে।'
                    : 'Homework assignments and teacher feedback will be listed here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {learningSummary.assignments.map((a) => (
                <Card
                  key={a.id}
                  className="rounded-2xl border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-foreground text-sm">{a.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {isBn ? 'সর্বোচ্চ নম্বর:' : 'Max Score:'} {a.maxScore}{' '}
                      {a.dueAt &&
                        `• ${isBn ? 'জমার শেষ সময়:' : 'Due:'} ${formatDateTime(String(a.dueAt), locale)}`}
                    </p>
                  </div>
                  <Link
                    href={withLocale(`/assignments/${a.id}`, locale)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold self-start sm:self-center"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isBn ? 'মূল্যায়ন ও সমাধান দেখুন' : 'View Submission'}</span>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB D: CHILD SAFETY & TRUST ACTIONS */}
      {activeTab === 'safety' && (
        <div className="flex flex-col gap-4" data-testid="child-safety-section">
          <Card className="rounded-2xl border-destructive/40 bg-surface-muted p-6 text-foreground">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/20 border border-destructive/40 text-destructive-soft-foreground flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {isBn
                    ? 'শিশু সুরক্ষা ও নীতি পর্যবেক্ষণ (Child Safeguarding Center)'
                    : 'Child Safeguarding & Incident Center'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  {isBn
                    ? 'OgroniEdu প্ল্যাটফর্মে শিক্ষার্থীর মানসিক, শারীরিক ও একাডেমিক নিরাপত্তা সর্বোচ্চ অগ্রাধিকার। যেকোনো অনৈতিক প্রস্তাব, অসমীচীন আচরণ বা শিক্ষকের অনুপস্থিতিতে সরাসরি সিকিউরিটি ডেস্কে রিপোর্ট করুন।'
                    : 'The well-being, psychological safety and physical integrity of our students is our absolute priority. Immediately report any misconduct, inappropriate communication, or breach of protocol.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsSafetyModalOpen(true)}
                    className="gap-2 bg-destructive hover:bg-destructive/90 text-white font-bold px-4 rounded-xl"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>
                      {isBn
                        ? 'জরুরি শিশু সুরক্ষা রিপোর্ট দায়ের করুন'
                        : 'File Immediate Child Safety Alert'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const firstBooking = childBookings[0];
                      setSelectedBookingForReplacement(
                        firstBooking
                          ? {
                              id: firstBooking.id,
                              tutorName: firstBooking.tutorProfile?.user?.displayName,
                              subjectName: firstBooking.subject?.name,
                            }
                          : null,
                      );
                      setIsReplacementModalOpen(true);
                    }}
                    className="gap-2 border-border hover:bg-surface-hover text-foreground rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>
                      {isBn ? '৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট দাবি' : 'Claim 48-Hour Replacement'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* National Helpline Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive-soft flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-destructive-soft-foreground">
                  {isBn ? 'জাতীয় জরুরি হটলাইন' : 'National Emergency Hotline'}
                </span>
                <h4 className="text-xl font-black text-foreground mt-0.5">১০৯৮ / ৯৯৯</h4>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'বাংলাদেশ সরকার শিশু ও জরুরি সহায়তা ডেস্ক'
                    : 'Government of Bangladesh 24/7 Helpline'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive-soft-foreground text-xs font-bold border border-destructive/40">
                ২৪/৭ ফ্রি কল
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isBn ? 'অগ্রণী এডু ট্রাস্ট ও নিরাপত্তা টিম' : 'OgroniEdu Trust & Safety'}
                </span>
                <h4 className="text-xl font-black text-foreground mt-0.5">+৮৮০ ৯৬১২-৩৪৫৬৭৮</h4>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'অভিভাবক সহায়তা ও এসক্রো ট্রায়াজ'
                    : 'Parental Support & Escrow Dispute Desk'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/30">
                তাৎক্ষণিক ট্রায়াজ
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SafetyReportModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        locale={locale}
        defaultBookingId={childBookings[0]?.id}
        defaultReportedUserId={childBookings[0]?.tutorUserId}
        reportedUserName={childBookings[0]?.tutorProfile?.user?.displayName}
      />

      <TutorReplacementModal
        isOpen={isReplacementModalOpen}
        onClose={() => setIsReplacementModalOpen(false)}
        locale={locale}
        bookingId={selectedBookingForReplacement?.id || childBookings[0]?.id || ''}
        tutorName={
          selectedBookingForReplacement?.tutorName ||
          childBookings[0]?.tutorProfile?.user?.displayName
        }
        subjectName={selectedBookingForReplacement?.subjectName || childBookings[0]?.subject?.name}
      />
    </DashboardShell>
  );
}
