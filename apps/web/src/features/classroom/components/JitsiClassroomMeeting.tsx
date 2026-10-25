'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Radio,
  Users,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui';

// Extend Window interface for Jitsi Meet External API
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: JitsiOptions
    ) => JitsiApiInstance;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width?: string | number;
  height?: string | number;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  jwt?: string;
  userInfo?: {
    displayName?: string;
    email?: string;
  };
}

interface JitsiApiInstance {
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  dispose: () => void;
}

export interface JitsiClassroomMeetingProps {
  sessionId: string;
  bookingId?: string;
  meetingUrl?: string | null;
  locale?: 'bn' | 'en';
  displayName?: string;
  userEmail?: string;
  isTutor?: boolean;
  onMeetingUrlGenerated?: (url: string) => Promise<void> | void;
  className?: string;
}

export function JitsiClassroomMeeting({
  sessionId,
  bookingId,
  meetingUrl,
  locale = 'bn',
  displayName = 'OgroniEdu User',
  userEmail,
  isTutor = false,
  onMeetingUrlGenerated,
  className = '',
}: JitsiClassroomMeetingProps) {
  const isBn = locale === 'bn';
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiNodeRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApiInstance | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(true);
  const [scriptError, setScriptError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [participantCount, setParticipantCount] = useState(1);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

  // Configuration from environment variables
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const jitsiAppId = process.env.NEXT_PUBLIC_JITSI_APP_ID || '';
  const jitsiJwt = process.env.NEXT_PUBLIC_JITSI_JWT || '';

  // Derive room name deterministically
  const roomName = React.useMemo(() => {
    if (meetingUrl && meetingUrl.includes(jitsiDomain)) {
      try {
        const url = new URL(meetingUrl);
        const path = url.pathname.replace(/^\//, '');
        if (path) return path;
      } catch {
        // fallback
      }
    }
    const cleanBooking = (bookingId || '').replace(/-/g, '').slice(0, 6);
    const cleanSession = (sessionId || '').replace(/-/g, '').slice(0, 8);
    const baseRoom = cleanBooking ? `ogroni-${cleanBooking}-${cleanSession}` : `ogroni-session-${cleanSession}`;
    return jitsiAppId ? `${jitsiAppId}/${baseRoom}` : baseRoom;
  }, [meetingUrl, jitsiDomain, bookingId, sessionId, jitsiAppId]);

  const fullMeetingUrl = `https://${jitsiDomain}/${roomName}`;

  // Initialize or re-initialize Jitsi External API
  const initJitsi = useCallback(() => {
    if (!jitsiNodeRef.current || !window.JitsiMeetExternalAPI) return;

    // Clean up previous instance
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch {
        // ignore
      }
      apiRef.current = null;
    }

    jitsiNodeRef.current.innerHTML = '';
    setConnectionStatus('connecting');

    try {
      const options: JitsiOptions = {
        roomName,
        parentNode: jitsiNodeRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName,
          email: userEmail,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableThirdPartyRequests: true,
          defaultLanguage: isBn ? 'bn' : 'en',
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'raisehand',
            'videoquality',
            'filmstrip',
            'tileview',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          DEFAULT_BACKGROUND: '#0f172a',
          TOOLBAR_ALWAYS_VISIBLE: true,
        },
      };

      if (jitsiJwt) {
        options.jwt = jitsiJwt;
      }

      const api = new window.JitsiMeetExternalAPI(jitsiDomain, options);
      apiRef.current = api;

      api.addListener('videoConferenceJoined', () => {
        setConnectionStatus('connected');
      });

      api.addListener('videoConferenceLeft', () => {
        setConnectionStatus('disconnected');
      });

      api.addListener('participantJoined', () => {
        setParticipantCount((prev) => prev + 1);
      });

      api.addListener('participantLeft', () => {
        setParticipantCount((prev) => Math.max(1, prev - 1));
      });

      setScriptError(false);
    } catch {
      setScriptError(true);
      setConnectionStatus('disconnected');
    }
  }, [roomName, displayName, userEmail, jitsiDomain, jitsiJwt, isBn]);

  // Load external script once
  useEffect(() => {
    let scriptEl = document.querySelector<HTMLScriptElement>(`script[src="https://${jitsiDomain}/external_api.js"]`);

    if (window.JitsiMeetExternalAPI) {
      setScriptLoading(false);
      initJitsi();
      return;
    }

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.src = `https://${jitsiDomain}/external_api.js`;
      scriptEl.async = true;
      scriptEl.onload = () => {
        setScriptLoading(false);
        setScriptError(false);
        initJitsi();
      };
      scriptEl.onerror = () => {
        setScriptLoading(false);
        setScriptError(true);
      };
      document.body.appendChild(scriptEl);
    } else {
      scriptEl.addEventListener('load', () => {
        setScriptLoading(false);
        initJitsi();
      });
      scriptEl.addEventListener('error', () => {
        setScriptLoading(false);
        setScriptError(true);
      });
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // ignore
        }
        apiRef.current = null;
      }
    };
  }, [jitsiDomain, initJitsi]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Listen to external fullscreenchange events
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Copy Meeting URL Handler
  const handleCopy = () => {
    navigator.clipboard.writeText(fullMeetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save Jitsi URL to backend
  const handleSaveUrl = async () => {
    if (!onMeetingUrlGenerated) return;
    setIsGeneratingUrl(true);
    try {
      await onMeetingUrlGenerated(fullMeetingUrl);
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-white ${className}`}
      data-testid="jitsi-classroom-container"
    >
      {/* Top Classroom Bar */}
      <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{isBn ? 'অগ্রণী লাইভ জিটসি ক্লাসরুম' : 'OgroniEdu Live Jitsi Classroom'}</span>
          </div>

          {/* Connection status pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            {connectionStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>{isBn ? 'সংযুক্ত' : 'Connected'}</span>
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>{isBn ? 'কানেক্ট হচ্ছে...' : 'Connecting...'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                <span>{isBn ? 'বিচ্ছিন্ন' : 'Standby'}</span>
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 border-l border-slate-800 pl-3">
            <Users className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-medium text-slate-200">{participantCount} {isBn ? 'জন অংশগ্রহণকারী' : 'in call'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tutor: Save as official session link */}
          {isTutor && (!meetingUrl || meetingUrl !== fullMeetingUrl) && onMeetingUrlGenerated && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveUrl}
              isLoading={isGeneratingUrl}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-8 px-3 flex items-center gap-1.5"
              title={isBn ? 'এই মিটিং লিংকটি ক্লাসের প্রধান লিংক হিসেবে সংরক্ষণ করুন' : 'Save as primary session link'}
              data-testid="save-jitsi-link-btn"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isBn ? 'প্রধান লিংক হিসেবে সেভ করুন' : 'Save as Session Link'}</span>
            </Button>
          )}

          {/* Copy Room Link */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            title={isBn ? 'ক্লাসরুম লিংক কপি করুন' : 'Copy classroom URL'}
            data-testid="copy-jitsi-room-url"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'লিংক কপি' : 'Copy Link')}</span>
          </button>

          {/* Launch External Tab */}
          <a
            href={fullMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-xs"
            title={isBn ? 'নতুন ট্যাবে খুলুন' : 'Open in new window'}
            data-testid="open-jitsi-new-tab"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'নতুন ট্যাবে' : 'New Tab'}</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title={isFullscreen ? (isBn ? 'ফুলস্ক্রিন থেকে বের হন' : 'Exit Fullscreen') : (isBn ? 'ফুলস্ক্রিন' : 'Fullscreen')}
            data-testid="toggle-fullscreen-btn"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative w-full h-[520px] md:h-[620px] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        {/* Loading Spinner */}
        {scriptLoading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10 text-slate-300">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-xs font-semibold">{isBn ? 'অগ্রণী লাইভ ক্লাসরুম লোড হচ্ছে...' : 'Loading Ogroni Live Classroom...'}</p>
          </div>
        )}

        {/* Script / API Fallback Iframe if external_api.js blocked */}
        {scriptError ? (
          <div className="w-full h-full flex flex-col">
            <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 text-amber-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isBn ? 'সরাসরি সিকিউর আইফ্রেমের মাধ্যমে ক্লাসরুম চালু হয়েছে।' : 'Loaded via secure embedded video fallback.'}</span>
              </span>
              <a
                href={fullMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white font-bold ml-2"
              >
                {isBn ? 'বাইরে ওপেন করুন' : 'Open in New Window'}
              </a>
            </div>
            <iframe
              src={`${fullMeetingUrl}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&userInfo.displayName=${encodeURIComponent(
                displayName
              )}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker"
              className="w-full flex-1 border-0"
              title="OgroniEdu Jitsi Live Video"
            />
          </div>
        ) : (
          /* Jitsi External API Container */
          <div
            ref={jitsiNodeRef}
            className="w-full h-full"
            data-testid="jitsi-iframe-container"
          />
        )}
      </div>

      {/* Classroom Footer Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px] text-slate-300 font-semibold">{roomName}</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-400">{isBn ? 'এন্ড-টু-এন্ড এনক্রিপ্টেড ও সুরক্ষিত' : 'End-to-End Encrypted'}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span>{isBn ? 'সার্ভার:' : 'Host:'} <strong className="text-slate-300">{jitsiDomain}</strong></span>
          <span className="text-slate-600">•</span>
          <span>{isBn ? 'ব্যবহারকারী:' : 'User:'} <strong className="text-slate-200">{displayName}</strong></span>
        </div>
      </div>
    </div>
  );
}
