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
});
