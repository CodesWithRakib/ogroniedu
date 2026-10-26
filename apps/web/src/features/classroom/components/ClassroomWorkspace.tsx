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
  LayoutGrid,
  Columns,
  X,
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
import { useAppSelector } from '@/store';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import { ClassroomFormulasDrawer } from './ClassroomFormulasDrawer';
import { LiveKitClassroomMeeting } from './LiveKitClassroomMeeting';
import { formatWeekdayDate, formatTime } from '@/lib/format';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';

interface ClassroomWorkspaceProps {
  session: SessionItem;
  locale?: 'bn' | 'en';
  isTutor?: boolean;
  initialTab?: 'video' | 'whiteboard' | 'formulas' | 'attendance';
  standalone?: boolean;
}

export function ClassroomWorkspace({
  session,
  locale = 'bn',
  isTutor = false,
  initialTab = 'video',
  standalone = false,
}: ClassroomWorkspaceProps) {
  const isBn = locale === 'bn';
  const currentUser = useAppSelector((s) => s.auth.user);

  // Default to initialTab ('video' or caller specified)
  const [activeTab, setActiveTab] = useState<'video' | 'whiteboard' | 'formulas' | 'attendance'>(
    initialTab,
  );
  const [isSplitMode, setIsSplitMode] = useState(false);

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
  const [correctionReason, setCorrectionReason] = useState('');
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

  // Side-panel tool in standalone mode (opens alongside the live meeting without unmounting it)
  const [sideTool, setSideTool] = useState<'whiteboard' | 'formulas' | 'attendance' | null>(null);
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
        isBn
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
        isBn
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
        isBn
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

    if (latestAttendance && !correctionReason.trim()) {
      setActionError(
        isBn ? 'উপস্থিতি সংশোধনের জন্য কারণ লিখুন।' : 'A reason is required to correct attendance.',
      );
      return;
    }

    try {
      await markAttendance({
        sessionId: session.id,
        participantUserId,
        attendanceStatus: selectedAttendanceStatus,
        notes: attendanceNotes.trim() || undefined,
        correctionReason: correctionReason.trim() || undefined,
      }).unwrap();
      setAttendanceSuccess(true);
      setCorrectionReason('');
      refetchAttendance();
      setTimeout(() => setAttendanceSuccess(false), 3000);
    } catch {
      // handled
    }
  };

  const subjectTitle =
    (session.booking as { subject?: { nameBn?: string; nameEn?: string } })?.subject?.nameBn ||
    session.subjectName ||
    (isBn ? 'টিউটরিং ক্লাস' : 'Tutoring Class');

  const tutorName =
    session.tutorName ||
    (session.tutorProfile as { user?: { displayName?: string } })?.user?.displayName ||
    (isBn ? 'শিক্ষক' : 'Tutor');

  const studentName =
    session.studentName ||
    (session.studentUser as { displayName?: string })?.displayName ||
    (isBn ? 'শিক্ষার্থী' : 'Student');

  const activeParticipantName = currentUser?.displayName || (isTutor ? tutorName : studentName);
  const activeParticipantEmail = currentUser?.email || undefined;

  if (standalone) {
    return (
      <div className="fixed inset-0 z-40 w-screen h-[100dvh] bg-slate-100 text-slate-900 overflow-hidden flex flex-col select-none">
        {/* Sleek Top Bar (Google Meet Style - Light Mode) */}
        <header className="h-14 px-3 sm:px-5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-30 shadow-xs">
          {/* Left: Back Link & Subject Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={withLocale(`/sessions/${session.id}`, locale)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shrink-0"
              data-testid="back-to-session-detail"
              title={isBn ? 'সেশন বিবরণে ফিরে যান' : 'Back to Session Details'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'সেশন বিবরণী' : 'Details'}</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse shrink-0" />
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[140px] sm:max-w-xs">
                {subjectTitle}
              </h1>

              {session.status === 'in_progress' ? (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>{formatTimer(secondsElapsed)}</span>
                </div>
              ) : session.status === 'completed' ? (
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                  {isBn ? 'ক্লাস সম্পন্ন' : 'Completed'}
                </Badge>
              ) : (
                <Badge className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5">
                  {isBn ? 'নির্ধারিত' : 'Scheduled'}
                </Badge>
              )}
            </div>
          </div>

          {/* Center: Tools (Whiteboard, Notes, Attendance) as Side-Panel Toggles without leaving the meeting */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSideTool(null)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                sideTool === null
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              data-testid="tab-video"
              title={isBn ? 'ফুলস্ক্রিন ভিডিও ক্লাসরুম' : 'Fullscreen Video'}
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'লাইভ ভিডিও ক্লাসরুম (LiveKit)' : 'Live Video Classroom (LiveKit)'}</span>
              <span className="sm:hidden">{isBn ? 'ভিডিও' : 'Video'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSideTool(sideTool === 'whiteboard' ? null : 'whiteboard')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                sideTool === 'whiteboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              data-testid="split-mode-toggle"
              title={isBn ? 'ভিডিও ও হোয়াইটবোর্ড একসাথে দেখুন' : 'Split Whiteboard view'}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{sideTool === 'whiteboard' ? (isBn ? 'হোয়াইটবোর্ড খোলা আছে' : 'Whiteboard Open') : (isBn ? 'স্প্লিট হোয়াইটবোর্ড' : 'Split Whiteboard')}</span>
              <span className="md:hidden">{isBn ? 'হোয়াইটবোর্ড' : 'Board'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSideTool(sideTool === 'formulas' ? null : 'formulas')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                sideTool === 'formulas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              data-testid="tab-formulas"
              title={isBn ? 'ফর্মুলা ও নোটস' : 'Formulas & Study Notes'}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">{isBn ? 'ফর্মুলা ও স্টাডি নোটস' : 'Formulas & Study Notes'}</span>
              <span className="lg:hidden">{isBn ? 'নোটস' : 'Notes'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSideTool(sideTool === 'attendance' ? null : 'attendance')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                sideTool === 'attendance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              data-testid="tab-attendance"
              title={isBn ? 'উপস্থিতি ও বিবরণ' : 'Attendance & Details'}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden lg:inline">{isBn ? 'উপস্থিতি ও বিবরণ' : 'Attendance & Details'}</span>
              <span className="lg:hidden">{isBn ? 'উপস্থিতি' : 'Attendance'}</span>
            </button>
          </div>

          {/* Right: Actions, Copy */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Copy Meeting Link */}
            {session.meetingUrl && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-xs flex items-center gap-1.5 font-bold"
                title={isBn ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                aria-label={isBn ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                data-testid="copy-meeting-link-btn"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline">{copiedLink ? (isBn ? 'কপি হয়েছে' : 'Copied') : (isBn ? 'লিংক' : 'Link')}</span>
              </button>
            )}

            {/* Tutor Controls: Start / Complete Class */}
            {isTutor && session.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={handleStartClass}
                isLoading={isStarting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs"
                data-testid="start-class-btn"
              >
                <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                <span className="hidden sm:inline">{isBn ? 'ক্লাস শুরু করুন' : 'Start Class'}</span>
              </Button>
            )}

            {isTutor && session.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => setShowCompletionModal(true)}
                isLoading={isCompleting}
                className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs"
                data-testid="complete-class-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <span className="hidden sm:inline">{isBn ? 'ক্লাস সম্পন্ন' : 'Mark Completed'}</span>
              </Button>
            )}
          </div>
        </header>

        {/* Workspace Stage: Video NEVER Unmounts! Persistent Meeting Node */}
        <main className="flex-1 w-full h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden relative bg-slate-100 p-2 sm:p-3 flex flex-col lg:flex-row gap-3 items-stretch">
          {/* Main Stage: Live Video Meeting (Expands to 100% when no side tool is open, or 50% split) */}
          <div
            className={`h-full min-h-0 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col transition-all duration-200 ${
              sideTool ? 'w-full lg:w-1/2' : 'w-full'
            }`}
          >
            <LiveKitClassroomMeeting
              sessionId={session.id}
              bookingId={session.bookingId}
              locale={locale}
              displayName={activeParticipantName}
              userEmail={activeParticipantEmail}
              isTutor={isTutor}
              isStandalone={true}
              subjectTitle={subjectTitle}
            />
          </div>

          {/* Right Side Panel: Whiteboard, Notes, or Attendance (Opens without unmounting video!) */}
          {sideTool && (
            <div className="w-full lg:w-1/2 h-full min-h-0 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  {sideTool === 'whiteboard' && <Sparkles className="w-4 h-4 text-indigo-600" />}
                  {sideTool === 'formulas' && <BookOpen className="w-4 h-4 text-emerald-600" />}
                  {sideTool === 'attendance' && <UserCheck className="w-4 h-4 text-amber-600" />}
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                    {sideTool === 'whiteboard'
                      ? (isBn ? 'ইন্টারেক্টিভ হোয়াইটবোর্ড' : 'Interactive Whiteboard')
                      : sideTool === 'formulas'
                        ? (isBn ? 'ফর্মুলা ও স্টাডি নোটস' : 'Formulas & Study Notes')
                        : (isBn ? 'উপস্থিতি ও বিবরণ' : 'Attendance & Details')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSideTool(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors"
                  title={isBn ? 'প্যানেল বন্ধ করুন' : 'Close side panel'}
                  aria-label="Close side panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-3 bg-white">
                {sideTool === 'formulas' ? (
                  <ClassroomFormulasDrawer locale={locale} />
                ) : sideTool === 'attendance' ? (
                  <div className="max-w-2xl mx-auto py-2">
                    <AttendanceSection
                      session={session}
                      locale={locale}
                      isTutor={isTutor}
                      latestAttendance={latestAttendance}
                      selectedAttendanceStatus={selectedAttendanceStatus}
                      setSelectedAttendanceStatus={setSelectedAttendanceStatus}
                      attendanceNotes={attendanceNotes}
                      setAttendanceNotes={setAttendanceNotes}
                      correctionReason={correctionReason}
                      setCorrectionReason={setCorrectionReason}
                      attendanceSuccess={attendanceSuccess}
                      handleMarkAttendance={handleMarkAttendance}
                      isMarkingAttendance={isMarkingAttendance}
                    />
                  </div>
                ) : (
                  <InteractiveWhiteboard locale={locale} sessionTitle={subjectTitle} />
                )}
              </div>
            </div>
          )}
        </main>

        {/* Completion Modal - Light Mode */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-200 text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-slate-900">
                {isBn ? 'ক্লাস সমাপ্ত ঘোষণা করুন' : 'Complete Tutoring Class'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {isBn
                  ? 'ক্লাস সম্পন্ন হিসেবে চিহ্নিত করলে এসক্রো পেমেন্ট ছাড় এবং এটেনডেন্স রেকর্ড চূড়ান্ত করা হবে।'
                  : 'Marking session as completed finalizes attendance and releases escrow payment.'}
              </p>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={isBn ? 'ক্লাস সম্পর্কে কোনো মন্তব্য বা নোট লিখুন...' : 'Add completion notes...'}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs h-24 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCompletionModal(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCompleteClass}
                  isLoading={isCompleting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isBn ? 'নিশ্চিত করুন' : 'Confirm Complete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-slate-900">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={withLocale(`/sessions/${session.id}`, locale)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          data-testid="back-to-session-detail"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>{isBn ? 'সেশন বিবরণে ফিরে যান' : 'Back to Session Details'}</span>
        </Link>

        {/* Live Status Pill & Timer */}
        <div className="flex items-center gap-3">
          {session.status === 'in_progress' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-300 text-blue-900 text-xs font-black animate-pulse">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <span>{isBn ? 'লাইভ ক্লাস চলছে' : 'Live Session Active'}</span>
              <span>•</span>
              <span className="font-mono">{formatTimer(secondsElapsed)}</span>
            </div>
          ) : session.status === 'completed' ? (
            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1">
              {isBn ? 'ক্লাস সম্পন্ন' : 'Completed'}
            </Badge>
          ) : (
            <Badge className="bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold px-3 py-1">
              {isBn ? 'ক্লাসের জন্য নির্ধারিত' : 'Scheduled'}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-slate-200 shadow-md p-4 sm:p-6 md:p-8 text-slate-900">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-700 font-extrabold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>
                {isBn
                  ? 'অগ্রণী এডু ইন্টারেক্টিভ লাইভ ক্লাসরুম ও ভিডিও স্টুডিও'
                  : 'OgroniEdu Live Interactive Classroom & Video Studio'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {subjectTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">{isBn ? 'শিক্ষক:' : 'Tutor:'}</span>
                <strong className="text-slate-900 font-black">{tutorName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">{isBn ? 'শিক্ষার্থী:' : 'Student:'}</span>
                <strong className="text-slate-900 font-black">{studentName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {formatWeekdayDate(session.startsAt, locale)} (
                  {formatTime(session.startsAt, locale)})
                </span>
              </span>
            </div>
          </div>

          {/* Action Hub for Tutor / Student */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Join Video Conference Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveTab('video')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-2xl shadow-xs"
              data-testid="launch-meeting-btn"
            >
              <Video className="w-4 h-4" />
              <span>{isBn ? 'লাইভ ভিডিও ক্লাসরুম' : 'Live Video Classroom'}</span>
            </Button>

            {/* If meetingUrl exists, also allow external launch */}
            {session.meetingUrl && (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors text-xs flex items-center gap-1"
                title={isBn ? 'বাইরে মিটিং লিংক খুলুন' : 'Open meeting link externally'}
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </a>
            )}

            {/* Share / Copy Meeting Link */}
            {session.meetingUrl && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors text-xs flex items-center gap-1.5 font-bold"
                  title={isBn ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                  aria-label={isBn ? 'মিটিং লিংক কপি করুন' : 'Copy Meeting Link'}
                  data-testid="copy-meeting-link-btn"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-700" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedLink ? (isBn ? 'কপি হয়েছে' : 'Copied') : isBn ? 'লিংক কপি' : 'Copy'}
                  </span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `${isBn ? 'অগ্রণী এডু ক্লাসরুম লিংক:' : 'OgroniEdu Class Link:'} ${session.meetingUrl}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors text-xs flex items-center gap-1"
                  title={isBn ? 'হোয়াটসঅ্যাপে শেয়ার করুন' : 'Share on WhatsApp'}
                  aria-label={isBn ? 'হোয়াটসঅ্যাপে শেয়ার করুন' : 'Share on WhatsApp'}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-xs"
                data-testid="start-class-btn"
              >
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                {isBn ? 'ক্লাস শুরু করুন' : 'Start Class'}
              </Button>
            )}

            {isTutor && session.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => setShowCompletionModal(true)}
                isLoading={isCompleting}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-xs"
                data-testid="complete-class-btn"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                {isBn ? 'ক্লাস সম্পন্ন করুন' : 'Mark Completed'}
              </Button>
            )}

            {isTutor && (
              <button
                type="button"
                onClick={() => setIsEditingMeetingUrl(!isEditingMeetingUrl)}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                title={isBn ? 'মিটিং লিংক পরিবর্তন করুন' : 'Edit Meeting Link'}
                aria-label={isBn ? 'মিটিং লিংক পরিবর্তন করুন' : 'Edit Meeting Link'}
                data-testid="set-meeting-url-btn"
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
            className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2"
          >
            <Input
              type="url"
              required
              value={meetingUrlInput}
              onChange={(e) => setMeetingUrlInput(e.target.value)}
              placeholder="https://meet.jit.si/ogroni-... or https://meet.google.com/..."
              className="flex-1 h-9 rounded-xl border-slate-300 text-slate-900 bg-white"
              data-testid="meeting-url-input"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                size="sm"
                isLoading={isUpdatingUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-9 px-4"
                data-testid="save-meeting-url-btn"
              >
                {isBn ? 'সংরক্ষণ' : 'Save'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditingMeetingUrl(false)}
                className="border-slate-300 text-slate-700 text-xs rounded-xl h-9 px-3"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
            </div>
          </form>
        )}

        {/* Action Status Feedback */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold">
            {actionError}
          </div>
        )}
      </div>

      {/* Navigation Tabs & Split Screen Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto -mx-1 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'video'
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300/80'
            }`}
            data-testid="tab-video"
          >
            <Video className="w-4 h-4 text-blue-400" />
            <span>{isBn ? 'লাইভ ভিডিও ক্লাসরুম (LiveKit)' : 'Live Video Classroom (LiveKit)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whiteboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'whiteboard'
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300/80'
            }`}
            data-testid="tab-whiteboard"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{isBn ? 'ইন্টারেক্টিভ হোয়াইটবোর্ড' : 'Interactive Whiteboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'formulas'
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300/80'
            }`}
            data-testid="tab-formulas"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'ফর্মুলা ও স্টাডি নোটস' : 'Formulas & Study Notes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'attendance'
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300/80'
            }`}
            data-testid="tab-attendance"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>{isBn ? 'উপস্থিতি ও বিবরণ' : 'Attendance & Details'}</span>
          </button>
        </div>

        {/* Split Screen Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSplitMode(!isSplitMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border-2 transition-all ${
              isSplitMode
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
            title={isBn ? 'ভিডিও ও হোয়াইটবোর্ড একসাথে দেখুন' : 'View video and tools side-by-side'}
            data-testid="split-mode-toggle"
          >
            <Columns className="w-4 h-4 text-blue-500" />
            <span>
              {isSplitMode
                ? isBn
                  ? 'স্প্লিট মোড চালু'
                  : 'Split View Active'
                : isBn
                  ? 'স্প্লিট স্ক্রিন ভিউ'
                  : 'Split Screen'}
            </span>
          </button>
        </div>
      </div>

      {/* Workspace Content: Split View or Standalone Tab */}
      {isSplitMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="w-full">
            <LiveKitClassroomMeeting
              sessionId={session.id}
              bookingId={session.bookingId}
              locale={locale}
              displayName={activeParticipantName}
              userEmail={activeParticipantEmail}
              isTutor={isTutor}
            />
          </div>
          <div className="w-full">
            {activeTab === 'formulas' ? (
              <ClassroomFormulasDrawer locale={locale} />
            ) : activeTab === 'attendance' ? (
              <AttendanceSection
                session={session}
                locale={locale}
                isTutor={isTutor}
                latestAttendance={latestAttendance}
                selectedAttendanceStatus={selectedAttendanceStatus}
                setSelectedAttendanceStatus={setSelectedAttendanceStatus}
                attendanceNotes={attendanceNotes}
                setAttendanceNotes={setAttendanceNotes}
                correctionReason={correctionReason}
                setCorrectionReason={setCorrectionReason}
                attendanceSuccess={attendanceSuccess}
                handleMarkAttendance={handleMarkAttendance}
                isMarkingAttendance={isMarkingAttendance}
              />
            ) : (
              <InteractiveWhiteboard locale={locale} sessionTitle={subjectTitle} />
            )}
          </div>
        </div>
      ) : (
        /* Standalone View */
        <>
          {activeTab === 'video' && (
            <LiveKitClassroomMeeting
              sessionId={session.id}
              bookingId={session.bookingId}
              locale={locale}
              displayName={activeParticipantName}
              userEmail={activeParticipantEmail}
              isTutor={isTutor}
            />
          )}

          {activeTab === 'whiteboard' && (
            <InteractiveWhiteboard locale={locale} sessionTitle={subjectTitle} />
          )}

          {activeTab === 'formulas' && <ClassroomFormulasDrawer locale={locale} />}

          {activeTab === 'attendance' && (
            <AttendanceSection
              session={session}
              locale={locale}
              isTutor={isTutor}
              latestAttendance={latestAttendance}
              selectedAttendanceStatus={selectedAttendanceStatus}
              setSelectedAttendanceStatus={setSelectedAttendanceStatus}
              attendanceNotes={attendanceNotes}
              setAttendanceNotes={setAttendanceNotes}
              correctionReason={correctionReason}
              setCorrectionReason={setCorrectionReason}
              attendanceSuccess={attendanceSuccess}
              handleMarkAttendance={handleMarkAttendance}
              isMarkingAttendance={isMarkingAttendance}
            />
          )}
        </>
      )}

      {/* Class Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md w-full space-y-4 bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <DialogTitle className="text-lg font-black text-slate-900">
                {isBn ? 'ক্লাস সম্পন্ন করার নিশ্চিতকরণ' : 'Complete Tutoring Class'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 font-medium leading-relaxed">
              {isBn
                ? 'আপনি কি ক্লাসটি সম্পন্ন হিসেবে চিহ্নিত করতে চান? ক্লাসের উপর কোনো মন্তব্য বা অগ্রগতি নোট থাকলে লিখুন।'
                : 'Mark this session as completed. You may optionally add summary feedback or study recommendations.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="completion-notes-modal" className="text-xs text-slate-700 font-bold">
              {isBn ? 'ক্লাস রিভিউ ও মন্তব্য (ঐচ্ছিক):' : 'Session Notes (Optional):'}
            </Label>
            <Textarea
              id="completion-notes-modal"
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={
                isBn
                  ? 'যেমন: আজকের ক্লাসে গতিবিদ্যার গাণিতিক সমাধান অনুশীলন করা হয়েছে...'
                  : 'e.g. Covered kinematics problem set and Newton laws...'
              }
              className="border-slate-300 text-slate-900 text-xs rounded-xl"
              data-testid="completion-notes-textarea"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCompletionModal(false)}
              className="border-slate-300 text-slate-700 font-bold rounded-xl text-xs h-9"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCompleteClass}
              isLoading={isCompleting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-9 px-4"
              data-testid="confirm-complete-class-btn"
            >
              {isBn ? 'সম্পন্ন নিশ্চিত করুন' : 'Confirm Completion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AttendanceSectionProps {
  session: SessionItem;
  locale: 'bn' | 'en';
  isTutor: boolean;
  latestAttendance: {
    id: string;
    attendanceStatus: AttendanceStatus;
    recordedAt: string;
    notes?: string | null;
  } | null;
  selectedAttendanceStatus: AttendanceStatus;
  setSelectedAttendanceStatus: (st: AttendanceStatus) => void;
  attendanceNotes: string;
  setAttendanceNotes: (n: string) => void;
  correctionReason: string;
  setCorrectionReason: (r: string) => void;
  attendanceSuccess: boolean;
  handleMarkAttendance: (e: React.FormEvent) => Promise<void>;
  isMarkingAttendance: boolean;
}

function AttendanceSection({
  session,
  locale,
  isTutor,
  latestAttendance,
  selectedAttendanceStatus,
  setSelectedAttendanceStatus,
  attendanceNotes,
  setAttendanceNotes,
  correctionReason,
  setCorrectionReason,
  attendanceSuccess,
  handleMarkAttendance,
  isMarkingAttendance,
}: AttendanceSectionProps) {
  const isBn = locale === 'bn';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Attendance Status Card */}
      <Card className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <span>{isBn ? 'শিক্ষার্থীর হাজিরা / উপস্থিতি' : 'Student Attendance'}</span>
        </h3>
        <p className="text-xs text-slate-600 font-medium mb-4">
          {isBn
            ? 'উপস্থিতি নিশ্চিত করলে অভিভাবক ও শিক্ষার্থী অ্যাকাউন্টে তাৎক্ষণিক নোটিফিকেশন পাবেন।'
            : 'Recorded attendance triggers automated notifications to student & guardians.'}
        </p>

        {latestAttendance && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-bold">
                {isBn ? 'সর্বশেষ রেকর্ডকৃত স্ট্যাটাস:' : 'Recorded Status:'}
              </span>
              <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase font-bold">
                {latestAttendance.attendanceStatus}
              </Badge>
            </div>
            {latestAttendance.notes && (
              <p className="text-slate-700 italic font-medium">"{latestAttendance.notes}"</p>
            )}
            <div className="text-[10px] text-slate-500 font-medium text-right">
              {new Date(latestAttendance.recordedAt).toLocaleString(isBn ? 'bn-BD' : 'en-US')}
            </div>
          </div>
        )}

        {isTutor && (
          <form
            onSubmit={handleMarkAttendance}
            className="space-y-3"
            data-testid="classroom-mark-attendance-form"
          >
            <Label className="text-xs font-bold text-slate-700 block">
              {isBn ? 'উপস্থিতি নির্ধারণ করুন:' : 'Mark Attendance:'}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setSelectedAttendanceStatus(st)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    selectedAttendanceStatus === st
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid={`classroom-attendance-${st}`}
                >
                  {st === 'present'
                    ? isBn
                      ? 'উপস্থিত'
                      : 'Present'
                    : st === 'late'
                      ? isBn
                        ? 'দেরি'
                        : 'Late'
                      : st === 'absent'
                        ? isBn
                          ? 'অনুপস্থিত'
                          : 'Absent'
                        : isBn
                          ? 'ছুটি'
                          : 'Excused'}
                </button>
              ))}
            </div>

            {latestAttendance && (
              <div className="space-y-1">
                <Label
                  htmlFor="attendance-correction-reason"
                  className="text-xs font-bold text-slate-700"
                >
                  {isBn ? 'সংশোধনের কারণ (আবশ্যক):' : 'Correction reason (required):'}
                </Label>
                <Input
                  id="attendance-correction-reason"
                  type="text"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder={
                    isBn ? 'উপস্থিতি সংশোধনের কারণ লিখুন...' : 'Reason for updating attendance...'
                  }
                  className="w-full h-9 rounded-xl border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                  data-testid="attendance-correction-reason-input"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notes-inp" className="text-xs font-bold text-slate-700">
                {isBn ? 'ক্লাসের সক্রিয়তা বা মন্তব্য:' : 'Session remarks:'}
              </Label>
              <Input
                id="notes-inp"
                type="text"
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                placeholder={isBn ? 'যেমন: পাঠে মনোযোগ ছিল...' : 'e.g. Participated actively...'}
                className="w-full h-9 rounded-xl border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                data-testid="attendance-notes-input"
              />
            </div>

            {attendanceSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'উপস্থিতি সফলভাবে সংরক্ষিত!' : 'Attendance marked!'}</span>
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              isLoading={isMarkingAttendance}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9"
              data-testid="classroom-save-attendance-btn"
            >
              {isBn ? 'উপস্থিতি হালনাগাদ করুন' : 'Confirm Attendance'}
            </Button>
          </form>
        )}
      </Card>

      {/* Session Safety & Security Card */}
      <Card className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{isBn ? 'নিরাপত্তা ও এস্ক্রো প্রতিশ্রুতি' : 'Safety & Escrow Protection'}</span>
          </h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {isBn
              ? 'অগ্রণী এডুর ক্লাসরুম সেশন এন্ড-টু-এন্ড সুরক্ষিত। সেশন সম্পন্ন হওয়ার পর শিক্ষক ও শিক্ষার্থীর রিভিউয়ের ভিত্তিতে এস্ক্রো ফান্ড রিলিজ কার্যকর হয়।'
              : 'All sessions are monitored under OgroniEdu safety standards. Escrow milestone releases are executed upon verified session completion.'}
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-medium">
            <div className="flex items-center justify-between text-slate-600">
              <span>{isBn ? 'বুকিং আইডি:' : 'Booking ID:'}</span>
              <span className="font-mono text-slate-900 font-bold">
                {session.bookingId?.substring(0, 8)}...
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>{isBn ? 'ক্লাস আইডি:' : 'Session ID:'}</span>
              <span className="font-mono text-slate-900 font-bold">
                {session.id.substring(0, 8)}...
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>{isBn ? 'টাইমজোন:' : 'Timezone:'}</span>
              <span className="text-slate-900 font-bold">Asia/Dhaka (BST)</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <Link
            href={withLocale('/safety-reports', locale)}
            className="text-xs text-rose-700 hover:text-rose-900 font-bold inline-flex items-center gap-1"
          >
            {isBn ? 'জরুরি রিপোর্ট বা সহায়তা প্রয়োজন?' : 'Need to file a safety report?'}
          </Link>
        </div>
      </Card>
    </div>
  );
}
