'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Video,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Radio,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { useGetSessionByIdQuery } from '@/store/services/sessions-api';
import {
  useGetSessionAttendanceQuery,
  useMarkAttendanceMutation,
  type AttendanceStatus,
} from '@/store/services/learning-api';
import { useAppSelector } from '@/store';
import { type Locale } from '@/lib/i18n';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface SessionDetailParams {
  locale: string;
  id: string;
}

interface SessionDetailData {
  id: string;
  bookingId?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  meetingUrl?: string | null;
  subjectName?: string;
  tutorName?: string;
  studentName?: string;
  studentUserId?: string;
  studentUser?: { id?: string; displayName?: string };
  tutorProfile?: { user?: { displayName?: string } };
  booking?: {
    id?: string;
    subject?: { nameEn?: string; nameBn?: string };
  };
}

export default function SessionDetailRoute({ params }: { params: Promise<SessionDetailParams> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const sessionId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <DashboardShell locale={locale}>
        <SessionDetailPage locale={locale} sessionId={sessionId} />
      </DashboardShell>
    </RequireAuth>
  );
}

function SessionDetailPage({ locale, sessionId }: { locale: Locale; sessionId: string }) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');

  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
  } = useGetSessionByIdQuery(sessionId);

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = useGetSessionAttendanceQuery(sessionId);

  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [markSuccess, setMarkSuccess] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const session = React.useMemo<SessionDetailData | null>(() => {
    if (!sessionData) return null;
    try {
      return parseItem<SessionDetailData>(sessionData);
    } catch {
      return null;
    }
  }, [sessionData]);

  const existingAttendance = React.useMemo(() => {
    if (!attendanceData) return [];
    try {
      const parsed = parseItem<
        Array<{
          id: string;
          attendanceStatus: AttendanceStatus;
          recordedAt: string;
          notes?: string | null;
          participantUserId: string;
        }>
      >(attendanceData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [attendanceData]);

  const latestRecord = existingAttendance[0] ?? null;

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setMarkError(null);
    setMarkSuccess(false);

    const participantUserId =
      (session.studentUserId as string) || (session.studentUser as { id?: string } | undefined)?.id;

    if (!participantUserId) {
      setMarkError(
        locale === 'bn'
          ? 'শিক্ষার্থী শনাক্ত করা যায়নি।'
          : 'Could not identify participant student.',
      );
      return;
    }

    try {
      await markAttendance({
        sessionId,
        participantUserId,
        attendanceStatus: selectedStatus,
        notes: attendanceNotes.trim() || undefined,
      }).unwrap();
      setMarkSuccess(true);
      refetchAttendance();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ??
            'Failed to record attendance')
          : 'Failed to record attendance';
      setMarkError(message);
    }
  };

  if (sessionLoading || attendanceLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-300">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
          <h2 className="text-lg font-bold mb-1">
            {locale === 'bn' ? 'ক্লাস সেশন পাওয়া যায়নি' : 'Session Not Found'}
          </h2>
          <p className="text-xs text-rose-200/80 mb-4">
            {locale === 'bn'
              ? 'অনুরোধকৃত ক্লাস সেশনের আইডি সঠিক নয় অথবা এটি মুছে ফেলা হয়েছে।'
              : 'The requested class session could not be found or you may not have access.'}
          </p>
          <Link
            href={withLocale('/sessions', locale)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'bn' ? 'সব ক্লাসে ফিরে যান' : 'Back to Sessions'}
          </Link>
        </div>
      </div>
    );
  }

  const startsAt = session.startsAt || new Date().toISOString();
  const endsAt = session.endsAt || new Date().toISOString();
  const subjectObj = session.booking?.subject;
  const subjectName: string =
    locale === 'bn'
      ? subjectObj?.nameBn || session.subjectName || 'টিউটরিং ক্লাস'
      : subjectObj?.nameEn || session.subjectName || 'Tutoring Session';

  const tutorName: string =
    session.tutorName ||
    session.tutorProfile?.user?.displayName ||
    (locale === 'bn' ? 'শিক্ষক' : 'Tutor');

  const studentName: string =
    session.studentName ||
    session.studentUser?.displayName ||
    (locale === 'bn' ? 'শিক্ষার্থী' : 'Student');

  const meetingUrl = session.meetingUrl;
  const status = session.status || 'scheduled';

  const statusBadge = () => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {locale === 'bn' ? 'নির্ধারিত' : 'Scheduled'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {locale === 'bn' ? 'চলমান' : 'In Progress'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30">
            {locale === 'bn' ? 'সম্পন্ন' : 'Completed'}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30">
            {locale === 'bn' ? 'বাতিলকৃত' : 'Cancelled'}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/30">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={withLocale('/sessions', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          data-testid="back-to-sessions-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'bn' ? 'সব ক্লাসের সময়সূচী' : 'All Class Schedules'}
        </Link>
        <div className="flex items-center gap-2">
          {session.bookingId && (
            <Link
              href={withLocale(`/bookings/${session.bookingId}`, locale)}
              className="text-xs text-teal-400 hover:text-teal-300 underline font-medium"
            >
              {locale === 'bn' ? 'বুকিং বিবরণ দেখুন' : 'View Booking Details'}
            </Link>
          )}
        </div>
      </div>

      {/* Live Interactive Classroom Workspace Launch Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-teal-950 border border-cyan-400/40 p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-400/30">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{locale === 'bn' ? 'স্মার্ট ক্লাসরুম হাব' : 'Smart Classroom Hub'}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            {locale === 'bn'
              ? 'ইন্টারেক্টিভ ডিজিটাল হোয়াইটবোর্ড ও লাইভ স্টাডি রুম'
              : 'Interactive Whiteboard & Live Study Room'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            {locale === 'bn'
              ? 'ইন-ব্রাউজার ডিজিটাল হোয়াইটবোর্ড, পদার্থ ও গণিতের ফর্মুলা চিটশিট এবং লাইভ সেশন টাইমার সহ সরাসরি ক্লাসরুমে প্রবেশ করুন।'
              : 'Enter collaborative whiteboard with NCTB formula sheets, drawing tools, and real-time session controls.'}
          </p>
        </div>
        <Link
          href={withLocale(`/classroom/${sessionId}`, locale)}
          className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-2xl shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105"
          data-testid="enter-live-classroom-btn"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{locale === 'bn' ? 'লাইভ ক্লাসরুমে প্রবেশ করুন' : 'Enter Live Classroom'}</span>
        </Link>
      </div>

      {/* Main Session Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-[#062127] border border-emerald-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-medium text-emerald-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'বাংলাদেশ সময় (BST / UTC+6)' : 'BST / UTC+6'}</span>
              </span>
              {statusBadge()}
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>{subjectName}</span>
            </h1>
            <p className="text-sm text-emerald-100/80 flex items-center gap-4">
              <span>
                {locale === 'bn' ? 'শিক্ষক:' : 'Tutor:'}{' '}
                <strong className="text-white">{tutorName}</strong>
              </span>
              <span>•</span>
              <span>
                {locale === 'bn' ? 'শিক্ষার্থী:' : 'Student:'}{' '}
                <strong className="text-white">{studentName}</strong>
              </span>
            </p>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 shrink-0 text-center space-y-1">
            <div className="text-xs uppercase tracking-wider font-bold text-emerald-400">
              {formatWeekdayDate(startsAt, locale)}
            </div>
            <div className="text-xl font-black text-white">
              {formatTime(startsAt, locale)} - {formatTime(endsAt, locale)}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Classroom Link & Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Classroom Card */}
        <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Video className="w-5 h-5" />
              <CardTitle className="text-lg font-bold">
                {locale === 'bn' ? 'অনলাইন ক্লাসরুম' : 'Online Classroom'}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400">
              {locale === 'bn'
                ? 'ক্লাস চলাকালীন গুগল মিট বা সরাসরি অনলাইন লিংকে প্রবেশ করুন।'
                : 'Join live video session via secure meeting link.'}
            </p>
          </CardHeader>

          <CardContent className="p-0 space-y-4 pt-2">
            {meetingUrl ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {locale === 'bn'
                      ? 'অনুমোদিত নিরাপদ ক্লাসরুম লিংক'
                      : 'Verified Secure Classroom Link'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-mono break-all truncate">
                  {meetingUrl}
                </div>
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/40"
                  data-testid="join-classroom-btn"
                >
                  <ExternalLink className="w-4 h-4" />
                  {locale === 'bn' ? 'ক্লাসরুমে যোগ দিন (গুগল মিট)' : 'Join Live Classroom'}
                </a>

                <Link
                  href={withLocale(`/classroom/${sessionId}`, locale)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold rounded-xl transition-all"
                  data-testid="open-whiteboard-card-btn"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {locale === 'bn'
                    ? 'হোয়াইটবোর্ড ও স্টাডি রুম খুলুন'
                    : 'Open Whiteboard & Study Room'}
                </Link>
              </div>
            ) : (
              <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-center space-y-3">
                <Video className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-xs text-slate-400">
                  {locale === 'bn'
                    ? 'ক্লাসের মিটিং লিংক শিক্ষক কর্তৃক নির্ধারিত হবে।'
                    : 'Meeting link has not been attached yet. The tutor will provide it before class.'}
                </p>
                <Link
                  href={withLocale(`/classroom/${sessionId}`, locale)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold rounded-xl transition-all"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {locale === 'bn'
                    ? 'ইন-ব্রাউজার হোয়াইটবোর্ড ব্যবহার করুন'
                    : 'Use In-Browser Whiteboard'}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <UserCheck className="w-5 h-5" />
                <CardTitle className="text-lg font-bold">
                  {locale === 'bn' ? 'ক্লাসের উপস্থিতি (হাজিরা)' : 'Session Attendance'}
                </CardTitle>
              </div>
              {latestRecord && (
                <Badge
                  className={
                    latestRecord.attendanceStatus === 'present'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : latestRecord.attendanceStatus === 'late'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }
                >
                  {latestRecord.attendanceStatus.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {locale === 'bn'
                ? 'উপস্থিতি চিহ্নিত হলে শিক্ষার্থী ও অভিভাবক তাৎক্ষণিক নোটিফিকেশন পাবেন।'
                : 'Recorded attendance triggers instant notifications to student and guardians.'}
            </p>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            {latestRecord && (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <span>{locale === 'bn' ? 'রেকর্ডকৃত অবস্থা:' : 'Recorded Status:'}</span>
                  <span className="font-bold text-white capitalize">
                    {latestRecord.attendanceStatus}
                  </span>
                </div>
                {latestRecord.notes && (
                  <p className="text-slate-400 italic">"{latestRecord.notes}"</p>
                )}
                <div className="text-[10px] text-slate-500 text-right">
                  {new Date(latestRecord.recordedAt).toLocaleString(
                    locale === 'bn' ? 'bn-BD' : 'en-US',
                  )}
                </div>
              </div>
            )}

            {isTutor ? (
              <form
                onSubmit={handleMarkAttendance}
                className="space-y-3"
                data-testid="tutor-mark-attendance-form"
              >
                <label className="text-xs font-semibold text-slate-300 block">
                  {locale === 'bn' ? 'উপস্থিতি নির্ধারণ করুন:' : 'Mark Attendance Status:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setSelectedStatus(st)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all capitalize ${
                        selectedStatus === st
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                      data-testid={`attendance-status-${st}`}
                    >
                      {st === 'present'
                        ? locale === 'bn'
                          ? 'উপস্থিত'
                          : 'Present'
                        : st === 'late'
                          ? locale === 'bn'
                            ? 'দেরি'
                            : 'Late'
                          : st === 'absent'
                            ? locale === 'bn'
                              ? 'অনুপস্থিত'
                              : 'Absent'
                            : locale === 'bn'
                              ? 'ছুটি'
                              : 'Excused'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label htmlFor="attendance-notes" className="text-xs text-slate-400">
                    {locale === 'bn' ? 'মন্তব্য (ঐচ্ছিক):' : 'Notes (optional):'}
                  </label>
                  <input
                    id="attendance-notes"
                    type="text"
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? 'ক্লাসের সক্রিয়তা বা মন্তব্য লিখুন...'
                        : 'Add session notes or observations...'
                    }
                    className="w-full h-9 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    data-testid="attendance-notes-input"
                  />
                </div>

                {markError && (
                  <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                    {markError}
                  </div>
                )}
                {markSuccess && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {locale === 'bn'
                        ? 'উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে!'
                        : 'Attendance marked successfully!'}
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  isLoading={isMarking}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
                  data-testid="submit-attendance-btn"
                >
                  {latestRecord
                    ? locale === 'bn'
                      ? 'উপস্থিতি হালনাগাদ করুন'
                      : 'Update Attendance'
                    : locale === 'bn'
                      ? 'উপস্থিতি নিশ্চিত করুন'
                      : 'Confirm Attendance'}
                </Button>
              </form>
            ) : (
              <div className="text-xs text-slate-400 text-center py-2">
                {latestRecord
                  ? locale === 'bn'
                    ? 'শিক্ষক এই ক্লাসের উপস্থিতি নথিভুক্ত করেছেন।'
                    : 'Tutor has recorded attendance for this class.'
                  : locale === 'bn'
                    ? 'শিক্ষক এখনো উপস্থিতি নথিভুক্ত করেননি।'
                    : 'Attendance has not been recorded by tutor yet.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
