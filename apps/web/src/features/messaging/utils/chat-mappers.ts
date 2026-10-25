import type { ChatMessageItem } from '@/components/notifications/BookingChatView';
import type { BookingMessage } from '@/store/services/booking-messages-api';

export type ChatRole = ChatMessageItem['senderRole'];

/**
 * Map API chat rows to display items. Role labels are display-only affordances:
 * the caller supplies which side is which because the message payload carries
 * user ids, not role claims (never trust client role labels for authorization).
 */
export interface ChatMapperOpts {
  ownRole?: ChatRole;
  peerRole?: ChatRole;
  peerName?: string;
  ownName?: string;
  studentName?: string;
  tutorName?: string;
  studentUserId?: string;
  tutorUserId?: string;
  locale?: string;
}

/**
 * Map API chat rows to display items. Role labels are display-only affordances:
 * the caller supplies which side is which because the message payload carries
 * user ids, not role claims (never trust client role labels for authorization).
 */
export function mapToChatItems(
  messages: BookingMessage[],
  currentUserId: string,
  opts?: ChatMapperOpts,
): ChatMessageItem[] {
  const ownRole = opts?.ownRole ?? 'student';
  const peerRole = opts?.peerRole ?? 'tutor';
  const isBn = opts?.locale === 'bn';
  const defaultOwnName = isBn ? 'আপনি' : 'You';
  const defaultPeerName = isBn ? 'অংশগ্রহণকারী' : 'Participant';
  const isEmail = (str?: string | null) => !!str && str.includes('@');

  return messages.map((m) => {
    const isOwn = m.senderUserId === currentUserId;
    const meta = (m.metadata || {}) as Record<string, unknown>;
    const isStaff =
      meta.isStaffIntervention === true ||
      meta.senderRole === 'admin';

    const metadataRole = meta.senderRole as ChatRole | undefined;
    const metadataName = meta.senderName as string | undefined;

    const computedRole: ChatRole = isStaff
      ? 'admin'
      : isOwn
        ? ownRole
        : (metadataRole || peerRole);

    let senderName: string;
    if (isStaff) {
      senderName = isBn ? 'অগ্রণী প্ল্যাটফর্ম মডারেটর' : 'Ogroni Platform Moderator';
    } else if (isOwn) {
      senderName = opts?.ownName || defaultOwnName;
    } else {
      // Priority 1: m.senderName if valid name (explicit name override)
      if (m.senderName && !isEmail(m.senderName)) {
        senderName = m.senderName;
      }
      // Priority 2: metadataName if valid name
      else if (metadataName && !isEmail(metadataName)) {
        senderName = metadataName;
      }
      // Priority 3: DB-attached senderUser.displayName if valid name
      else if (m.senderUser?.displayName && !isEmail(m.senderUser.displayName)) {
        senderName = m.senderUser.displayName;
      }
      // Priority 4: Booking context participant names
      else if (opts?.studentUserId && m.senderUserId === opts.studentUserId && opts.studentName && !isEmail(opts.studentName)) {
        senderName = opts.studentName;
      } else if (opts?.tutorUserId && m.senderUserId === opts.tutorUserId && opts.tutorName && !isEmail(opts.tutorName)) {
        senderName = opts.tutorName;
      }
      // Priority 5: peerName if valid name
      else if (opts?.peerName && !isEmail(opts.peerName)) {
        senderName = opts.peerName;
      }
      // Priority 6: Default fallback peer name
      else {
        senderName = defaultPeerName;
      }
    }

    const readByName = isOwn && m.readAt
      ? (!isEmail(m.readByName) ? m.readByName : null) ||
        (!isEmail(m.recipientUser?.displayName) ? m.recipientUser?.displayName : null) ||
        (!isEmail(opts?.peerName) ? opts?.peerName : null) ||
        (isBn ? 'অংশগ্রহণকারী' : 'Participant')
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
      senderRole: computedRole,
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
