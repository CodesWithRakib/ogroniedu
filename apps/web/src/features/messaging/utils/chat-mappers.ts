import type { ChatMessageItem } from '@/components/notifications/BookingChatView';
import type { BookingMessage } from '@/store/services/booking-messages-api';

export type ChatRole = ChatMessageItem['senderRole'];

/**
 * Map API chat rows to display items. Role labels are display-only affordances:
 * the caller supplies which side is which because the message payload carries
 * user ids, not role claims (never trust client role labels for authorization).
 */
export function mapToChatItems(
  messages: BookingMessage[],
  currentUserId: string,
  opts?: { ownRole?: ChatRole; peerRole?: ChatRole },
): ChatMessageItem[] {
  const ownRole = opts?.ownRole ?? 'student';
  const peerRole = opts?.peerRole ?? 'tutor';
  return messages.map((m) => {
    const isOwn = m.senderUserId === currentUserId;
    return {
      id: m.id,
      senderId: m.senderUserId,
      senderName: isOwn
        ? 'Me'
        : (m.senderName ?? m.senderUser?.displayName ?? 'Participant'),
      senderRole: isOwn ? ownRole : peerRole,
      content: m.body ?? m.content,
      isRedacted: m.isRedacted ?? false,
      redactionReason: m.redactionReason ?? null,
      readAt: m.readAt ?? null,
      createdAt: m.createdAt,
    };
  });
}
