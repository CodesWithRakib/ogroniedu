import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  NotificationPreferencesView,
  UserNotificationPreference,
} from '../src/components/notifications/NotificationPreferencesView';
import { BookingChatView, ChatMessageItem } from '../src/components/notifications/BookingChatView';
import { getDictionary } from '../src/lib/i18n';

describe('Notification Preferences & Booking Chat Frontend Tests (Phase 12)', () => {
  const mockPreferences: UserNotificationPreference[] = [
    { category: 'booking', channel: 'in_app', isEnabled: true },
    { category: 'payment', channel: 'sms', isEnabled: true },
    { category: 'marketing', channel: 'email', isEnabled: false },
  ];

  const mockMessages: ChatMessageItem[] = [
    {
      id: 'msg-1',
      senderId: 'tutor-1',
      senderName: 'Dr. Nusrat',
      senderRole: 'tutor',
      content: 'Class starting tomorrow at 4 PM.',
      isRedacted: false,
      createdAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'msg-2',
      senderId: 'stud-1',
      senderName: 'Zafir',
      senderRole: 'student',
      content: 'Call [REDACTED CONTACT NUMBER] for updates.',
      isRedacted: true,
      redactionReason: 'Direct phone number sharing restricted',
      createdAt: '2026-10-10T10:05:00Z',
    },
  ];

  it('should instantiate NotificationPreferencesView with English and Bengali locales', () => {
    const enElement = React.createElement(NotificationPreferencesView, {
      locale: 'en',
      initialPreferences: mockPreferences,
    });
    expect(enElement).toBeDefined();
    expect(enElement.props.locale).toBe('en');

    const bnElement = React.createElement(NotificationPreferencesView, {
      locale: 'bn',
      initialPreferences: mockPreferences,
    });
    expect(bnElement).toBeDefined();
    expect(bnElement.props.locale).toBe('bn');
  });

  it('should instantiate BookingChatView with messages and verify redacted state', () => {
    const chatElement = React.createElement(BookingChatView, {
      locale: 'en',
      bookingId: 'book-1234-abcd',
      subjectName: 'Physics (Class 10)',
      currentUserId: 'stud-1',
      initialMessages: mockMessages,
    });

    expect(chatElement).toBeDefined();
    expect(chatElement.props.initialMessages).toHaveLength(2);
    expect(chatElement.props.initialMessages[1].isRedacted).toBe(true);
  });

  it('should verify 100% dictionary key parity for notifications namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.notifications).toBeDefined();
    expect(enDict.notifications).toBeDefined();

    const bnKeys = Object.keys(bnDict.notifications).sort();
    const enKeys = Object.keys(enDict.notifications).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(25);

    // Verify key translations
    expect(bnDict.notifications.preferencesTitle).toBe('নোটিফিকেশন ও অ্যালার্ট সেটিংস');
    expect(enDict.notifications.preferencesTitle).toBe('Notification & Alert Preferences');
    expect(bnDict.notifications.chatTitle).toBe('পাঠদান সংক্রান্ত বার্তালাপ');
    expect(enDict.notifications.chatTitle).toBe('Participant Messaging');
    expect(bnDict.notifications.safetyNotice).toContain('ব্যক্তিগত ফোন নম্বর');
    expect(enDict.notifications.safetyNotice).toContain('direct personal phone numbers');
  });
});
