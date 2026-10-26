'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Hand,
  Users,
  MessageSquare,
  SwitchCamera,
  Sun,
  Wifi,
  WifiOff,
  Smile,
  MoreVertical,
  X,
} from 'lucide-react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

export interface ClassroomControlBarProps {
  isTutor: boolean;
  canPublish: boolean;
  locale?: 'bn' | 'en';
  isHandRaised: boolean;
  onToggleHandRaise: () => void;
  onToggleModeration: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  handRaiseCount?: number;
  lowDataMode: boolean;
  onToggleLowDataMode: () => void;
  onSendReaction?: (emoji: string) => void;
}

const REACTION_EMOJIS = ['👍', '👏', '❤️', '💡', '🔥', '✋'];

export function ClassroomControlBar({
  isTutor,
  canPublish,
  locale = 'bn',
  isHandRaised,
  onToggleHandRaise,
  onToggleModeration,
  onToggleChat,
  onLeave,
  handRaiseCount = 0,
  lowDataMode,
  onToggleLowDataMode,
  onSendReaction,
}: ClassroomControlBarProps) {
  const isBn = locale === 'bn';
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  // Screen Wake Lock API integration to prevent mobile screen from turning off during class
  useEffect(() => {
    let sentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !sentinel) {
          sentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
          setWakeLockActive(true);
          sentinel.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        }
      } catch {
        setWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !sentinel) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel) {
        sentinel.release().catch(() => {});
      }
    };
  }, []);

  // Keyboard shortcuts (M = Mic, V = Video, H = Hand, S = ScreenShare)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        if (canPublish) {
          localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (canPublish) {
          localParticipant.setCameraEnabled(!isCameraEnabled);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (!isTutor) {
          onToggleHandRaise();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPublish, isCameraEnabled, isMicrophoneEnabled, isTutor, localParticipant, onToggleHandRaise]);

  // Camera flip for mobile
  const handleCameraFlip = useCallback(async () => {
    if (!localParticipant || !canPublish) return;
    try {
      const nextMode = facingMode === 'user' ? 'environment' : 'user';
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length > 1) {
        const nextDevice =
          nextMode === 'environment'
            ? videoDevices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) ||
              videoDevices[1]
            : videoDevices[0];

        if (nextDevice) {
          await room.switchActiveDevice('videoinput', nextDevice.deviceId);
          setFacingMode(nextMode);
          return;
        }
      }

      await localParticipant.setCameraEnabled(false);
      await localParticipant.setCameraEnabled(true, {
        facingMode: nextMode,
      });
      setFacingMode(nextMode);
    } catch {
      // ignore
    }
  }, [canPublish, facingMode, localParticipant, room]);

  const handleEmojiClick = (emoji: string) => {
    onSendReaction?.(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div
      className="relative w-full flex items-center justify-between px-3 sm:px-6 py-3 bg-slate-950/98 backdrop-blur-xl border-t-2 border-slate-800 text-white rounded-b-3xl shadow-2xl z-30 select-none"
      data-testid="classroom-control-bar"
    >
      {/* Floating Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-slate-700 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-2xl animate-in zoom-in-95 duration-150 z-50">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition-transform p-1 rounded-full hover:bg-slate-800"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(false)}
            className="text-slate-400 hover:text-white p-1 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Left Section: Status & Utility Badges (Desktop) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLowDataMode}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${
            lowDataMode
              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
              : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title={isBn ? 'লো-ডাটা মোড' : 'Low Data Mode'}
          aria-label={isBn ? 'লো-ডাটা মোড' : 'Low Data Mode'}
          data-testid="low-data-mode-toggle"
        >
          {lowDataMode ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
          <span className="hidden md:inline font-bold">
            {lowDataMode ? (isBn ? 'লো-ডাটা' : 'Low-Data') : isBn ? 'এইচডি' : 'HD'}
          </span>
        </button>

        <div
          className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 ${
            wakeLockActive
              ? 'bg-blue-500/20 border-blue-400 text-blue-300'
              : 'bg-slate-800/90 border-slate-700 text-slate-400'
          }`}
          title={isBn ? 'স্ক্রিন অন রাখা হয়েছে' : 'Screen Wake Lock Active'}
        >
          <Sun className="w-4 h-4 text-amber-300" />
          <span className="hidden lg:inline">{isBn ? 'স্ক্রিন অন' : 'WakeLock'}</span>
        </div>
      </div>

      {/* Center Section: Primary Media & Participation Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Microphone Toggle */}
        <button
          type="button"
          disabled={!canPublish}
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className={`min-w-[46px] min-h-[46px] p-3 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center ${
            !canPublish
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              : isMicrophoneEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white ring-2 ring-emerald-500/80'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50'
          }`}
          title={
            !canPublish
              ? isBn
                ? 'মাইক অনুমোদিত নয়'
                : 'Microphone Restricted'
              : isMicrophoneEnabled
                ? isBn
                  ? 'মাইক বন্ধ করুন (M)'
                  : 'Mute Microphone (M)'
                : isBn
                  ? 'মাইক চালু করুন (M)'
                  : 'Unmute Microphone (M)'
          }
          aria-label={isMicrophoneEnabled ? 'Mute Mic' : 'Unmute Mic'}
          data-testid="control-mic-toggle"
        >
          {isMicrophoneEnabled ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          disabled={!canPublish}
          onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          className={`min-w-[46px] min-h-[46px] p-3 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center ${
            !canPublish
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              : isCameraEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white ring-2 ring-blue-500/80'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50'
          }`}
          title={
            !canPublish
              ? isBn
                ? 'ক্যামেরা অনুমোদিত নয়'
                : 'Camera Restricted'
              : isCameraEnabled
                ? isBn
                  ? 'ক্যামেরা বন্ধ করুন (V)'
                  : 'Turn Off Camera (V)'
                : isBn
                  ? 'ক্যামেরা চালু করুন (V)'
                  : 'Turn On Camera (V)'
          }
          aria-label={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          data-testid="control-camera-toggle"
        >
          {isCameraEnabled ? <VideoIcon className="w-5 h-5 text-blue-400" /> : <VideoOff className="w-5 h-5 text-white" />}
        </button>

        {/* Mobile Camera Flip Switch */}
        {canPublish && isCameraEnabled && (
          <button
            type="button"
            onClick={handleCameraFlip}
            className="min-w-[46px] min-h-[46px] p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors shadow-md sm:hidden active:scale-95 flex items-center justify-center border border-slate-700"
            title={isBn ? 'ক্যামেরা পরিবর্তন করুন' : 'Flip Camera'}
            aria-label={isBn ? 'ক্যামেরা পরিবর্তন করুন' : 'Flip Camera'}
            data-testid="control-flip-camera"
          >
            <SwitchCamera className="w-5 h-5 text-indigo-300" />
          </button>
        )}

        {/* Screen Share (Tutors or interactive students on desktop) */}
        {canPublish && (
          <button
            type="button"
            onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: true })}
            className={`min-w-[46px] min-h-[46px] p-3 rounded-2xl transition-all shadow-lg hidden sm:flex items-center justify-center active:scale-95 ${
              isScreenShareEnabled
                ? 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isBn ? 'স্ক্রিন শেয়ার করুন' : 'Share Screen'}
            aria-label={isBn ? 'স্ক্রিন শেয়ার করুন' : 'Share Screen'}
            data-testid="control-screen-share"
          >
            <ScreenShare className="w-5 h-5" />
          </button>
        )}

        {/* Emoji Reactions Trigger */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`min-w-[46px] min-h-[46px] p-3 rounded-2xl transition-all shadow-md flex items-center justify-center active:scale-95 ${
            showEmojiPicker
              ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isBn ? 'প্রতিক্রিয়া জানান' : 'Send Reaction'}
          aria-label={isBn ? 'প্রতিক্রিয়া জানান' : 'Send Reaction'}
        >
          <Smile className="w-5 h-5 text-amber-400" />
        </button>

        {/* Student Raise Hand Flow */}
        {!isTutor && (
          <button
            type="button"
            onClick={onToggleHandRaise}
            className={`min-w-[46px] min-h-[46px] p-3 rounded-2xl transition-all shadow-lg flex items-center gap-1.5 active:scale-95 ${
              isHandRaised
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black animate-bounce ring-4 ring-amber-300 shadow-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isHandRaised ? (isBn ? 'হাত নামান' : 'Lower Hand') : isBn ? 'কথা বলার জন্য হাত তুলুন' : 'Raise Hand to Speak'}
            aria-label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
            data-testid="control-raise-hand"
          >
            <Hand className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-black">
              {isHandRaised ? (isBn ? 'হাত তোলা আছে' : 'Hand Raised') : isBn ? 'হাত তুলুন' : 'Raise Hand'}
            </span>
          </button>
        )}

        {/* Tutor Moderation Hub */}
        {isTutor && (
          <button
            type="button"
            onClick={onToggleModeration}
            className="relative min-w-[46px] min-h-[46px] p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
            title={isBn ? 'মডারেশন ও হাত তোলার তালিকা' : 'Host Moderation Hub'}
            aria-label={isBn ? 'মডারেশন ও হাত তোলার তালিকা' : 'Host Moderation Hub'}
            data-testid="control-moderation-toggle"
          >
            <Users className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-bold">{isBn ? 'মডারেশন' : 'Manage'}</span>
            {handRaiseCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-black text-[11px] w-6 h-6 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950 shadow-md">
                {handRaiseCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Right Section: Chat & Disconnect */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleChat}
          className="min-w-[46px] min-h-[46px] p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors shadow-md border border-slate-700 flex items-center justify-center active:scale-95"
          title={isBn ? 'ক্লাস চ্যাট' : 'In-Class Chat'}
          aria-label={isBn ? 'ক্লাস চ্যাট' : 'In-Class Chat'}
          data-testid="control-chat-toggle"
        >
          <MessageSquare className="w-5 h-5 text-blue-400" />
        </button>

        <button
          type="button"
          onClick={onLeave}
          className="min-w-[46px] min-h-[46px] p-3 px-3.5 sm:px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/40 active:scale-95"
          title={isTutor ? (isBn ? 'সবার জন্য ক্লাস শেষ করুন' : 'End Class for All') : isBn ? 'ক্লাসরুম ত্যাগ করুন' : 'Leave Classroom'}
          aria-label={isTutor ? 'End Class' : 'Leave Classroom'}
          data-testid="control-leave-btn"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isTutor ? (isBn ? 'ক্লাস শেষ' : 'End') : isBn ? 'ত্যাগ' : 'Leave'}
          </span>
        </button>
      </div>
    </div>
  );
}
