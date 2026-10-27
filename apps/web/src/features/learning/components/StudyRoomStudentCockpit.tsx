'use client';

import React from 'react';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  BookOpen,
  ExternalLink,
  Flame,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';

interface StudyRoomStudentCockpitProps {
  locale: Locale;
  activeSubjectName?: string;
  meetingUrl?: string | null;
  tutorName?: string;
  streakDays?: number;
}

export function StudyRoomStudentCockpit({
  locale,
  activeSubjectName = 'উচ্চতর গণিত ও পদার্থবিজ্ঞান',
  meetingUrl,
  tutorName = 'ড. মো. আনিসুর রহমান',
  streakDays = 5,
}: StudyRoomStudentCockpitProps) {
  const isBn = locale === 'bn';

  // Pomodoro Focus Timer State
  const [timeLeft, setTimeLeft] = React.useState(25 * 60);
  const [isRunning, setIsRunning] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 shadow-lg border border-indigo-900/50 mb-6"
      data-testid="study-room-student-cockpit"
    >
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 -mb-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Subject & Learning Momentum */}
        <div className="flex flex-col gap-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isBn ? 'ডিজিটাল স্টাডি রুম' : 'Digital Study Room'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isBn
                  ? `${formatLocalizedNumber(streakDays, locale)} দিনের স্ট্রিক 🔥`
                  : `${streakDays}-day streak 🔥`}
              </span>
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {activeSubjectName}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 mt-1 leading-relaxed">
              {isBn
                ? `শিক্ষক: ${tutorName} • নিয়মিত ক্লাস নোট ও অ্যাসাইনমেন্ট অনুশীলন করুন।`
                : `Tutor: ${tutorName} • Regular lecture notes, homework and tests.`}
            </p>
          </div>

          {meetingUrl && (
            <div className="pt-1">
              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/30"
              >
                <Video className="w-3.5 h-3.5" />
                <span>{isBn ? 'লাইভ ক্লাসে যোগ দিন' : 'Join Live Class'}</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </a>
            </div>
          )}
        </div>

        {/* Right Side: Pomodoro Focus Study Timer */}
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col items-center justify-center shrink-0 min-w-[240px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
            {isBn ? 'পোমোডোরো ফোকাস স্টাডি' : 'Pomodoro Focus Timer'}
          </span>

          <div className="text-3xl font-black font-mono tracking-widest text-white my-1 tabular-nums">
            {formattedTime}
          </div>

          <p className="text-[10px] text-indigo-200/70 mb-3">
            {isRunning
              ? isBn
                ? 'মনোযোগ দিয়ে পড়ুন...'
                : 'Focusing...'
              : isBn
                ? '২৫ মিনিট মনোযোগ সেশন'
                : '25-minute deep focus'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTimer}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isBn ? 'বিরতি' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isBn ? 'শুরু করুন' : 'Start'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title={isBn ? 'রিসেট' : 'Reset'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
