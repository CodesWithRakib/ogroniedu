import { z } from 'zod';

export const SendBookingMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  attachmentAssetIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SendBookingMessageInput = z.infer<typeof SendBookingMessageSchema>;

export interface BookingMessageRecord {
  id: string;
  bookingId: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  isRedacted: boolean;
  redactionReason?: string | null;
  attachmentAssetIds?: string[];
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  senderUser?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  senderName?: string;
  senderRole?: 'student' | 'tutor' | 'guardian' | 'admin';
}

export interface ConversationInboxItem {
  bookingId: string;
  subjectName: string;
  educationLevelName?: string;
  status: string;
  partnerUser: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    role: 'student' | 'tutor' | 'guardian';
  };
  studentUser?: {
    id: string;
    displayName: string;
  };
  tutorUser?: {
    id: string;
    displayName: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    isRedacted: boolean;
    createdAt: string;
    isMine: boolean;
    readAt?: string | null;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatTypingPayload {
  bookingId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ChatReadReceiptPayload {
  bookingId: string;
  readerUserId: string;
  messageId: string;
  readAt: string;
}
