import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { ClassroomWorkspace } from '../src/features/classroom/components/ClassroomWorkspace';
import type { SessionItem } from '../src/store/services/sessions-api';

// Mock LiveKit react components
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
    chatMessages: [],
    send: vi.fn(),
  }),
  ParticipantTile: () => React.createElement('div', { 'data-testid': 'mock-participant-tile' }),
  TrackRefContext: {
    Provider: ({ children }: any) => children,
  },
}));

describe('OgroniEdu Native Platform LiveKit Classroom Workspace', () => {
  const mockSession: SessionItem = {
    id: 'test-session-livekit-01',
    bookingId: 'booking-lk-01',
    tutorUserId: '22222222-2222-4222-b222-222222222222',
    studentUserId: '33333333-3333-4333-b333-333333333333',
    startsAt: '2026-10-29T10:00:00.000Z',
    endsAt: '2026-10-29T11:00:00.000Z',
    timezone: 'Asia/Dhaka',
    status: 'scheduled',
    meetingUrl: 'http://localhost:5000/bn/classroom/test-session-livekit-01',
    booking: {
      id: 'booking-lk-01',
      subject: {
        id: 'subj-1',
        nameEn: 'Physics & Higher Mathematics',
        nameBn: 'পদার্থবিজ্ঞান ও উচ্চতর গণিত',
      },
    },
    tutorProfile: {
      user: {
        id: '22222222-2222-4222-b222-222222222222',
        displayName: 'রাশেদ করিম (Rashed Karim)',
      },
    },
    studentUser: {
      id: '33333333-3333-4333-b333-333333333333',
      displayName: 'আবরার আহমেদ (Abrar Ahmed)',
    },
  };

  it('renders ClassroomWorkspace with native LiveKit video classroom tab and Bengali labels', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'bn',
          isTutor: true,
          initialTab: 'video',
        }),
      ),
    );

    expect(html).toContain('data-testid="tab-video"');
    expect(html).toContain('লাইভ ভিডিও ক্লাসরুম (LiveKit)');
    expect(html).toContain('ইন্টারেক্টিভ হোয়াইটবোর্ড');
    expect(html).toContain('ফর্মুলা ও স্টাডি নোটস');
    expect(html).toContain('উপস্থিতি ও বিবরণ');
    expect(html).toContain('data-testid="split-mode-toggle"');
  });

  it('renders ClassroomWorkspace in English with LiveKit platform integration', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'en',
          isTutor: false,
          initialTab: 'video',
        }),
      ),
    );

    expect(html).toContain('Live Video Classroom (LiveKit)');
    expect(html).toContain('Interactive Whiteboard');
    expect(html).toContain('Formulas &amp; Study Notes');
    expect(html).toContain('Attendance &amp; Details');
  });

  it('ensures zero legacy external meeting references remain in rendered classroom markup', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ClassroomWorkspace, {
          session: mockSession,
          locale: 'bn',
          isTutor: true,
        }),
      ),
    );

    expect(html).not.toContain('Jitsi');
    expect(html).not.toContain('meet.jit.si');
    expect(html).not.toContain('8x8');
  });
});
