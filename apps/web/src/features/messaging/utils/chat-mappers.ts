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
  opts?: { ownRole?: ChatRole; peerRole?: ChatRole; peerName?: string; ownName?: string; locale?: string },
): ChatMessageItem[] {
  const ownRole = opts?.ownRole ?? 'student';
  const peerRole = opts?.peerRole ?? 'tutor';
  const isBn = opts?.locale === 'bn';
  const defaultOwnName = isBn ? 'আপনি' : 'You';
  const defaultPeerName = isBn ? 'অংশগ্রহণকারী' : 'Participant';

  return messages.map((m) => {
    const isOwn = m.senderUserId === currentUserId;
    const senderName = isOwn
      ? (opts?.ownName || defaultOwnName)
      : (m.senderName || m.senderUser?.displayName || opts?.peerName || defaultPeerName);

    const readByName = isOwn && m.readAt
      ? (m.readByName || m.recipientUser?.displayName || opts?.peerName || null)
      : null;

    // Build initial seenBy list if present or seed from readAt + recipient
    let seenBy = m.seenBy;
    if ((!seenBy || seenBy.length === 0) && isOwn && m.readAt) {
      const recipientName = m.readByName || m.recipientUser?.displayName || opts?.peerName || defaultPeerName;
      seenBy = [
        {
          userId: m.readByUserId || m.recipientUserId || 'recipient',
          name: recipientName,
          seenAt: m.readAt,
        },
      ];
    }

    return {
      id: m.id,
      senderId: m.senderUserId,
      senderName,
      senderRole: isOwn ? ownRole : peerRole,
      content: m.body ?? m.content,
      isRedacted: m.isRedacted ?? false,
      redactionReason: m.redactionReason ?? null,
      attachmentAssetIds: m.attachmentAssetIds ?? [],
      metadata: m.metadata ?? null,
      readAt: m.readAt ?? null,
      readByName,
      readByUserId: m.readByUserId || m.recipientUserId || null,
      seenBy,
      createdAt: m.createdAt,
    };
  });
}
