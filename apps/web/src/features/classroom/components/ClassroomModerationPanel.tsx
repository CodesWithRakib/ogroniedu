'use client';

import React from 'react';
import {
  X,
  Shield,
  Hand,
  MicOff,
  UserX,
  ArrowUpRight,
  ArrowDownLeft,
  VolumeX,
  PhoneOff,
  Check,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { ClassroomAttendeeSummary } from '@ogroniedu/contracts';

export interface ClassroomModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: 'bn' | 'en';
  attendees: ClassroomAttendeeSummary[];
  onPromote: (identity: string, canPublish: boolean) => void;
  onMute: (identity: string) => void;
  onKick: (identity: string) => void;
  onEndSession: () => void;
  isActionLoading?: boolean;
}

export function ClassroomModerationPanel({
  isOpen,
  onClose,
  locale = 'bn',
  attendees,
  onPromote,
  onMute,
  onKick,
  onEndSession,
  isActionLoading = false,
}: ClassroomModerationPanelProps) {
  const isBn = locale === 'bn';

  if (!isOpen) return null;

  const handRaisedAttendees = attendees.filter((a) => a.isHandRaised && a.role === 'STUDENT');
  const stageAttendees = attendees.filter((a) => a.isStagePromoted && a.role === 'STUDENT');
  const audienceAttendees = attendees.filter(
    (a) => !a.isStagePromoted && a.role === 'STUDENT' && !a.isHandRaised,
  );

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950/98 backdrop-blur-2xl border-l-2 border-slate-800 text-white z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      data-testid="classroom-moderation-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-white tracking-tight">
              {isBn ? 'হোস্ট মডারেশন কন্ট্রোল' : 'Host Moderation'}
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              {isBn ? 'স্টেজ ও অংশগ্রহণকারী নিয়ন্ত্রণ' : 'Stage & audience controls'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          title={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: Hand-Raise Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Hand className="w-4 h-4" />
              {isBn ? 'হাত তোলার আবেদন' : 'Hand Raise Requests'} ({handRaisedAttendees.length})
            </span>
          </div>

          {handRaisedAttendees.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold italic p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
              {isBn ? 'বর্তমানে কোনো শিক্ষার্থী হাত তোলেনি।' : 'No active hand-raise requests.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {handRaisedAttendees.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  data-testid={`hand-raise-item-${student.participantIdentity}`}
                >
                  <div>
                    <p className="text-xs sm:text-sm font-black text-white">{student.participantName}</p>
                    <p className="text-xs font-bold text-amber-300 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      {isBn ? 'কথা বলার অনুমতি চাইছে' : 'Requested to speak'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => onPromote(student.participantIdentity, true)}
                      isLoading={isActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black min-h-[38px] px-3.5 rounded-xl shadow-md shadow-emerald-600/30 active:scale-95"
                      data-testid={`approve-stage-btn-${student.participantIdentity}`}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      {isBn ? 'স্টেজে আনুন' : 'Approve'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Promoted Students on Stage */}
        <div className="space-y-3">
          <span className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            {isBn ? 'স্টেজে সক্রিয় শিক্ষার্থী' : 'Active on Stage'} ({stageAttendees.length})
          </span>

          {stageAttendees.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold italic p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
              {isBn ? 'স্টেজে কোনো শিক্ষার্থী নেই।' : 'No students currently on stage.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {stageAttendees.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 bg-indigo-500/15 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-black text-white">{student.participantName}</p>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {isBn ? 'মাইক/ভিডিও সক্রিয়' : 'Broadcasting on stage'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMute(student.participantIdentity)}
                      className="min-w-[36px] min-h-[36px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center active:scale-95"
                      title={isBn ? 'মাইক বন্ধ করুন' : 'Mute'}
                    >
                      <MicOff className="w-4 h-4 text-rose-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPromote(student.participantIdentity, false)}
                      className="min-h-[36px] p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1 px-3 active:scale-95 shadow-md shadow-rose-600/30"
                      title={isBn ? 'স্টেজ থেকে সরান' : 'Demote from stage'}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>{isBn ? 'নামান' : 'Demote'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Audience & Attendance Roster */}
        <div className="space-y-3">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-400" />
            {isBn ? 'উপস্থিত শিক্ষার্থী রোস্টার' : 'Audience Roster'} ({attendees.length})
          </span>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {attendees.map((att) => (
              <div
                key={att.id}
                className="p-3 bg-slate-900/80 rounded-xl border-2 border-slate-800/80 flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        att.connectionStatus === 'CONNECTED' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-black text-slate-100 text-xs sm:text-sm">{att.participantName}</span>
                    {att.role === 'HOST' && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black">
                        HOST
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">
                    {Math.round(att.totalDurationSeconds / 60)} {isBn ? 'মিনিট উপস্থিত' : 'mins attended'}
                  </p>
                </div>

                {att.role !== 'HOST' && (
                  <button
                    type="button"
                    onClick={() => onKick(att.participantIdentity)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title={isBn ? 'রুম থেকে বহিষ্কার করুন' : 'Remove from room'}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: End Session */}
      <div className="p-4 border-t-2 border-slate-800 bg-slate-900/95">
        <Button
          size="sm"
          onClick={onEndSession}
          className="w-full min-h-[46px] bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 active:scale-98"
          data-testid="moderation-end-session-btn"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{isBn ? 'সবার জন্য ক্লাস শেষ ও উপস্থিতি সংরক্ষণ' : 'End Class for Everyone'}</span>
        </Button>
      </div>
    </div>
  );
}
