'use client';

import React from 'react';
import {
  Shield,
  X,
  Radio,
  Hand,
  VolumeX,
  MicOff,
  UserX,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneOff,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { ClassroomAttendeeSummary } from '@ogroniedu/contracts';

export interface ClassroomModerationPanelProps {
  isOpen?: boolean;
  attendees: ClassroomAttendeeSummary[];
  locale?: 'bn' | 'en';
  onClose: () => void;
  onPromote: (identity: string, isStage: boolean) => void;
  onMute: (identity: string) => void;
  onKick: (identity: string) => void;
  onMuteAll?: () => void;
  onEndSession: () => void;
  isActionLoading?: boolean;
}

export function ClassroomModerationPanel({
  isOpen = true,
  attendees,
  locale = 'bn',
  onClose,
  onPromote,
  onMute,
  onKick,
  onMuteAll,
  onEndSession,
  isActionLoading = false,
}: ClassroomModerationPanelProps) {
  if (!isOpen) return null;

  const isBn = locale === 'bn';

  // Filter attendees by stage status
  const handRaisedAttendees = attendees.filter((a) => a.isHandRaised && !a.isStagePromoted);
  const stageAttendees = attendees.filter((a) => a.isStagePromoted && a.role !== 'HOST');

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border text-foreground z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200"
      data-testid="classroom-moderation-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground tracking-tight">
              {isBn ? 'হোস্ট মডারেশন কন্ট্রোল' : 'Host Moderation'}
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground">
              {isBn ? 'স্টেজ ও অংশগ্রহণকারী নিয়ন্ত্রণ' : 'Stage & audience controls'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-background">
        {/* Section 1: Hand-Raise Queue */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <Hand className="w-4 h-4 text-amber-600" />
              {isBn ? 'হাত তোলার আবেদন' : 'Hand Raise Requests'} ({handRaisedAttendees.length})
            </span>
          </div>

          {handRaisedAttendees.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium italic p-3.5 bg-card rounded-xl border border-border text-center">
              {isBn ? 'বর্তমানে কোনো শিক্ষার্থী হাত তোলেনি।' : 'No active hand-raise requests.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {handRaisedAttendees.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                  data-testid={`hand-raise-item-${student.participantIdentity}`}
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {student.participantName}
                    </p>
                    <p className="text-xs font-medium text-amber-600 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {isBn ? 'কথা বলার অনুমতি চাইছে' : 'Requested to speak'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => onPromote(student.participantIdentity, true)}
                      isLoading={isActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold min-h-[36px] px-3.5 rounded-xl shadow-xs active:scale-95"
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
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            {isBn ? 'স্টেজে সক্রিয় শিক্ষার্থী' : 'Active on Stage'} ({stageAttendees.length})
          </span>

          {stageAttendees.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium italic p-3.5 bg-card rounded-xl border border-border text-center">
              {isBn ? 'স্টেজে কোনো শিক্ষার্থী নেই।' : 'No students currently on stage.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {stageAttendees.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {student.participantName}
                    </p>
                    <p className="text-xs font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isBn ? 'মাইক/ভিডিও সক্রিয়' : 'Broadcasting on stage'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMute(student.participantIdentity)}
                      className="min-w-[36px] min-h-[36px] p-2 bg-card hover:bg-muted text-foreground rounded-xl text-xs font-semibold border border-border flex items-center justify-center active:scale-95 shadow-xs"
                      title={isBn ? 'মাইক বন্ধ করুন' : 'Mute'}
                    >
                      <MicOff className="w-4 h-4 text-destructive" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPromote(student.participantIdentity, false)}
                      className="min-h-[36px] p-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-semibold flex items-center gap-1 px-3 active:scale-95 shadow-xs"
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {isBn ? 'উপস্থিত শিক্ষার্থী রোস্টার' : 'Audience Roster'} ({attendees.length})
            </span>
            {onMuteAll && (
              <button
                type="button"
                onClick={onMuteAll}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 transition-all active:scale-95"
                data-testid="moderation-mute-all-btn"
                title={isBn ? 'সব শিক্ষার্থীর মাইক মিউট করুন' : 'Mute all students'}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{isBn ? 'সবাইকে মিউট' : 'Mute All'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {attendees.map((att) => (
              <div
                key={att.id}
                className="p-3 bg-card rounded-xl border border-border flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        att.connectionStatus === 'CONNECTED'
                          ? 'bg-emerald-500 shadow-xs'
                          : 'bg-muted-foreground/40'
                      }`}
                    />
                    <span className="font-semibold text-foreground text-xs sm:text-sm">
                      {att.participantName}
                    </span>
                    {att.role === 'HOST' && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold">
                        HOST
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {Math.round(att.totalDurationSeconds / 60)}{' '}
                    {isBn ? 'মিনিট উপস্থিত' : 'mins attended'}
                  </p>
                </div>

                {att.role !== 'HOST' && (
                  <button
                    type="button"
                    onClick={() => onKick(att.participantIdentity)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
      <div className="p-4 border-t border-border bg-card">
        <Button
          size="sm"
          onClick={onEndSession}
          className="w-full min-h-[44px] bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-98"
          data-testid="moderation-end-session-btn"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{isBn ? 'সবার জন্য ক্লাস শেষ ও উপস্থিতি সংরক্ষণ' : 'End Class for Everyone'}</span>
        </Button>
      </div>
    </div>
  );
}
