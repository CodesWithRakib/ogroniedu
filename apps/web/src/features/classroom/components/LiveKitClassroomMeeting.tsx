'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useRoomContext,
  ParticipantTile,
  TrackRefContext,
} from '@livekit/components-react';
import { Track, RoomEvent, ConnectionState, Participant } from 'livekit-client';
import {
  Video,
  Maximize2,
  Minimize2,
  AlertCircle,
  Volume2,
  Radio,
  Sparkles,
  ShieldAlert,
  Loader2,
  PhoneOff,
  Hand,
  Mic,
  MicOff,
  User,
  Shield,
  Wifi,
  PictureInPicture2,
  Sliders,
  Pin,
  PinOff,
  Tv,
  BarChart3,
} from 'lucide-react';
import { PreJoinLobby } from './PreJoinLobby';
import { ClassroomControlBar } from './ClassroomControlBar';
import { ClassroomModerationPanel } from './ClassroomModerationPanel';
import { ClassroomChatPanel } from './ClassroomChatPanel';
import { NetworkDiagnosticsModal } from './NetworkDiagnosticsModal';
import { AudioProcessingSettingsModal } from './AudioProcessingSettingsModal';
import { ClassroomPollModal, type ClassroomPoll } from './ClassroomPollModal';
import { classroomAudio } from '../utils/classroom-audio';
import {
  useJoinClassroomMutation,
  useRaiseHandMutation,
  usePromoteParticipantMutation,
  useMuteParticipantMutation,
  useKickParticipantMutation,
  useEndClassroomMutation,
  useGetClassroomAttendeesQuery,
  type ClassroomSessionInfo,
} from '@/store/services/classroom-api';
import type { ClassroomJoinPayload, ClassroomMode, ClassroomAttendeeSummary } from '@ogroniedu/contracts';

export interface LiveKitClassroomMeetingProps {
  sessionId: string;
  bookingId?: string;
  locale?: 'bn' | 'en';
  displayName?: string;
  userEmail?: string;
  isTutor?: boolean;
  onMeetingEnded?: () => void;
  className?: string;
  isStandalone?: boolean;
  subjectTitle?: string;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  sender: string;
  leftPercent: number;
}

export function LiveKitClassroomMeeting({
  sessionId,
  bookingId,
  locale = 'bn',
  displayName = 'OgroniEdu User',
  userEmail,
  isTutor = false,
  onMeetingEnded,
  className = '',
  isStandalone = false,
  subjectTitle,
}: LiveKitClassroomMeetingProps) {
  const isBn = locale === 'bn';

  // Join mutation & attendees query
  const [joinClassroom, { isLoading: isJoining, error: joinError }] = useJoinClassroomMutation();
  const [raiseHandMutation] = useRaiseHandMutation();
  const [promoteMutation, { isLoading: isPromoteLoading }] = usePromoteParticipantMutation();
  const [muteMutation] = useMuteParticipantMutation();
  const [kickMutation] = useKickParticipantMutation();
  const [endClassroomMutation] = useEndClassroomMutation();

  const { data: attendeesData, refetch: refetchAttendees } = useGetClassroomAttendeesQuery(
    sessionId,
    { pollingInterval: 4000 },
  );

  const attendees = useMemo(() => {
    return attendeesData?.data || [];
  }, [attendeesData]);

  const [hasJoined, setHasJoined] = useState(false);
  const [joinPayload, setJoinPayload] = useState<ClassroomJoinPayload | null>(null);
  const [initialSettings, setInitialSettings] = useState<{
    videoEnabled: boolean;
    audioEnabled: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
    lowDataMode: boolean;
  }>({
    videoEnabled: true,
    audioEnabled: true,
    lowDataMode: false,
  });

  const [isHandRaised, setIsHandRaised] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Handle Join Lobby
  const handleLobbyJoin = async (settings: {
    videoEnabled: boolean;
    audioEnabled: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
    lowDataMode: boolean;
  }) => {
    setInitialSettings(settings);
    setLowDataMode(settings.lowDataMode);

    try {
      const isMobile =
        typeof window !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      const res = await joinClassroom({
        sessionId,
        deviceInfo: {
          isMobile,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
      }).unwrap();

      if (res.data) {
        setJoinPayload(res.data);
        setHasJoined(true);
        classroomAudio.playJoinChime();
      }
    } catch {
      // Handled via joinError
    }
  };

  // Student Raise Hand
  const handleToggleHandRaise = async () => {
    try {
      const nextState = !isHandRaised;
      setIsHandRaised(nextState);
      await raiseHandMutation({ sessionId, isHandRaised: nextState }).unwrap();
      refetchAttendees();
    } catch {
      setIsHandRaised((prev) => !prev);
    }
  };

  // Moderation: Promote
  const handlePromote = async (identity: string, canPublish: boolean) => {
    try {
      await promoteMutation({ sessionId, participantIdentity: identity, canPublish }).unwrap();
      refetchAttendees();
    } catch {
      // ignore
    }
  };

  // Moderation: Mute Single
  const handleMute = async (identity: string) => {
    try {
      await muteMutation({ sessionId, participantIdentity: identity }).unwrap();
    } catch {
      // ignore
    }
  };

  // Moderation: Mute All Remote Students
  const handleMuteAll = async () => {
    const students = attendees.filter(
      (a) => a.role === 'STUDENT' && a.connectionStatus === 'CONNECTED',
    );
    for (const student of students) {
      try {
        await muteMutation({ sessionId, participantIdentity: student.participantIdentity }).unwrap();
      } catch {
        // ignore
      }
    }
  };

  // Moderation: Kick
  const handleKick = async (identity: string) => {
    try {
      await kickMutation({ sessionId, participantIdentity: identity }).unwrap();
      refetchAttendees();
    } catch {
      // ignore
    }
  };

  // Moderation: End
  const handleEndClassroom = async () => {
    try {
      await endClassroomMutation({ sessionId }).unwrap();
      setHasJoined(false);
      onMeetingEnded?.();
    } catch {
      // ignore
    }
  };

  if (kickedNotice) {
    return (
      <div
        className="w-full aspect-video min-h-[380px] bg-slate-950 rounded-3xl border-2 border-slate-800 flex flex-col items-center justify-center p-6 text-center text-white shadow-2xl"
        data-testid="classroom-kicked-state"
      >
        <ShieldAlert className="w-14 h-14 text-rose-500 mb-3" />
        <h3 className="text-lg font-black text-white">
          {isBn ? 'সেশন সমাপ্ত অথবা সংযোগ বিচ্ছিন্ন' : 'Disconnected from Classroom'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-md">{kickedNotice}</p>
      </div>
    );
  }

  // Pre-join Lobby View
  if (!hasJoined || !joinPayload) {
    const lobbyWrapperClasses = isStandalone
      ? `w-full h-full min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center p-3 sm:p-6 ${className}`
      : `w-full ${className}`;

    return (
      <div className={lobbyWrapperClasses} data-testid="livekit-classroom-container">
        {joinError && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl text-xs sm:text-sm flex items-center gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-extrabold text-rose-900">
                {isBn ? 'ক্লাসে প্রবেশ করা যায়নি:' : 'Could Not Enter Classroom:'}
              </p>
              <p className="font-semibold text-rose-800">
                {joinError && typeof joinError === 'object' && 'data' in joinError
                  ? ((joinError as { data?: { message?: string } }).data?.message ??
                    'Failed to join classroom')
                  : 'Connection failed'}
              </p>
            </div>
          </div>
        )}

        <PreJoinLobby
          displayName={displayName}
          isTutor={isTutor}
          locale={locale}
          onJoin={handleLobbyJoin}
          isLoading={isJoining}
          isStandalone={isStandalone}
          subjectTitle={subjectTitle}
        />
      </div>
    );
  }

  const containerClasses = isTheaterMode || isStandalone
    ? `relative w-full h-full flex-1 rounded-none border-none bg-slate-950 flex flex-col overflow-hidden ${className}`
    : `relative w-full h-[58vh] sm:h-[68vh] lg:h-[75vh] min-h-[360px] max-h-[85vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 flex flex-col ${className}`;

  // Active LiveKit Classroom Session
  return (
    <div className={containerClasses} data-testid="livekit-classroom-container">
      <LiveKitRoom
        token={joinPayload.token}
        serverUrl={joinPayload.serverUrl}
        connect={true}
        video={initialSettings.videoEnabled && joinPayload.canPublish}
        audio={initialSettings.audioEnabled && joinPayload.canPublish}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        data-lk-theme="default"
        className="flex-1 flex flex-col relative w-full h-full overflow-hidden"
        onDisconnected={() => {
          setHasJoined(false);
          onMeetingEnded?.();
        }}
      >
        <RoomAudioRenderer />

        <ClassroomSessionContent
          sessionId={sessionId}
          joinPayload={joinPayload}
          locale={locale}
          isBn={isBn}
          isTutor={isTutor}
          displayName={displayName}
          lowDataMode={lowDataMode}
          onToggleLowDataMode={() => setLowDataMode((prev) => !prev)}
          isHandRaised={isHandRaised}
          onToggleHandRaise={handleToggleHandRaise}
          attendees={attendees}
          onPromote={handlePromote}
          onMute={handleMute}
          onMuteAll={handleMuteAll}
          onKick={handleKick}
          onEndClassroom={handleEndClassroom}
          isPromoteLoading={isPromoteLoading}
          onLeaveRoom={() => setHasJoined(false)}
          noiseSuppression={noiseSuppression}
          onToggleNoiseSuppression={setNoiseSuppression}
          echoCancellation={echoCancellation}
          onToggleEchoCancellation={setEchoCancellation}
          soundEffectsEnabled={soundEffectsEnabled}
          onToggleSoundEffects={setSoundEffectsEnabled}
          isTheaterMode={isTheaterMode}
          onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
        />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Inner component inside LiveKitRoom context
 */
function ClassroomSessionContent({
  sessionId,
  joinPayload,
  locale,
  isBn,
  isTutor,
  displayName,
  lowDataMode,
  onToggleLowDataMode,
  isHandRaised,
  onToggleHandRaise,
  attendees,
  onPromote,
  onMute,
  onMuteAll,
  onKick,
  onEndClassroom,
  isPromoteLoading,
  onLeaveRoom,
  noiseSuppression,
  onToggleNoiseSuppression,
  echoCancellation,
  onToggleEchoCancellation,
  soundEffectsEnabled,
  onToggleSoundEffects,
  isTheaterMode,
  onToggleTheaterMode,
}: {
  sessionId: string;
  joinPayload: ClassroomJoinPayload;
  locale: 'bn' | 'en';
  isBn: boolean;
  isTutor: boolean;
  displayName: string;
  lowDataMode: boolean;
  onToggleLowDataMode: () => void;
  isHandRaised: boolean;
  onToggleHandRaise: () => void;
  attendees: ClassroomAttendeeSummary[];
  onPromote: (identity: string, canPublish: boolean) => void;
  onMute: (identity: string) => void;
  onMuteAll: () => void;
  onKick: (identity: string) => void;
  onEndClassroom: () => void;
  isPromoteLoading: boolean;
  onLeaveRoom: () => void;
  noiseSuppression: boolean;
  onToggleNoiseSuppression: (val: boolean) => void;
  echoCancellation: boolean;
  onToggleEchoCancellation: (val: boolean) => void;
  soundEffectsEnabled: boolean;
  onToggleSoundEffects: (val: boolean) => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
}) {
  const room = useRoomContext();

  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Pin / Spotlight state
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);

  // Poll & Quiz state
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [currentPoll, setCurrentPoll] = useState<ClassroomPoll | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [userVotedIndex, setUserVotedIndex] = useState<number | null>(null);

  const handleAddReaction = useCallback((emoji: string, sender: string) => {
    const newReaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      sender,
      leftPercent: 30 + Math.random() * 40,
    };
    setFloatingReactions((prev) => [...prev.slice(-12), newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  }, []);

  // LiveKit Data Channel Listener for Reactions & Polls
  useEffect(() => {
    if (!room) return;
    const decoder = new TextDecoder();
    const handleData = (payload: Uint8Array, participant?: Participant) => {
      try {
        const text = decoder.decode(payload);
        const data = JSON.parse(text);
        if (data.type === 'reaction' && data.emoji) {
          handleAddReaction(data.emoji, participant?.name || participant?.identity || 'User');
        } else if (data.type === 'poll:create' && data.poll) {
          setCurrentPoll(data.poll);
          setPollVotes({});
          setUserVotedIndex(null);
          classroomAudio.playChatMessageChime();
          if (!isTutor) {
            setIsPollModalOpen(true);
          }
        } else if (data.type === 'poll:vote' && data.pollId) {
          setPollVotes((prev) => ({
            ...prev,
            [data.voterIdentity || participant?.identity || 'anon']: data.optionIndex,
          }));
        } else if (data.type === 'poll:end') {
          setCurrentPoll((prev) => (prev ? { ...prev, isActive: false } : null));
        } else if (data.type === 'poll:share_results') {
          setCurrentPoll((prev) => (prev ? { ...prev, resultsShared: data.shared } : null));
        }
      } catch {
        // ignore non-json
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, handleAddReaction, isTutor]);

  // Poll Action: Launch New Poll (Tutor)
  const handleLaunchPoll = (question: string, options: string[], durationSeconds?: number) => {
    if (!room) return;
    const poll: ClassroomPoll = {
      id: `poll-${Date.now()}`,
      question,
      options,
      creatorName: displayName,
      creatorIdentity: room.localParticipant.identity,
      createdAt: Date.now(),
      durationSeconds,
      isActive: true,
      resultsShared: false,
    };
    setCurrentPoll(poll);
    setPollVotes({});
    setUserVotedIndex(null);

    const payload = JSON.stringify({ type: 'poll:create', poll });
    room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    classroomAudio.playChatMessageChime();
  };

  // Poll Action: Submit Vote (Student)
  const handleVotePoll = (optionIndex: number) => {
    if (!room || !currentPoll) return;
    setUserVotedIndex(optionIndex);
    setPollVotes((prev) => ({ ...prev, [room.localParticipant.identity]: optionIndex }));

    const payload = JSON.stringify({
      type: 'poll:vote',
      pollId: currentPoll.id,
      optionIndex,
      voterIdentity: room.localParticipant.identity,
    });
    room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
  };

  // Poll Action: End Poll (Tutor)
  const handleEndPoll = () => {
    if (!room || !currentPoll) return;
    setCurrentPoll((prev) => (prev ? { ...prev, isActive: false } : null));
    const payload = JSON.stringify({ type: 'poll:end', pollId: currentPoll.id });
    room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
  };

  // Poll Action: Share/Hide Results (Tutor)
  const handleToggleShareResults = (shared: boolean) => {
    if (!room || !currentPoll) return;
    setCurrentPoll((prev) => (prev ? { ...prev, resultsShared: shared } : null));
    const payload = JSON.stringify({ type: 'poll:share_results', pollId: currentPoll.id, shared });
    room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
  };

  // Pin Toggle
  const handleTogglePin = (identity: string) => {
    setPinnedIdentity((prev) => (prev === identity ? null : identity));
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  // Picture-in-Picture Toggle
  const togglePictureInPicture = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        const videoEl = document.querySelector(
          'div[data-testid="livekit-classroom-container"] video',
        ) as HTMLVideoElement;
        if (videoEl && typeof videoEl.requestPictureInPicture === 'function') {
          await videoEl.requestPictureInPicture();
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Top Header Overlay Bar */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between text-white z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse" />
          <span className="text-xs sm:text-sm font-black tracking-wide text-white drop-shadow-md">
            {joinPayload.subjectTitle || (isBn ? 'লাইভ ক্লাসরুম' : 'Live Classroom')}
          </span>
          <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black bg-slate-900/90 border border-slate-700 text-blue-300 shadow-md">
            {joinPayload.mode === 'LARGE_BATCH'
              ? isBn
                ? 'ওয়েবিনার মোড'
                : 'Webinar'
              : isBn
                ? 'ইন্টারেক্টিভ গ্রুপ'
                : 'Small Group'}
          </span>

          {/* Clickable Network Telemetry Pill */}
          <button
            type="button"
            onClick={() => setIsNetworkModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 shadow-md transition-all active:scale-95"
            title={isBn ? 'নেটওয়ার্ক ডায়াগনস্টিকস ও স্থিতি' : 'Network Diagnostics'}
            data-testid="network-telemetry-pill"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-300">২৮ ms</span>
          </button>

          {/* Active Poll Badge in Header if Poll running */}
          {currentPoll && currentPoll.isActive && (
            <button
              type="button"
              onClick={() => setIsPollModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow-md animate-pulse border border-amber-300"
              title={isBn ? 'চলমান পোল দেখুন' : 'View active poll'}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isBn ? 'পোল চলছে' : 'Poll Active'}</span>
            </button>
          )}

          {/* Theater Mode Indicator */}
          {isTheaterMode && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-900/90 border border-indigo-400 text-indigo-200 text-xs font-black shadow-md">
              <Tv className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isBn ? 'সিনেমা মোড' : 'Theater'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Picture-in-Picture Toggle */}
          <button
            type="button"
            onClick={togglePictureInPicture}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-colors shadow-md active:scale-95"
            title={isBn ? 'পিকচার-ইন-পিকচার (PiP)' : 'Picture-in-Picture'}
            aria-label="Picture-in-Picture"
            data-testid="toggle-pip-btn"
          >
            <PictureInPicture2 className="w-4 h-4 text-slate-300" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-colors shadow-md active:scale-95"
            title={isBn ? 'ফুলস্ক্রিন' : 'Fullscreen'}
            aria-label="Fullscreen"
            data-testid="toggle-fullscreen-btn"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Classroom Stage Layout */}
      <div className="flex-1 w-full h-full p-2 sm:p-4 pt-12 pb-16 flex items-center justify-center overflow-hidden relative">
        <ClassroomStage
          mode={joinPayload.mode}
          isTutor={isTutor}
          locale={locale}
          lowDataMode={lowDataMode}
          pinnedIdentity={pinnedIdentity}
          onTogglePin={handleTogglePin}
        />

        {/* Floating Emoji Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
          {floatingReactions.map((reaction) => (
            <div
              key={reaction.id}
              className="absolute bottom-4 text-3xl sm:text-4xl animate-float-up opacity-90 filter drop-shadow-lg"
              style={{ left: `${reaction.leftPercent}%` }}
            >
              {reaction.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Mobile-First Control Bar */}
      <ClassroomControlBar
        isTutor={isTutor}
        canPublish={joinPayload.canPublish}
        locale={locale}
        isHandRaised={isHandRaised}
        onToggleHandRaise={onToggleHandRaise}
        onToggleModeration={() => setIsModerationOpen(!isModerationOpen)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onLeave={isTutor ? onEndClassroom : onLeaveRoom}
        handRaiseCount={attendees.filter((a) => a.isHandRaised).length}
        lowDataMode={lowDataMode}
        onToggleLowDataMode={onToggleLowDataMode}
        onSendReaction={(emoji) => handleAddReaction(emoji, displayName)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onTogglePollModal={() => setIsPollModalOpen(!isPollModalOpen)}
        hasActivePoll={Boolean(currentPoll && currentPoll.isActive)}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={onToggleTheaterMode}
      />

      {/* Tutor Moderation Drawer */}
      {isTutor && (
        <ClassroomModerationPanel
          isOpen={isModerationOpen}
          onClose={() => setIsModerationOpen(false)}
          locale={locale}
          attendees={attendees}
          onPromote={onPromote}
          onMute={onMute}
          onMuteAll={onMuteAll}
          onKick={onKick}
          onEndSession={onEndClassroom}
          isActionLoading={isPromoteLoading}
        />
      )}

      {/* In-Room Real-Time Chat Drawer */}
      <ClassroomChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        locale={locale}
        displayName={displayName}
      />

      {/* Network Diagnostics Modal */}
      <NetworkDiagnosticsModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        locale={locale}
        latencyMs={28}
        packetLossPercent={0.0}
        qualityRating="excellent"
        lowDataMode={lowDataMode}
        onToggleLowDataMode={onToggleLowDataMode}
      />

      {/* Audio Processing & Hardware Settings Modal */}
      <AudioProcessingSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        locale={locale}
        noiseSuppression={noiseSuppression}
        onToggleNoiseSuppression={onToggleNoiseSuppression}
        echoCancellation={echoCancellation}
        onToggleEchoCancellation={onToggleEchoCancellation}
        soundEffectsEnabled={soundEffectsEnabled}
        onToggleSoundEffects={onToggleSoundEffects}
      />

      {/* In-Class Poll & Quiz Modal */}
      <ClassroomPollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        isTutor={isTutor}
        locale={locale}
        currentPoll={currentPoll}
        votes={pollVotes}
        userVotedIndex={userVotedIndex}
        onLaunchPoll={handleLaunchPoll}
        onVote={handleVotePoll}
        onEndPoll={handleEndPoll}
        onToggleShareResults={handleToggleShareResults}
      />
    </>
  );
}

/**
 * Enhanced video participant tile with visible high-contrast badges, pin button & speaking rings
 */
function EnhancedParticipantTile({
  trackRef,
  isMainStage = false,
  isPinned = false,
  onTogglePin,
}: {
  trackRef: any;
  isMainStage?: boolean;
  isPinned?: boolean;
  onTogglePin?: (identity: string) => void;
}) {
  const participant = trackRef.participant;
  const isSpeaking = participant.isSpeaking;
  const isAudioMuted = !participant.isMicrophoneEnabled;
  const displayName = participant.name || participant.identity || 'User';
  const isHost = participant.permissions?.canPublish && participant.metadata?.includes('HOST');

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden border-2 transition-all ${
        isSpeaking
          ? 'border-emerald-400 ring-4 ring-emerald-500/50 shadow-xl shadow-emerald-500/20'
          : isPinned
            ? 'border-amber-400 ring-4 ring-amber-500/40 shadow-xl'
            : 'border-slate-800'
      }`}
    >
      <TrackRefContext.Provider value={trackRef}>
        <ParticipantTile className="w-full h-full object-cover" />
      </TrackRefContext.Provider>

      {/* Top action bar on tile: Pin / Spotlight & Network */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(participant.identity);
            }}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all shadow-md active:scale-90 ${
              isPinned
                ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
                : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-700/60'
            }`}
            title={isPinned ? 'আনপিন করুন' : 'স্পটলাইটে পিন করুন'}
            data-testid={`pin-tile-${participant.identity}`}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}
        <div className="bg-slate-950/80 backdrop-blur-xs px-2 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-1">
          <Wifi className="w-3 h-3 text-emerald-400" />
        </div>
      </div>

      {/* High-Contrast Participant Name Pill */}
      <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white flex items-center gap-2 shadow-lg z-10">
        {isAudioMuted ? (
          <MicOff className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}`} />
        )}
        <span className="text-xs font-black truncate max-w-[120px] sm:max-w-[180px]">
          {displayName}
        </span>
        {isHost && (
          <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black tracking-wider">
            HOST
          </span>
        )}
        {isPinned && (
          <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded text-[9px] font-black tracking-wider">
            PINNED
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Stage component with dual-mode responsive layouts and Spotlight Pinning
 */
function ClassroomStage({
  mode,
  isTutor,
  locale,
  lowDataMode,
  pinnedIdentity,
  onTogglePin,
}: {
  mode: ClassroomMode;
  isTutor: boolean;
  locale?: 'bn' | 'en';
  lowDataMode: boolean;
  pinnedIdentity?: string | null;
  onTogglePin?: (identity: string) => void;
}) {
  const isBn = locale === 'bn';

  // Subscribe to tracks
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Identify screen share track if any
  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const pinnedTrack = pinnedIdentity ? tracks.find((t) => t.participant.identity === pinnedIdentity) : null;
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  // Priority 1: Screen Share is Active (in ANY mode!)
  // Takes hero stage (80-85% screen real estate) with aspect-ratio preserved & zero cropping
  if (screenShareTrack) {
    const isPresenterLocal = screenShareTrack.participant.isLocal;
    const presenterName =
      screenShareTrack.participant.name ||
      screenShareTrack.participant.identity ||
      (isBn ? 'উপস্থাপক' : 'Presenter');

    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-3 items-center justify-center overflow-hidden p-1 sm:p-2">
        {/* Main Stage: Screen Share (80-85% screen space) */}
        <div className="flex-1 w-full h-full min-h-0 bg-slate-950 rounded-2xl overflow-hidden relative border-2 border-blue-500/80 shadow-2xl flex items-center justify-center">
          <TrackRefContext.Provider value={screenShareTrack}>
            <ParticipantTile className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain [&_video]:max-h-full" />
          </TrackRefContext.Provider>

          {/* Presentation label banner */}
          <div className="absolute top-3 left-3 bg-blue-600/95 text-white text-xs font-black px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-lg border border-blue-400/40 z-20 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {isPresenterLocal
                ? isBn
                  ? 'আপনি স্ক্রিন শেয়ার করছেন'
                  : 'You are presenting your screen'
                : `${presenterName} ${isBn ? 'স্ক্রিন শেয়ার করছেন' : 'is presenting'}`}
            </span>
          </div>
        </div>

        {/* Participant Camera Tiles Filmstrip */}
        {cameraTracks.length > 0 && (
          <div className="w-full lg:w-64 h-28 lg:h-full flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto shrink-0 pb-1 lg:pb-0 justify-center lg:justify-start">
            {cameraTracks.map((trackRef) => (
              <div
                key={trackRef.publication?.trackSid || trackRef.participant.identity}
                className="w-44 lg:w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 shadow-md border border-slate-800"
              >
                <EnhancedParticipantTile
                  trackRef={trackRef}
                  isPinned={pinnedIdentity === trackRef.participant.identity}
                  onTogglePin={onTogglePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If a participant is pinned, render that participant on the hero stage!
  if (pinnedTrack) {
    const remainingTracks = tracks.filter(
      (t) =>
        (t.publication?.trackSid || t.participant.identity) !==
        (pinnedTrack.publication?.trackSid || pinnedTrack.participant.identity),
    );

    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 items-center justify-center overflow-hidden">
        {/* Pinned Hero Stage */}
        <div className="flex-1 w-full h-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-amber-500/60 shadow-2xl flex items-center justify-center">
          <EnhancedParticipantTile
            trackRef={pinnedTrack}
            isMainStage={true}
            isPinned={true}
            onTogglePin={onTogglePin}
          />
          <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg border border-amber-300 z-20 flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5" />
            <span>{isBn ? 'স্পটলাইট / পিন করা' : 'Spotlight / Pinned'}</span>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {remainingTracks.length > 0 && (
          <div className="w-full md:w-60 h-28 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto shrink-0 pb-1 md:pb-0">
            {remainingTracks.slice(0, 4).map((trackRef) => (
              <div
                key={trackRef.publication?.trackSid || trackRef.participant.identity}
                className="w-44 md:w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 shadow-md"
              >
                <EnhancedParticipantTile
                  trackRef={trackRef}
                  isPinned={false}
                  onTogglePin={onTogglePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mode B: Large Batch Webinar Layout
  if (mode === 'LARGE_BATCH') {
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 items-center justify-center overflow-hidden">
        {/* Main Stage (Presenter / Screen Share) */}
        <div className="flex-1 w-full h-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-slate-800 flex items-center justify-center">
          {screenShareTrack ? (
            <EnhancedParticipantTile
              trackRef={screenShareTrack}
              isMainStage={true}
              onTogglePin={onTogglePin}
            />
          ) : cameraTracks.length > 0 ? (
            <EnhancedParticipantTile
              trackRef={cameraTracks[0]}
              isMainStage={true}
              onTogglePin={onTogglePin}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 p-6 text-center">
              <Radio className="w-12 h-12 text-indigo-400 animate-pulse mb-3" />
              <p className="text-sm font-black text-white">
                {isBn ? 'শিক্ষক এখনো ভিডিও চালু করেননি' : 'Tutor has not started video yet'}
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                {isBn ? 'ক্লাস লাইভ রয়েছে, অডিও শুনুন' : 'Session is live, listening for audio'}
              </p>
            </div>
          )}

          {screenShareTrack && (
            <div className="absolute top-3 left-3 bg-blue-600/95 text-white text-xs font-black px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg border border-blue-400/40 z-20">
              {isBn ? 'স্ক্রিন শেয়ারিং চলছে' : 'Screen Share Active'}
            </div>
          )}
        </div>

        {/* Promoted / Co-presenter strip (Virtualize - max 3 displayed) */}
        {cameraTracks.length > 1 && (
          <div className="w-full md:w-60 h-28 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto shrink-0 pb-1 md:pb-0">
            {cameraTracks.slice(1, 4).map((trackRef) => (
              <div
                key={trackRef.publication?.trackSid || trackRef.participant.identity}
                className="w-44 md:w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 shadow-md"
              >
                <EnhancedParticipantTile
                  trackRef={trackRef}
                  onTogglePin={onTogglePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mode A: Small Group Adaptive Grid Layout (1-6 participants)
  const gridColsClass =
    tracks.length <= 1
      ? 'grid-cols-1'
      : tracks.length <= 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : tracks.length <= 4
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div
      className={`w-full h-full grid ${gridColsClass} gap-3 sm:gap-4 items-center justify-center overflow-hidden`}
    >
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-slate-300 p-6 text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-black text-white">
            {isBn ? 'ক্লাসরুম সংযোগ স্থাপিত হচ্ছে...' : 'Connecting to LiveKit room...'}
          </p>
        </div>
      ) : (
        tracks.map((trackRef) => (
          <div
            key={trackRef.publication?.trackSid || trackRef.participant.identity}
            className="w-full h-full max-h-[75vh] bg-slate-900 rounded-2xl overflow-hidden shadow-xl relative"
          >
            <EnhancedParticipantTile
              trackRef={trackRef}
              isPinned={pinnedIdentity === trackRef.participant.identity}
              onTogglePin={onTogglePin}
            />
          </div>
        ))
      )}
    </div>
  );
}
