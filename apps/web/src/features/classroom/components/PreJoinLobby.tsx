'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Settings,
  Volume2,
  Sparkles,
  ShieldCheck,
  Video,
  AlertTriangle,
  ArrowRight,
  Wifi,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';

export interface PreJoinLobbyProps {
  displayName: string;
  isTutor: boolean;
  locale?: 'bn' | 'en';
  onJoin: (settings: {
    videoEnabled: boolean;
    audioEnabled: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
    lowDataMode: boolean;
  }) => void;
  isLoading?: boolean;
}

export function PreJoinLobby({
  displayName,
  isTutor,
  locale = 'bn',
  onJoin,
  isLoading = false,
}: PreJoinLobbyProps) {
  const isBn = locale === 'bn';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });

  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize media devices & preview stream
  const startPreview = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }

      const constraints: MediaStreamConstraints = {
        video: videoEnabled
          ? selectedVideoDevice
            ? { deviceId: { exact: selectedVideoDevice } }
            : { width: { ideal: 640 }, height: { ideal: 360 } }
          : false,
        audio: audioEnabled
          ? selectedAudioDevice
            ? { deviceId: { exact: selectedAudioDevice } }
            : true
          : false,
      };

      if (!videoEnabled && !audioEnabled) {
        if (videoRef.current) videoRef.current.srcObject = null;
        setAudioLevel(0);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current && videoEnabled) {
        videoRef.current.srcObject = stream;
      }

      // Audio meter via Web Audio API
      if (audioEnabled && stream.getAudioTracks().length > 0) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
          }
          animationFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } else {
        setAudioLevel(0);
      }

      // Enumerate available hardware devices
      const enumerated = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: enumerated.filter((d) => d.kind === 'audioinput'),
        videoInputs: enumerated.filter((d) => d.kind === 'videoinput'),
      });
      setPermissionError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPermissionError(msg);
    }
  }, [videoEnabled, audioEnabled, selectedAudioDevice, selectedVideoDevice]);

  useEffect(() => {
    startPreview();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [startPreview]);

  const toggleVideo = () => setVideoEnabled((prev) => !prev);
  const toggleAudio = () => setAudioEnabled((prev) => !prev);

  const handleJoinClick = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    onJoin({
      videoEnabled,
      audioEnabled,
      audioDeviceId: selectedAudioDevice || undefined,
      videoDeviceId: selectedVideoDevice || undefined,
      lowDataMode,
    });
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto p-4 sm:p-7 bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden"
      data-testid="prejoin-lobby"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isBn ? 'ক্লাসরুম গ্রিন রুম / লবি' : 'Classroom Green Room'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            {isBn
              ? `স্বাগতম, ${displayName}! ক্লাসে যোগদানের পূর্বে অডিও ও ক্যামেরা পরীক্ষা করুন।`
              : `Welcome, ${displayName}! Check your devices before entering the session.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 font-bold text-xs transition-all shadow-xs ${
            showSettings
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
          }`}
          title={isBn ? 'ডিভাইস সেটিংস' : 'Device Settings'}
          aria-label={isBn ? 'ডিভাইস সেটিংস' : 'Device Settings'}
        >
          <Settings className="w-4 h-4" />
          <span>{isBn ? 'ডিভাইস সেটিংস' : 'Settings'}</span>
        </button>
      </div>

      {permissionError && (
        <div className="mb-5 p-4 bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-2xl text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-amber-900">
              {isBn ? 'ক্যামেরা বা মাইক্রোফোন অনুমোদন প্রয়োজন:' : 'Device Permission Notice:'}
            </p>
            <p className="font-medium text-amber-800 mt-0.5">
              {isBn
                ? 'ব্রাউজার সেটিংস থেকে ক্যামেরা এবং মাইক্রোফোনের অনুমতি প্রদান করুন যাতে ক্লাসে কথা বলা যায়।'
                : 'Please allow camera and microphone access in your browser to participate fully.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Preview on Left, Join Actions on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Video Preview Box */}
        <div className="md:col-span-7 relative w-full aspect-video min-h-[220px] sm:min-h-[280px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 flex items-center justify-center">
          {videoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-3 shadow-inner">
                <CameraOff className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-black text-white">
                {isBn ? 'ক্যামেরা বন্ধ আছে' : 'Camera is Turned Off'}
              </p>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {isBn ? 'আপনি অডিও-অনলি মোডে যোগদান করতে পারবেন' : 'You will join as audio-only'}
              </p>
            </div>
          )}

          {/* Audio Level Indicator overlay */}
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700 shadow-md">
            {audioEnabled ? (
              <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <MicOff className="w-4 h-4 text-rose-400" />
            )}
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 transition-all duration-75"
                style={{ width: `${audioEnabled ? audioLevel : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-slate-200 min-w-7">
              {audioEnabled ? `${audioLevel}%` : (isBn ? 'মিউট' : 'Muted')}
            </span>
          </div>

          {/* Quick toggle overlay on preview */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-xl">
            <button
              type="button"
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-all shadow-md active:scale-95 ${
                audioEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-white ring-2 ring-emerald-500/60'
                  : 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400'
              }`}
              title={audioEnabled ? (isBn ? 'মাইক বন্ধ করুন' : 'Mute') : isBn ? 'মাইক চালু করুন' : 'Unmute'}
              aria-label={audioEnabled ? 'Mute' : 'Unmute'}
              data-testid="lobby-mic-toggle"
            >
              {audioEnabled ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5 text-white" />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all shadow-md active:scale-95 ${
                videoEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-white ring-2 ring-blue-500/60'
                  : 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400'
              }`}
              title={videoEnabled ? (isBn ? 'ক্যামেরা বন্ধ করুন' : 'Turn Off Camera') : isBn ? 'ক্যামেরা চালু করুন' : 'Turn On Camera'}
              aria-label={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              data-testid="lobby-camera-toggle"
            >
              {videoEnabled ? <Camera className="w-5 h-5 text-blue-400" /> : <CameraOff className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Right Column: Readiness checklist & Join button */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200/90 space-y-2.5">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                {isBn ? 'ক্লাসরুম তথ্য ও প্রস্তুতি' : 'Classroom Readiness'}
              </span>

              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {isBn ? 'ভূমিকা' : 'Role'}
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg font-black text-xs">
                  {isTutor ? (isBn ? 'শিক্ষক / হোস্ট' : 'Tutor / Host') : isBn ? 'শিক্ষার্থী' : 'Student'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-indigo-600" />
                  {isBn ? 'ক্লাউড নেটওয়ার্ক' : 'Network Mode'}
                </span>
                <span className="text-emerald-700 font-black text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isBn ? 'এসএফইউ প্রস্তুত' : 'SFU Cloud Ready'}
                </span>
              </div>
            </div>

            {/* Mobile Data Saver Toggle */}
            <label className="flex items-center justify-between p-3.5 bg-blue-50/80 hover:bg-blue-50 border-2 border-blue-200 rounded-2xl cursor-pointer transition-colors shadow-2xs">
              <div className="pr-2">
                <p className="text-xs sm:text-sm font-black text-blue-950">
                  {isBn ? 'লো-ডাটা / অডিও-ফার্স্ট মোড' : 'Low-Data / Audio First'}
                </p>
                <p className="text-xs text-blue-800/90 font-semibold mt-0.5">
                  {isBn ? 'দুর্বল ৩জি/৪জি মোবাইল ডাটাতে ব্যান্ডউইথ সাশ্রয় করুন' : 'Conserves bandwidth on 3G/4G networks'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={lowDataMode}
                onChange={(e) => setLowDataMode(e.target.checked)}
                className="w-5 h-5 rounded-md text-blue-600 border-2 border-blue-400 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Join Classroom CTA Button */}
          <Button
            type="button"
            size="lg"
            onClick={handleJoinClick}
            isLoading={isLoading}
            className="w-full min-h-[52px] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm sm:text-base py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2.5 active:scale-98"
            data-testid="join-classroom-btn"
          >
            <Video className="w-5 h-5" />
            <span>{isBn ? 'ক্লাসরুমে প্রবেশ করুন' : 'Join Classroom Now'}</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Expandable Device Settings Drawer */}
      {showSettings && (
        <div className="mt-6 pt-5 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-xs sm:text-sm font-black text-slate-900 mb-2">
              {isBn ? 'ক্যামেরা নির্বাচন' : 'Select Camera'}
            </label>
            <select
              value={selectedVideoDevice}
              onChange={(e) => setSelectedVideoDevice(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 min-h-[46px] rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {devices.videoInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-black text-slate-900 mb-2">
              {isBn ? 'মাইক্রোফোন নির্বাচন' : 'Select Microphone'}
            </label>
            <select
              value={selectedAudioDevice}
              onChange={(e) => setSelectedAudioDevice(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 min-h-[46px] rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {devices.audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
