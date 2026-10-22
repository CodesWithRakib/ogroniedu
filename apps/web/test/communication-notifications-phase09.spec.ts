import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import enMessages from '../messages/en.json';

const { mockNotifications } = vi.hoisted(() => ({
  mockNotifications: {
    unreadCount: 5,
    isCenterOpen: false,
    setIsCenterOpen: vi.fn(),
    isConnected: true,
    soundEnabled: true,
  },
}));

vi.mock('../src/components/notifications/NotificationProvider', () => ({
  useNotifications: () => mockNotifications,
}));

// Mock RTK Query hooks for conversations
vi.mock('../src/store/services/booking-messages-api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useGetConversationsInboxQuery: () => ({
      data: {
        success: true,
        data: [
          {
            bookingId: 'booking-1',
            subjectName: 'Higher Mathematics (Class 10)',
            partnerUser: {
              id: 'user-tutor-1',
              displayName: 'Tutor Rashed Karim',
              role: 'tutor',
            },
            lastMessage: {
              content: 'Tomorrow at 4:00 PM session is confirmed.',
              createdAt: '2026-10-22T08:00:00Z',
              isMine: false,
            },
            unreadCount: 2,
          },
          {
            bookingId: 'booking-2',
            subjectName: 'Physics (Class 9)',
            partnerUser: {
              id: 'user-student-2',
              displayName: 'Student Farhan',
              role: 'student',
            },
            lastMessage: {
              content: 'I have submitted the homework PDF.',
              createdAt: '2026-10-21T14:30:00Z',
              isMine: true,
            },
            unreadCount: 0,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useMarkAllBookingMessagesAsReadMutation: () => [vi.fn().mockReturnValue({ unwrap: vi.fn() })],
    useGetBookingMessagesQuery: () => ({
      data: {
        success: true,
        data: [],
      },
      isLoading: false,
    }),
    useSendBookingMessageMutation: () => [vi.fn()],
  };
});

import { NotificationBell } from '../src/components/notifications/NotificationBell';
import { ConversationsInboxView } from '../src/features/messaging/components/ConversationsInboxView';

function renderWithProviders(node: React.ReactElement, locale: 'bn' | 'en' = 'bn'): string {
  const store = makeStore();
  const messages = locale === 'bn' ? bnMessages : enMessages;
  return renderToStaticMarkup(
    React.createElement(Provider, {
      store,
      children: React.createElement(NextIntlClientProvider, {
        locale,
        messages,
        timeZone: 'Asia/Dhaka',
        children: node,
      }),
    }),
  );
}

describe('Phase 9: Communication & Real-Time Notifications Frontend Tests', () => {
  describe('1. Real-Time Notification Bell & Status Badge (NotificationBell)', () => {
    beforeEach(() => {
      mockNotifications.unreadCount = 5;
      mockNotifications.isConnected = true;
    });

    it('renders unread count in Bengali digits when locale is bn', () => {
      const html = renderWithProviders(
        React.createElement(NotificationBell, { locale: 'bn' }),
        'bn',
      );

      expect(html).toContain('৫');
      expect(html).toContain('aria-label="বিজ্ঞপ্তি (৫টি অপঠিত)"');
    });

    it('renders unread count in English digits when locale is en', () => {
      const html = renderWithProviders(
        React.createElement(NotificationBell, { locale: 'en' }),
        'en',
      );

      expect(html).toContain('>5</span>');
      expect(html).toContain('aria-label="Notifications (5 unread)"');
    });

    it('displays green live indicator when WebSocket gateway is connected', () => {
      mockNotifications.isConnected = true;
      const html = renderWithProviders(
        React.createElement(NotificationBell, { locale: 'bn' }),
        'bn',
      );

      expect(html).toContain('Live WebSockets Connected');
    });

    it('displays amber indicator when WebSocket gateway is disconnected', () => {
      mockNotifications.isConnected = false;
      const html = renderWithProviders(
        React.createElement(NotificationBell, { locale: 'bn' }),
        'bn',
      );

      expect(html).toContain('Gateway Offline');
    });
  });

  describe('2. Conversations Inbox & Split Pane Messaging (ConversationsInboxView)', () => {
    it('renders conversations list with partner name, subject, and unread badges', () => {
      const html = renderWithProviders(
        React.createElement(ConversationsInboxView, { locale: 'bn' }),
        'bn',
      );

      expect(html).toContain('বার্তালাপ ও যোগাযোগ');
      expect(html).toContain('Tutor Rashed Karim');
      expect(html).toContain('Higher Mathematics (Class 10)');
      expect(html).toContain('Student Farhan');
      expect(html).toContain('Physics (Class 9)');
      expect(html).toContain('নিরাপদ মেসেজিং চ্যানেল');
    });

    it('renders audit and escrow protection guarantee banner', () => {
      const html = renderWithProviders(
        React.createElement(ConversationsInboxView, { locale: 'en' }),
        'en',
      );

      expect(html).toContain('Conversations &amp; Messaging');
      expect(html).toContain('Audited Secure Channel');
      expect(html).toContain('child safety and escrow protection');
    });
  });
});
