import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { PreJoinLobby } from '../src/features/classroom/components/PreJoinLobby';
import { ClassroomControlBar } from '../src/features/classroom/components/ClassroomControlBar';
import { ClassroomModerationPanel } from '../src/features/classroom/components/ClassroomModerationPanel';
import { ClassroomChatPanel } from '../src/features/classroom/components/ClassroomChatPanel';
import { LiveKitClassroomMeeting } from '../src/features/classroom/components/LiveKitClassroomMeeting';
import { NetworkDiagnosticsModal } from '../src/features/classroom/components/NetworkDiagnosticsModal';
import { AudioProcessingSettingsModal } from '../src/features/classroom/components/AudioProcessingSettingsModal';
import { ClassroomPollModal } from '../src/features/classroom/components/ClassroomPollModal';
import { InteractiveWhiteboard } from '../src/features/classroom/components/InteractiveWhiteboard';
import { classroomAudio } from '../src/features/classroom/utils/classroom-audio';
import type { ClassroomAttendeeSummary } from '@ogroniedu/contracts';

// Mock LiveKit hooks
vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-livekit-room' }, children),
  RoomAudioRenderer: () => React.createElement('div', { 'data-testid': 'mock-room-audio-renderer' }),
  useTracks: () => [],
  useParticipants: () => [],
  useRoomContext: () => ({
    switchActiveDevice: vi.fn(),
  }),
  useLocalParticipant: () => ({
    localParticipant: {
      setMicrophoneEnabled: vi.fn(),
      setCameraEnabled: vi.fn(),
      setScreenShareEnabled: vi.fn(),
    },
    isMicrophoneEnabled: true,
    isCameraEnabled: true,
    isScreenShareEnabled: false,
  }),
  useChat: () => ({
    chatMessages: [
      {
        message: 'Hello class!',
        timestamp: Date.now(),
        from: { identity: 'tutor-1', name: 'Farhan Tutor' },
      },
    ],
    send: vi.fn(),
  }),
  ParticipantTile: () => React.createElement('div', { 'data-testid': 'mock-participant-tile' }),
  TrackRefContext: {
    Provider: ({ children }: any) => children,
  },
}));

describe('LiveKit Scalable Dual-Mode Classroom Frontend Tests', () => {
  it('TC-LK-001: should render PreJoinLobby with green room preview, mic indicator, and join CTA', () => {
    const html = renderToStaticMarkup(
      React.createElement(PreJoinLobby, {
        displayName: 'Abrar Student',
        isTutor: false,
        locale: 'bn',
        onJoin: () => {},
      }),
    );

    expect(html).toContain('data-testid="prejoin-lobby"');
    expect(html).toContain('ক্লাসরুম গ্রিন রুম / লবি');
    expect(html).toContain('Abrar Student');
    expect(html).toContain('data-testid="lobby-mic-toggle"');
    expect(html).toContain('data-testid="lobby-camera-toggle"');
    expect(html).toContain('data-testid="join-classroom-btn"');
    expect(html).toContain('ক্লাসরুমে প্রবেশ করুন');
    expect(html).toContain('লো-ডাটা / অডিও-ফার্স্ট মোড');
  });

  it('TC-LK-002: should render PreJoinLobby with English labels for Tutor', () => {
    const html = renderToStaticMarkup(
      React.createElement(PreJoinLobby, {
        displayName: 'Farhan Tutor',
        isTutor: true,
        locale: 'en',
        onJoin: () => {},
      }),
    );

    expect(html).toContain('Classroom Green Room');
    expect(html).toContain('Farhan Tutor');
    expect(html).toContain('Tutor / Host');
    expect(html).toContain('Join Classroom Now');
    expect(html).toContain('SFU Cloud Ready');
  });

  it('TC-LK-003: should render ClassroomControlBar with mobile-friendly controls and Raise Hand for student', () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomControlBar, {
        isTutor: false,
        canPublish: true,
        locale: 'bn',
        isHandRaised: false,
        onToggleHandRaise: () => {},
        onToggleModeration: () => {},
        onToggleChat: () => {},
        onLeave: () => {},
        lowDataMode: false,
        onToggleLowDataMode: () => {},
      }),
    );

    expect(html).toContain('data-testid="classroom-control-bar"');
    expect(html).toContain('data-testid="control-mic-toggle"');
    expect(html).toContain('data-testid="control-camera-toggle"');
    expect(html).toContain('data-testid="control-flip-camera"');
    expect(html).toContain('data-testid="control-screen-share"');
    expect(html).toContain('data-testid="control-raise-hand"');
    expect(html).toContain('data-testid="control-chat-toggle"');
    expect(html).toContain('data-testid="control-leave-btn"');
    expect(html).toContain('হাত তুলুন');
  });

  it('TC-LK-004: should render ClassroomControlBar with Moderation Hub for Tutor', () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomControlBar, {
        isTutor: true,
        canPublish: true,
        locale: 'bn',
        isHandRaised: false,
        onToggleHandRaise: () => {},
        onToggleModeration: () => {},
        onToggleChat: () => {},
        onLeave: () => {},
        handRaiseCount: 3,
        lowDataMode: false,
        onToggleLowDataMode: () => {},
      }),
    );

    expect(html).toContain('data-testid="control-moderation-toggle"');
    expect(html).toContain('মডারেশন');
    expect(html).toContain('3'); // Pending hand raise badge count
    expect(html).not.toContain('data-testid="control-raise-hand"'); // Tutor doesn't raise hand
  });

  it('TC-LK-005: should render ClassroomModerationPanel with hand-raise queue, promote and end buttons', () => {
    const mockAttendees: ClassroomAttendeeSummary[] = [
      {
        id: 'att-1',
        userId: 'student-1',
        participantIdentity: 'student-1',
        participantName: 'Abrar Student',
        role: 'STUDENT',
        firstJoinedAt: new Date().toISOString(),
        lastLeftAt: null,
        totalDurationSeconds: 1200,
        connectionStatus: 'CONNECTED',
        reconnectionCount: 0,
        isHandRaised: true,
        handRaisedAt: new Date().toISOString(),
        isStagePromoted: false,
        stagePromotedAt: null,
      },
      {
        id: 'att-2',
        userId: 'student-2',
        participantIdentity: 'student-2',
        participantName: 'Nadia Student',
        role: 'STUDENT',
        firstJoinedAt: new Date().toISOString(),
        lastLeftAt: null,
        totalDurationSeconds: 1800,
        connectionStatus: 'CONNECTED',
        reconnectionCount: 0,
        isHandRaised: false,
        handRaisedAt: null,
        isStagePromoted: true,
        stagePromotedAt: new Date().toISOString(),
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ClassroomModerationPanel, {
        isOpen: true,
        onClose: () => {},
        locale: 'bn',
        attendees: mockAttendees,
        onPromote: () => {},
        onMute: () => {},
        onKick: () => {},
        onEndSession: () => {},
      }),
    );

    expect(html).toContain('data-testid="classroom-moderation-panel"');
    expect(html).toContain('হোস্ট মডারেশন কন্ট্রোল');
    expect(html).toContain('হাত তোলার আবেদন (1)');
    expect(html).toContain('Abrar Student');
    expect(html).toContain('data-testid="approve-stage-btn-student-1"');
    expect(html).toContain('স্টেজে আনুন');
    expect(html).toContain('স্টেজে সক্রিয় শিক্ষার্থী (1)');
    expect(html).toContain('Nadia Student');
    expect(html).toContain('data-testid="moderation-end-session-btn"');
    expect(html).toContain('সবার জন্য ক্লাস শেষ ও উপস্থিতি সংরক্ষণ');
  });

  it('TC-LK-006: should render ClassroomChatPanel with message feed and send input', () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomChatPanel, {
        isOpen: true,
        onClose: () => {},
        locale: 'bn',
        displayName: 'Farhan Tutor',
      }),
    );

    expect(html).toContain('data-testid="classroom-chat-panel"');
    expect(html).toContain('ইন-রুম লাইভ চ্যাট');
    expect(html).toContain('Hello class!');
    expect(html).toContain('data-testid="classroom-chat-input"');
    expect(html).toContain('data-testid="classroom-chat-send-btn"');
  });

  it('TC-LK-007: should render LiveKitClassroomMeeting initial green room lobby state', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(LiveKitClassroomMeeting, {
          sessionId: 'session-uuid-1',
          locale: 'bn',
          displayName: 'Abrar Student',
          isTutor: false,
        }),
      ),
    );

    expect(html).toContain('data-testid="livekit-classroom-container"');
    expect(html).toContain('data-testid="prejoin-lobby"');
    expect(html).toContain('ক্লাসরুম গ্রিন রুম / লবি');
    expect(html).toContain('Abrar Student');
  });

  it('TC-LK-008: should render NetworkDiagnosticsModal with latency telemetry and tips', () => {
    const html = renderToStaticMarkup(
      React.createElement(NetworkDiagnosticsModal, {
        isOpen: true,
        onClose: () => {},
        locale: 'bn',
        latencyMs: 28,
        packetLossPercent: 0.0,
        qualityRating: 'excellent',
        lowDataMode: false,
        onToggleLowDataMode: () => {},
      }),
    );

    expect(html).toContain('data-testid="network-diagnostics-modal"');
    expect(html).toContain('নেটওয়ার্ক ডায়াগনস্টিকস ও স্থিতি');
    expect(html).toContain('28');
    expect(html).toContain('ms Ping');
    expect(html).toContain('চমৎকার ও স্থিতিশীল');
    expect(html).toContain('Opus / VP8');
  });

  it('TC-LK-009: should render AudioProcessingSettingsModal with noise suppression and echo cancellation toggles', () => {
    const html = renderToStaticMarkup(
      React.createElement(AudioProcessingSettingsModal, {
        isOpen: true,
        onClose: () => {},
        locale: 'bn',
        noiseSuppression: true,
        onToggleNoiseSuppression: () => {},
        echoCancellation: true,
        onToggleEchoCancellation: () => {},
        soundEffectsEnabled: true,
        onToggleSoundEffects: () => {},
      }),
    );

    expect(html).toContain('data-testid="audio-processing-settings-modal"');
    expect(html).toContain('অডিও ও মিডিয়া সেটিংস');
    expect(html).toContain('নয়েজ সাপ্রেশন (Noise Suppression)');
    expect(html).toContain('ইকো ক্যান্সেলেশন (Echo Cancellation)');
    expect(html).toContain('ইন্টারঅ্যাক্টিভ সাউন্ড চাইম');
  });

  it('TC-LK-010: should verify classroomAudio synthesizer operates without throwing', () => {
    expect(typeof classroomAudio.playHandRaiseChime).toBe('function');
    expect(typeof classroomAudio.playChatMessageChime).toBe('function');
    expect(typeof classroomAudio.playJoinChime).toBe('function');
    expect(typeof classroomAudio.playLeaveChime).toBe('function');
    expect(classroomAudio.isSoundEnabled()).toBe(true);
    classroomAudio.setSoundEnabled(false);
    expect(classroomAudio.isSoundEnabled()).toBe(false);
    classroomAudio.setSoundEnabled(true);
  });

  it('TC-LK-011: should render ClassroomPollModal create form for Tutor', () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomPollModal, {
        isOpen: true,
        onClose: () => {},
        isTutor: true,
        locale: 'bn',
        currentPoll: null,
        votes: {},
        userVotedIndex: null,
        onLaunchPoll: () => {},
        onVote: () => {},
        onEndPoll: () => {},
        onToggleShareResults: () => {},
      }),
    );

    expect(html).toContain('data-testid="classroom-poll-modal"');
    expect(html).toContain('ইন-ক্লাস পোল ও তাৎক্ষণিক কুইজ');
    expect(html).toContain('data-testid="create-poll-form"');
    expect(html).toContain('পোলের প্রশ্ন / কুইজ লিখুন');
    expect(html).toContain('data-testid="launch-poll-btn"');
    expect(html).toContain('পোল চালু ও সম্প্রচার করুন');
  });

  it('TC-LK-012: should render active poll in ClassroomPollModal for Student with voting choices', () => {
    const samplePoll = {
      id: 'poll-123',
      question: 'What is Newton’s Third Law?',
      options: ['Every action has equal reaction', 'F = ma', 'Gravity attracts', 'Inertia'],
      creatorName: 'Farhan Tutor',
      creatorIdentity: 'tutor-1',
      createdAt: Date.now(),
      isActive: true,
      resultsShared: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(ClassroomPollModal, {
        isOpen: true,
        onClose: () => {},
        isTutor: false,
        locale: 'bn',
        currentPoll: samplePoll,
        votes: { 'student-1': 0, 'student-2': 0, 'student-3': 1 },
        userVotedIndex: null,
        onLaunchPoll: () => {},
        onVote: () => {},
        onEndPoll: () => {},
        onToggleShareResults: () => {},
      }),
    );

    expect(html).toContain('data-testid="active-poll-container"');
    expect(html).toContain('What is Newton’s Third Law?');
    expect(html).toContain('Every action has equal reaction');
    expect(html).toContain('data-testid="submit-poll-vote-btn"');
    expect(html).toContain('উত্তর জমা দিন');
  });

  it('TC-LK-013: should render prominent export button on InteractiveWhiteboard', () => {
    const html = renderToStaticMarkup(
      React.createElement(InteractiveWhiteboard, {
        locale: 'bn',
        sessionTitle: 'Physics Derivation',
      }),
    );

    expect(html).toContain('data-testid="interactive-whiteboard"');
    expect(html).toContain('data-testid="wb-btn-export"');
    expect(html).toContain('নোটস ডাউনলোড');
  });

  it('TC-LK-014: should render mute all students button in ClassroomModerationPanel', () => {
    const attendees: ClassroomAttendeeSummary[] = [
      {
        id: 'att-1',
        sessionId: 'sess-1',
        participantIdentity: 'tutor-1',
        participantName: 'Farhan Tutor',
        role: 'HOST',
        connectionStatus: 'CONNECTED',
        isStagePromoted: true,
        isHandRaised: false,
        totalDurationSeconds: 1200,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'att-2',
        sessionId: 'sess-1',
        participantIdentity: 'student-1',
        participantName: 'Abrar Student',
        role: 'STUDENT',
        connectionStatus: 'CONNECTED',
        isStagePromoted: false,
        isHandRaised: true,
        totalDurationSeconds: 600,
        createdAt: new Date().toISOString(),
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ClassroomModerationPanel, {
        isOpen: true,
        onClose: () => {},
        locale: 'bn',
        attendees,
        onPromote: () => {},
        onMute: () => {},
        onMuteAll: () => {},
        onKick: () => {},
        onEndSession: () => {},
      }),
    );

    expect(html).toContain('data-testid="classroom-moderation-panel"');
    expect(html).toContain('data-testid="moderation-mute-all-btn"');
    expect(html).toContain('সবাইকে মিউট');
  });

  it('TC-LK-015: should render ClassroomControlBar with poll button and theater mode button', () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomControlBar, {
        isTutor: true,
        canPublish: true,
        locale: 'bn',
        isHandRaised: false,
        onToggleHandRaise: () => {},
        onToggleModeration: () => {},
        onToggleChat: () => {},
        onLeave: () => {},
        lowDataMode: false,
        onToggleLowDataMode: () => {},
        onTogglePollModal: () => {},
        hasActivePoll: true,
        isTheaterMode: false,
        onToggleTheaterMode: () => {},
      }),
    );

    expect(html).toContain('data-testid="classroom-control-bar"');
    expect(html).toContain('data-testid="control-poll-toggle"');
    expect(html).toContain('data-testid="control-theater-toggle"');
  });
});
