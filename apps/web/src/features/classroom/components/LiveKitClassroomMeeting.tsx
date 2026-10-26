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
} from 'lucide-react';
import { PreJoinLobby } from './PreJoinLobby';
import { ClassroomControlBar } from './ClassroomControlBar';
import { ClassroomModerationPanel } from './ClassroomModerationPanel';
import { ClassroomChatPanel } from './ClassroomChatPanel';
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
import type { ClassroomJoinPayload, ClassroomMode } from '@ogroniedu/contracts';

export interface LiveKitClassroomMeetingProps {
  sessionId: string;
  bookingId?: string;
  locale?: 'bn' | 'en';
  displayName?: string;
  userEmail?: string;
  isTutor?: boolean;
  onMeetingEnded?: () => void;
  className?: string;
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
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

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
      }
    } catch {
      // Handled via joinError
    }
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = async () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    try {
      await raiseHandMutation({ sessionId, isHandRaised: next }).unwrap();
      refetchAttendees();
    } catch {
      setIsHandRaised(!next);
    }
  };

  // Moderation: Promote
  const handlePromote = async (participantIdentity: string, canPublish: boolean) => {
    try {
      await promoteMutation({ sessionId, participantIdentity, canPublish }).unwrap();
      refetchAttendees();
    } catch {
      // ignore
    }
  };

  // Moderation: Mute
  const handleMute = async (participantIdentity: string) => {
    try {
      await muteMutation({ sessionId, participantIdentity, muted: true }).unwrap();
    } catch {
      // ignore
    }
  };

  // Moderation: Kick
  const handleKick = async (participantIdentity: string) => {
    try {
      await kickMutation({ sessionId, participantIdentity, reason: 'Removed by host' }).unwrap();
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
    return (
      <div className={`w-full ${className}`} data-testid="livekit-classroom-container">
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
        />
      </div>
    );
  }

  // Active LiveKit Classroom Session
  return (
    <div
      className={`relative w-full h-[58vh] sm:h-[68vh] lg:h-[75vh] min-h-[360px] max-h-[85vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 flex flex-col ${className}`}
      data-testid="livekit-classroom-container"
    >
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
        {/* Authoritative Global Room Audio Renderer */}
        <RoomAudioRenderer />

        {/* Data Channel Reaction Handler */}
        <RoomDataListener onReaction={handleAddReaction} />

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
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
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
          onToggleHandRaise={handleToggleHandRaise}
          onToggleModeration={() => setIsModerationOpen(!isModerationOpen)}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onLeave={isTutor ? handleEndClassroom : () => setHasJoined(false)}
          handRaiseCount={attendees.filter((a) => a.isHandRaised).length}
          lowDataMode={lowDataMode}
          onToggleLowDataMode={() => setLowDataMode(!lowDataMode)}
          onSendReaction={(emoji) => handleAddReaction(emoji, displayName)}
        />

        {/* Tutor Moderation Drawer */}
        {isTutor && (
          <ClassroomModerationPanel
            isOpen={isModerationOpen}
            onClose={() => setIsModerationOpen(false)}
            locale={locale}
            attendees={attendees}
            onPromote={handlePromote}
            onMute={handleMute}
            onKick={handleKick}
            onEndSession={handleEndClassroom}
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
      </LiveKitRoom>
    </div>
  );
}

/**
 * Data channel listener component inside LiveKitRoom context
 */
function RoomDataListener({
  onReaction,
}: {
  onReaction: (emoji: string, sender: string) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;
    const decoder = new TextDecoder();
    const handleData = (payload: Uint8Array, participant?: Participant) => {
      try {
        const text = decoder.decode(payload);
        const data = JSON.parse(text);
        if (data.type === 'reaction' && data.emoji) {
          onReaction(data.emoji, participant?.name || participant?.identity || 'User');
        }
      } catch {
        // ignore non-json
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, onReaction]);

  return null;
}

/**
 * Enhanced video participant tile with visible high-contrast badges & speaking rings
 */
function EnhancedParticipantTile({
  trackRef,
  isMainStage = false,
}: {
  trackRef: any;
  isMainStage?: boolean;
}) {
  const participant = trackRef.participant;
  const isSpeaking = participant.isSpeaking;
  const isAudioMuted = !participant.isMicrophoneEnabled;
  const isVideoMuted = !participant.isCameraEnabled && trackRef.source === Track.Source.Camera;
  const displayName = participant.name || participant.identity || 'User';
  const isHost = participant.permissions?.canPublish && participant.metadata?.includes('HOST');

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden border-2 transition-all ${
        isSpeaking
          ? 'border-emerald-400 ring-4 ring-emerald-500/50 shadow-xl shadow-emerald-500/20'
          : 'border-slate-800'
      }`}
    >
      <TrackRefContext.Provider value={trackRef}>
        <ParticipantTile className="w-full h-full object-cover" />
      </TrackRefContext.Provider>

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
      </div>

      {/* Network Indicator in top right */}
      <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1 z-10">
        <Wifi className="w-3 h-3 text-emerald-400" />
      </div>
    </div>
  );
}

/**
 * Stage component with dual-mode responsive layouts:
 * Mode A: Small Group (symmetrical / dynamic grid).
 * Mode B: Large Batch (Stage focus + paginated participant strip).
 */
function ClassroomStage({
  mode,
  isTutor,
  locale,
  lowDataMode,
}: {
  mode: ClassroomMode;
  isTutor: boolean;
  locale?: 'bn' | 'en';
  lowDataMode: boolean;
}) {
  const isBn = locale === 'bn';

  // Subscribe to tracks
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Identify screen share track if any
  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  // Mode B: Large Batch Webinar Layout
  if (mode === 'LARGE_BATCH') {
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 items-center justify-center overflow-hidden">
        {/* Main Stage (Presenter / Screen Share) */}
        <div className="flex-1 w-full h-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-slate-800 flex items-center justify-center">
          {screenShareTrack ? (
            <EnhancedParticipantTile trackRef={screenShareTrack} isMainStage={true} />
          ) : cameraTracks.length > 0 ? (
            <EnhancedParticipantTile trackRef={cameraTracks[0]} isMainStage={true} />
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
                <EnhancedParticipantTile trackRef={trackRef} />
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
            <EnhancedParticipantTile trackRef={trackRef} />
          </div>
        ))
      )}
    </div>
  );
}
