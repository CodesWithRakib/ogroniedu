import { baseApi } from '../base-api';
import { toQueryString } from '@/lib/api/query';
import type { CursorCollectionEnvelope } from '@/lib/api/contract';
import type { ConversationInboxItem } from '@ogroniedu/contracts';

export interface MessageReader {
  userId: string;
  name: string;
  seenAt: string;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderUser?: { displayName?: string | null; avatarUrl?: string | null } | null;
  senderName?: string;
  recipientUserId?: string;
  recipientUser?: { displayName?: string | null; avatarUrl?: string | null } | null;
  readByName?: string | null;
  readByUserId?: string | null;
  seenBy?: MessageReader[];
  content: string;
  /** @deprecated Backend field is `content`. Kept for backward compatibility. */
  body?: string;
  isRedacted?: boolean;
  redactionReason?: string | null;
  attachmentAssetIds?: string[];
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface BookingMessagesParams {
  bookingId: string;
  cursor?: string;
  pageSize?: number;
}

export type BookingMessagesResponse = CursorCollectionEnvelope<BookingMessage>;

export const bookingMessagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversationsInbox: builder.query<{ success: boolean; data: ConversationInboxItem[] }, void>(
      {
        query: () => '/api/v1/conversations',
        providesTags: [{ type: 'BookingMessage', id: 'INBOX' }],
      },
    ),
    getBookingMessages: builder.query<BookingMessagesResponse, BookingMessagesParams | string>({
      query: (params) => {
        const { bookingId, ...rest } = typeof params === 'string' ? { bookingId: params } : params;
        return `/api/v1/bookings/${bookingId}/messages${toQueryString(rest)}`;
      },
      providesTags: (_r, _e, params) => {
        const bookingId = typeof params === 'string' ? params : params.bookingId;
        return [
          { type: 'BookingMessage', id: bookingId },
          { type: 'BookingMessage', id: `${bookingId}:history` },
        ];
      },
    }),
    sendBookingMessage: builder.mutation<
      { success: boolean; data: BookingMessage },
      {
        bookingId: string;
        content: string;
        attachmentAssetIds?: string[];
        metadata?: Record<string, unknown>;
      }
    >({
      query: ({ bookingId, content, attachmentAssetIds, metadata }) => ({
        url: `/api/v1/bookings/${bookingId}/messages`,
        method: 'POST',
        body: { content, attachmentAssetIds, metadata },
      }),
      invalidatesTags: (_r, _e, { bookingId }) => [
        { type: 'BookingMessage', id: bookingId },
        { type: 'BookingMessage', id: `${bookingId}:history` },
        { type: 'BookingMessage', id: 'INBOX' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    markAllBookingMessagesAsRead: builder.mutation<
      { success: boolean; data: { updatedCount: number } },
      string
    >({
      query: (bookingId) => ({
        url: `/api/v1/conversations/${bookingId}/read-all`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, bookingId) => [
        { type: 'BookingMessage', id: bookingId },
        { type: 'BookingMessage', id: 'INBOX' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConversationsInboxQuery,
  useGetBookingMessagesQuery,
  useSendBookingMessageMutation,
  useMarkAllBookingMessagesAsReadMutation,
} = bookingMessagesApi;
