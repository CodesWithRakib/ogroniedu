'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  CheckCircle2,
  Clock,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  BookOpen,
  UserCheck,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
} from '@/components/ui';
import {
  SessionItem,
  useStartSessionMutation,
  useCompleteSessionMutation,
  useUpdateMeetingUrlMutation,
} from '@/store/services/sessions-api';
import {
  useGetSessionAttendanceQuery,
  useMarkAttendanceMutation,
  type AttendanceStatus,
} from '@/store/services/learning-api';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import { ClassroomFormulasDrawer } from './ClassroomFormulasDrawer';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface ClassroomWorkspaceProps {
  session: SessionItem;
  locale?: 'bn' | 'en';
  isTutor?: boolean;
}

export function ClassroomWorkspace({
  session,
  locale = 'bn',
  isTutor = false,
}: ClassroomWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'formulas' | 'attendance'>(
    'whiteboard',
  );

  // Mutations
  const [startSession, { isLoading: isStarting }] = useStartSessionMutation();
  const [completeSession, { isLoading: isCompleting }] = useCompleteSessionMutation();
  const [updateMeetingUrl, { isLoading: isUpdatingUrl }] = useUpdateMeetingUrlMutation();

  // Meeting URL editing state
  const [isEditingMeetingUrl, setIsEditingMeetingUrl] = useState(false);
  const [meetingUrlInput, setMeetingUrlInput] = useState(session.meetingUrl || '');
  const [copiedLink, setCopiedLink] = useState(false);

  // Completion modal state
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Action status messages
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Attendance
  const { data: attendanceData, refetch: refetchAttendance } = useGetSessionAttendanceQuery(
    session.id,
  );
  const [markAttendance, { isLoading: isMarkingAttendance }] = useMarkAttendanceMutation();
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] =
    useState<AttendanceStatus>('present');
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);

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

  const latestAttendance = existingAttendance[0] ?? null;

  // Real-time timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session.status === 'in_progress') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.status]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Class Handler
  const handleStartClass = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await startSession(session.id).unwrap();
      setActionSuccess(
        locale === 'bn'
          ? 'ক্লাস সফলভাবে শুরু হয়েছে! লাইভ সেশন চলছে।'
          : 'Session started! Live classroom is now in progress.',
      );
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to start session')
          : 'Failed to start session';
      setActionError(msg);
    }
  };

  // Complete Class Handler
  const handleCompleteClass = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await completeSession({
        id: session.id,
        notes: completionNotes.trim() || undefined,
      }).unwrap();
      setShowCompletionModal(false);
      setActionSuccess(
        locale === 'bn'
          ? 'ক্লাস সফলভাবে সম্পন্ন হয়েছে এবং সংরক্ষিত হয়েছে!'
          : 'Session successfully marked as completed!',
      );
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to complete session')
          : 'Failed to complete session';
      setActionError(msg);
    }
  };

  // Update Meeting URL Handler
  const handleSaveMeetingUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrlInput.trim()) return;
    try {
      await updateMeetingUrl({
        id: session.id,
        meetingUrl: meetingUrlInput.trim(),
      }).unwrap();
      setIsEditingMeetingUrl(false);
      setActionSuccess(
        locale === 'bn'
          ? 'মিটিং লিংক সফলভাবে আপডেট করা হয়েছে!'
          : 'Classroom meeting URL updated successfully!',
      );
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ??
            'Failed to update meeting URL')
          : 'Failed to update meeting URL';
      setActionError(msg);
    }
  };

  // Copy Meeting Link Handler
  const handleCopyLink = () => {
    if (!session.meetingUrl) return;
    navigator.clipboard.writeText(session.meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Mark Attendance Handler
  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const participantUserId =
      (session.studentUserId as string) || (session.studentUser as { id?: string } | undefined)?.id;

    if (!participantUserId) return;

    try {
      await markAttendance({
        sessionId: session.id,
        participantUserId,
        attendanceStatus: selectedAttendanceStatus,
        notes: attendanceNotes.trim() || undefined,
      }).unwrap();
      setAttendanceSuccess(true);
      refetchAttendance();
      setTimeout(() => setAttendanceSuccess(false), 3000);
    } catch {
      // handled
    }
  };

  const subjectTitle =
    (session.booking as { subject?: { nameBn?: string; nameEn?: string } })?.subject?.nameBn ||
    session.subjectName ||
    (locale === 'bn' ? 'টিউটরিং ক্লাস' : 'Tutoring Class');

  const tutorName =
    session.tutorName ||
    (session.tutorProfile as { user?: { displayName?: string } })?.user?.displayName ||
    (locale === 'bn' ? 'শিক্ষক' : 'Tutor');

  const studentName =
    session.studentName ||
    (session.studentUser as { displayName?: string })?.displayName ||
    (locale === 'bn' ? 'শিক্ষার্থী' : 'Student');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={withLocale(`/sessions/${session.id}`, locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-session-detail"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === 'bn' ? 'সেশন বিবরণে ফিরে যান' : 'Back to Session Details'}</span>
        </Link>

        {/* Live Status Pill & Timer */}
        <div className="flex items-center gap-3">
          {session.status === 'in_progress' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-interactive/10 border border-info/40 text-info-soft-foreground text-xs font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-info-soft-foreground" />
              <span>{locale === 'bn' ? 'লাইভ ক্লাস চলছে' : 'Live Session Active'}</span>
              <span>•</span>
              <span className="font-mono">{formatTimer(secondsElapsed)}</span>
            </div>
          ) : session.status === 'completed' ? (
            <Badge className="bg-interactive/10 text-info-soft-foreground border border-interactive/40 text-xs px-3 py-1">
              {locale === 'bn' ? 'ক্লাস সম্পন্ন' : 'Completed'}
            </Badge>
          ) : (
            <Badge className="bg-success-soft text-success-soft-foreground border border-success/30 text-xs px-3 py-1">
              {locale === 'bn' ? 'ক্লাসের জন্য নির্ধারিত' : 'Scheduled'}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-soft border border-brand/30 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-interactive/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-info-soft-foreground font-semibold">
              <Sparkles className="w-4 h-4 text-info-soft-foreground" />
              <span>
                {locale === 'bn'
                  ? 'অগ্রণী এডু ইন্টারেক্টিভ লাইভ ক্লাসরুম'
                  : 'OgroniEdu Live Interactive Classroom'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {subjectTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  {locale === 'bn' ? 'শিক্ষক:' : 'Tutor:'}
                </span>
                <strong className="text-foreground font-bold">{tutorName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  {locale === 'bn' ? 'শিক্ষার্থী:' : 'Student:'}
                </span>
                <strong className="text-foreground font-bold">{studentName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-info-soft-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {formatWeekdayDate(session.startsAt, locale)} (
                  {formatTime(session.startsAt, locale)})
                </span>
              </span>
            </div>
          </div>

          {/* Action Hub for Tutor / Student */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Join Video Conference */}
            {session.meetingUrl ? (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand to-brand-accent text-brand-foreground text-xs font-bold rounded-2xl transition-all"
                data-testid="launch-meeting-btn"
              >
                <Video className="w-4 h-4" />
                <span>{locale === 'bn' ? 'গুগল মিট চালু করুন' : 'Launch Google Meet'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            ) : (
              isTutor && (
                <Button
                  size="sm"
                  onClick={() => setIsEditingMeetingUrl(true)}
                  className="bg-interactive hover:bg-interactive-hover text-white text-xs font-bold rounded-2xl"
                  data-testid="set-meeting-url-btn"
                >
                  <Video className="w-4 h-4 mr-1.5" />
                  {locale === 'bn' ? 'মিটিং লিংক সেট করুন' : 'Attach Meeting Link'}
                </Button>
              )
            )}

            {/* Share / Copy Meeting Link */}
            {session.meetingUrl && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-2xl bg-muted hover:bg-surface-hover text-muted-foreground border border-border transition-all text-xs flex items-center gap-1.5"
                  title={locale === 'bn' ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                  aria-label={locale === 'bn' ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                  data-testid="copy-meeting-link-btn"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-success-soft-foreground" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedLink
                      ? locale === 'bn'
                        ? 'কপি হয়েছে'
                        : 'Copied'
                      : locale === 'bn'
                        ? 'লিংক কপি'
                        : 'Copy'}
                  </span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `${locale === 'bn' ? 'অগ্রণী এডু ক্লাসরুম লিংক:' : 'OgroniEdu Class Link:'} ${session.meetingUrl}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-2xl bg-success-soft hover:bg-primary/30 text-success-soft-foreground border border-success/30 transition-all text-xs flex items-center gap-1"
                  title={locale === 'bn' ? 'হোয়াটসঅ্যাপে শেয়ার করুন' : 'Share on WhatsApp'}
                  aria-label={locale === 'bn' ? 'হোয়াটসঅ্যাপে শেয়ার করুন' : 'Share on WhatsApp'}
                >
                  <Share2 className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Tutor Controls: Start / Complete Class */}
            {isTutor && session.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={handleStartClass}
                isLoading={isStarting}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl"
                data-testid="start-class-btn"
              >
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                {locale === 'bn' ? 'ক্লাস শুরু করুন' : 'Start Class'}
              </Button>
            )}

            {isTutor && session.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => setShowCompletionModal(true)}
                isLoading={isCompleting}
                className="bg-interactive hover:bg-interactive-hover text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl"
                data-testid="complete-class-btn"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {locale === 'bn' ? 'ক্লাস সম্পন্ন করুন' : 'Mark Completed'}
              </Button>
            )}

            {isTutor && session.meetingUrl && (
              <button
                type="button"
                onClick={() => setIsEditingMeetingUrl(!isEditingMeetingUrl)}
                className="p-2.5 rounded-2xl bg-muted hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border"
                title={locale === 'bn' ? 'মিটিং লিংক পরিবর্তন করুন' : 'Edit Meeting Link'}
                aria-label={locale === 'bn' ? 'মিটিং লিংক পরিবর্তন করুন' : 'Edit Meeting Link'}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Meeting URL Inline Edit Box */}
        {isEditingMeetingUrl && (
          <form
            onSubmit={handleSaveMeetingUrl}
            className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-2"
          >
            <Input
              type="url"
              required
              value={meetingUrlInput}
              onChange={(e) => setMeetingUrlInput(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="flex-1 h-9 rounded-xl"
              data-testid="meeting-url-input"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                size="sm"
                isLoading={isUpdatingUrl}
                className="bg-interactive hover:bg-interactive-hover text-white text-xs font-bold rounded-xl h-9 px-4"
                data-testid="save-meeting-url-btn"
              >
                {locale === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditingMeetingUrl(false)}
                className="border-border text-muted-foreground text-xs rounded-xl h-9 px-3"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
            </div>
          </form>
        )}

        {/* Action Status Feedback */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-success-soft border border-success/30 text-success-soft-foreground text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-success-soft-foreground" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/40 text-destructive-soft-foreground text-xs">
            {actionError}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('whiteboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'whiteboard'
              ? 'bg-interactive/20 text-info-soft-foreground border border-info/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          data-testid="tab-whiteboard"
        >
          <Sparkles className="w-4 h-4 text-info-soft-foreground" />
          <span>{locale === 'bn' ? 'ইন্টারেক্টিভ হোয়াইটবোর্ড' : 'Interactive Whiteboard'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('formulas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'formulas'
              ? 'bg-interactive/20 text-info-soft-foreground border border-info/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          data-testid="tab-formulas"
        >
          <BookOpen className="w-4 h-4 text-info-soft-foreground" />
          <span>{locale === 'bn' ? 'ফর্মুলা ও স্টাডি নোটস' : 'Formulas & Study Notes'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-interactive/20 text-info-soft-foreground border border-info/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
          data-testid="tab-attendance"
        >
          <UserCheck className="w-4 h-4 text-info-soft-foreground" />
          <span>{locale === 'bn' ? 'উপস্থিতি ও ক্লাস বিবরণ' : 'Attendance & Details'}</span>
        </button>
      </div>

      {/* Workspace Views */}
      {activeTab === 'whiteboard' && (
        <InteractiveWhiteboard locale={locale} sessionTitle={subjectTitle} />
      )}

      {activeTab === 'formulas' && <ClassroomFormulasDrawer locale={locale} />}

      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance Status Card */}
          <Card className="bg-card border border-border text-foreground rounded-2xl p-6">
            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-info-soft-foreground" />
              <span>
                {locale === 'bn' ? 'শিক্ষার্থীর হাজিরা / উপস্থিতি' : 'Student Attendance'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {locale === 'bn'
                ? 'উপস্থিতি নিশ্চিত করলে অভিভাবক এসএমএস/নোটিফিকেশন পাবেন।'
                : 'Recorded attendance triggers automated notifications to student & guardians.'}
            </p>

            {latestAttendance && (
              <div className="p-4 bg-surface-muted rounded-2xl border border-border mb-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {locale === 'bn' ? 'রেকর্ডকৃত স্ট্যাটাস:' : 'Recorded Status:'}
                  </span>
                  <Badge className="bg-success-soft text-success-soft-foreground border border-success/30 uppercase font-bold">
                    {latestAttendance.attendanceStatus}
                  </Badge>
                </div>
                {latestAttendance.notes && (
                  <p className="text-muted-foreground italic">"{latestAttendance.notes}"</p>
                )}
                <div className="text-[10px] text-muted-foreground text-right">
                  {new Date(latestAttendance.recordedAt).toLocaleString(
                    locale === 'bn' ? 'bn-BD' : 'en-US',
                  )}
                </div>
              </div>
            )}

            {isTutor && (
              <form
                onSubmit={handleMarkAttendance}
                className="space-y-3"
                data-testid="classroom-mark-attendance-form"
              >
                <Label className="text-xs font-semibold text-muted-foreground block">
                  {locale === 'bn' ? 'উপস্থিতি নির্ধারণ করুন:' : 'Mark Attendance:'}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setSelectedAttendanceStatus(st)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedAttendanceStatus === st
                          ? 'bg-interactive border-info/40 text-white'
                          : 'bg-muted border-border text-muted-foreground hover:bg-surface-hover'
                      }`}
                      data-testid={`classroom-attendance-${st}`}
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
                  <Label htmlFor="notes-inp" className="text-xs text-muted-foreground">
                    {locale === 'bn' ? 'ক্লাসের সক্রিয়তা বা মন্তব্য:' : 'Session remarks:'}
                  </Label>
                  <Input
                    id="notes-inp"
                    type="text"
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    placeholder={
                      locale === 'bn' ? 'যেমন: পাঠে মনোযোগ ছিল...' : 'e.g. Participated actively...'
                    }
                    className="w-full h-9 rounded-xl border-input bg-card text-xs text-foreground placeholder:text-muted-foreground"
                    data-testid="attendance-notes-input"
                  />
                </div>

                {attendanceSuccess && (
                  <div className="p-2.5 rounded-xl bg-success-soft border border-success/30 text-success-soft-foreground text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success-soft-foreground" />
                    <span>
                      {locale === 'bn' ? 'উপস্থিতি সফলভাবে সংরক্ষিত!' : 'Attendance marked!'}
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  isLoading={isMarkingAttendance}
                  className="w-full bg-interactive hover:bg-interactive-hover text-white text-xs font-bold rounded-xl"
                  data-testid="classroom-save-attendance-btn"
                >
                  {locale === 'bn' ? 'উপস্থিতি হালনাগাদ করুন' : 'Confirm Attendance'}
                </Button>
              </form>
            )}
          </Card>

          {/* Session Safety & Security Card */}
          <Card className="bg-card border border-border text-foreground rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success-soft-foreground" />
                <span>
                  {locale === 'bn'
                    ? 'নিরাপত্তা ও এস্ক্রো প্রতিশ্রুতি'
                    : 'Safety & Escrow Protection'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {locale === 'bn'
                  ? 'অগ্রণী এডুর ক্লাসরুম সেশন এন্ড-টু-এন্ড সুরক্ষিত। সেশন সম্পন্ন হওয়ার পর শিক্ষক ও শিক্ষার্থীর রিভিউয়ের ভিত্তিতে এস্ক্রো ফান্ড রিলিজ কার্যকর হয়।'
                  : 'All sessions are monitored under OgroniEdu safety standards. Escrow milestone releases are executed upon verified session completion.'}
              </p>

              <div className="p-3.5 rounded-2xl bg-surface-muted border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{locale === 'bn' ? 'বুকিং আইডি:' : 'Booking ID:'}</span>
                  <span className="font-mono text-info-soft-foreground">
                    {session.bookingId?.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{locale === 'bn' ? 'ক্লাস আইডি:' : 'Session ID:'}</span>
                  <span className="font-mono text-info-soft-foreground">
                    {session.id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{locale === 'bn' ? 'টাইমজোন:' : 'Timezone:'}</span>
                  <span className="text-foreground font-semibold">Asia/Dhaka (BST)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Link
                href={withLocale('/safety-reports', locale)}
                className="text-xs text-destructive-soft-foreground hover:text-destructive-soft-foreground font-semibold inline-flex items-center gap-1"
              >
                {locale === 'bn'
                  ? 'জরুরি রিপোর্ট বা সহায়তা প্রয়োজন?'
                  : 'Need to file a safety report?'}
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Class Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md w-full space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-bold text-foreground">
                {locale === 'bn' ? 'ক্লাস সম্পন্ন করার নিশ্চিতকরণ' : 'Complete Tutoring Class'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {locale === 'bn'
                ? 'আপনি কি ক্লাসটি সম্পন্ন হিসেবে চিহ্নিত করতে চান? ক্লাসের উপর কোনো মন্তব্য বা অগ্রগতি নোট থাকলে লিখুন।'
                : 'Mark this session as completed. You may optionally add summary feedback or study recommendations.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label
              htmlFor="completion-notes-modal"
              className="text-xs text-muted-foreground font-medium"
            >
              {locale === 'bn' ? 'ক্লাস রিভিউ ও মন্তব্য (ঐচ্ছিক):' : 'Session Notes (Optional):'}
            </Label>
            <Textarea
              id="completion-notes-modal"
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'যেমন: আজকের ক্লাসে গতিবিদ্যার গাণিতিক সমাধান অনুশীলন করা হয়েছে...'
                  : 'e.g. Covered kinematics problem set and Newton laws...'
              }
              data-testid="completion-notes-textarea"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCompletionModal(false)}
            >
              {locale === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCompleteClass}
              isLoading={isCompleting}
              data-testid="confirm-complete-class-btn"
            >
              {locale === 'bn' ? 'সম্পন্ন নিশ্চিত করুন' : 'Confirm Completion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
