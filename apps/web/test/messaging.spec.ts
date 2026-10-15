import { describe, it, expect } from 'vitest';
import { mapToChatItems } from '../src/features/messaging/utils/chat-mappers';
import { parseCursorCollection } from '../src/lib/api/parse';
import type { BookingMessage } from '../src/store/services/booking-messages-api';

const thread: BookingMessage[] = [
  {
    id: 'm-old',
    bookingId: 'b1',
    senderUserId: 'tutor-1',
    content: 'Hello',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'm-new',
    bookingId: 'b1',
    senderUserId: 'me-1',
    senderUser: { displayName: 'Student One' },
    content: 'Hi',
    isRedacted: true,
    redactionReason: 'phone',
    readAt: null,
    createdAt: '2026-01-01T10:05:00Z',
  },
];

describe('Messaging feature (cursor chat)', () => {
  it('maps API rows to display items with own/peer roles', () => {
    const items = mapToChatItems(thread, 'me-1', { ownRole: 'student', peerRole: 'tutor' });
    expect(items).toHaveLength(2);
    expect(items[0].senderRole).toBe('tutor');
    expect(items[0].senderName).toBe('Participant');
    expect(items[1].senderName).toBe('Me');
    expect(items[1].isRedacted).toBe(true);
    expect(items[1].redactionReason).toBe('phone');
  });

  it('prefers explicit senderName, falls back to relation displayName', () => {
    const named: BookingMessage = {
      ...thread[0],
      senderName: 'Tutor X',
      senderUser: { displayName: 'Should not win' },
    };
    expect(mapToChatItems([named], 'me-1')[0].senderName).toBe('Tutor X');
    const related: BookingMessage = { ...thread[0], senderUser: { displayName: 'Tutor Y' } };
    expect(mapToChatItems([related], 'me-1')[0].senderName).toBe('Tutor Y');
  });

  it('parses the cursor chat envelope (ASC page + nextCursor)', () => {
    const page = parseCursorCollection<BookingMessage>({
      success: true,
      data: thread,
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor: 'tok-older',
          previousCursor: null,
          hasNextPage: true,
          pageSize: 30,
        },
      },
    });
    expect(page.items.map((m) => m.id)).toEqual(['m-old', 'm-new']);
    expect(page.nextCursor).toBe('tok-older');
    expect(page.hasNextPage).toBe(true);
  });

  it('exhausted history carries null cursor and no next page', () => {
    const page = parseCursorCollection<BookingMessage>({
      success: true,
      data: thread,
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          pageSize: 30,
        },
      },
    });
    expect(page.nextCursor).toBeNull();
    expect(page.hasNextPage).toBe(false);
  });
});
