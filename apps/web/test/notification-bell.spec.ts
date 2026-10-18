import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Renders the real NotificationBell component (not a local re-implementation
 * of its formatting logic) with the notification provider hook mocked, so the
 * badge, aria label, and connection indicator are asserted from real markup.
 */
const { mockNotifications } = vi.hoisted(() => ({
  mockNotifications: {
    unreadCount: 25,
    isCenterOpen: false,
    setIsCenterOpen: vi.fn(),
    isConnected: true,
    soundEnabled: true,
  },
}));

vi.mock('../src/components/notifications/NotificationProvider', () => ({
  useNotifications: () => mockNotifications,
}));

import { NotificationBell } from '../src/components/notifications/NotificationBell';

describe('NotificationBell Component', () => {
  beforeEach(() => {
    mockNotifications.unreadCount = 25;
    mockNotifications.isCenterOpen = false;
    mockNotifications.isConnected = true;
    mockNotifications.soundEnabled = true;
  });

  it('should render the unread badge in Bengali digits with a localized aria label', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'bn' }),
    );

    expect(html).toContain('২৫');
    expect(html).toContain('aria-label="বিজ্ঞপ্তি (২৫টি অপঠিত)"');
  });

  it('should render the unread badge in English digits with a localized aria label', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'en' }),
    );

    expect(html).toContain('>25</span>');
    expect(html).toContain('aria-label="Notifications (25 unread)"');
  });

  it('should cap large counts at 99+ in the active locale', () => {
    mockNotifications.unreadCount = 150;

    const bnHtml = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'bn' }),
    );
    const enHtml = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'en' }),
    );

    expect(bnHtml).toContain('৯৯+');
    expect(enHtml).toContain('99+');
  });

  it('should hide the badge at zero unread and still keep an accessible label', () => {
    mockNotifications.unreadCount = 0;

    const html = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'bn' }),
    );

    expect(html).not.toContain('animate-ping');
    expect(html).toContain('aria-label="বিজ্ঞপ্তি (০টি অপঠিত)"');
  });

  it('should reflect the live connection state on the status dot', () => {
    const onlineHtml = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'en' }),
    );
    expect(onlineHtml).toContain('title="Live WebSockets Connected"');

    mockNotifications.isConnected = false;
    const offlineHtml = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'en' }),
    );
    expect(offlineHtml).toContain('title="Gateway Offline"');
  });

  it('should expose the expanded state for the notification center', () => {
    mockNotifications.isCenterOpen = true;

    const html = renderToStaticMarkup(
      React.createElement(NotificationBell, { locale: 'en' }),
    );

    expect(html).toContain('aria-expanded="true"');
  });
});
