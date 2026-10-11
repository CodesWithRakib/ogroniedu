import { baseApi } from '../base-api';

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderName?: string;
  content: string;
  /** @deprecated Backend field is `content`. Kept for backward compatibility. */
  body?: string;
  isRedacted?: boolean;
  createdAt: string;
}

export const bookingMessagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBookingMessages: builder.query<{ success: boolean; data: BookingMessage[] }, string>({
      query: (bookingId) => `/api/v1/bookings/${bookingId}/messages`,
      providesTags: (_r, _e, bookingId) => [{ type: 'BookingMessage', id: bookingId }],
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
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetBookingMessagesQuery, useSendBookingMessageMutation } = bookingMessagesApi;
