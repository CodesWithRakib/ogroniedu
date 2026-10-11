import { baseApi } from '../base-api';
import { toQueryString } from '@/lib/api/query';
import type { CursorCollectionEnvelope } from '@/lib/api/contract';

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderUser?: { displayName?: string | null } | null;
  senderName?: string;
  content: string;
  /** @deprecated Backend field is `content`. Kept for backward compatibility. */
  body?: string;
  isRedacted?: boolean;
  redactionReason?: string | null;
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
    getBookingMessages: builder.query<BookingMessagesResponse, BookingMessagesParams | string>({
      query: (params) => {
        const { bookingId, ...rest } =
          typeof params === 'string' ? { bookingId: params } : params;
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
      { bookingId: string; content: string }
    >({
      query: ({ bookingId, content }) => ({
        url: `/api/v1/bookings/${bookingId}/messages`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_r, _e, { bookingId }) => [
        { type: 'BookingMessage', id: bookingId },
        { type: 'BookingMessage', id: `${bookingId}:history` },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetBookingMessagesQuery, useSendBookingMessageMutation } = bookingMessagesApi;
