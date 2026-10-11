import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type TutoringMode = 'in_person' | 'online' | 'hybrid';

export interface CreateBookingRequest {
  tutorId: string;
  studentId: string;
  subjectId: string;
  educationLevelId: string;
  mode: TutoringMode;
  messageNotes?: string;
  preferredDays?: number[];
}

export interface BookingRequestItem {
  id: string;
  tutorId: string;
  studentId: string;
  subjectId: string;
  educationLevelId: string;
  mode: TutoringMode;
  status: 'requested' | 'accepted' | 'declined' | 'withdrawn' | 'cancelled' | string;
  messageNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createBookingRequest: builder.mutation<ApiSuccessEnvelope<BookingRequestItem>, CreateBookingRequest>({
      query: (body) => ({ url: '/api/v1/requests', method: 'POST', body }),
      invalidatesTags: [
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),
    getBookingRequests: builder.query<ApiSuccessEnvelope<BookingRequestItem[]>, void>({
      query: () => '/api/v1/requests',
      providesTags: (result) =>
        result
          ? [
              { type: 'BookingRequest', id: 'LIST' },
              ...result.data.map((item) => ({ type: 'BookingRequest' as const, id: item.id })),
            ]
          : [{ type: 'BookingRequest', id: 'LIST' }],
    }),
    getBookingRequestById: builder.query<ApiSuccessEnvelope<BookingRequestItem>, string>({
      query: (id) => `/api/v1/requests/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'BookingRequest', id }],
    }),
    withdrawBookingRequest: builder.mutation<
      ApiSuccessEnvelope<BookingRequestItem>,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/api/v1/requests/${id}/withdraw`,
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'BookingRequest', id },
        { type: 'BookingRequest', id: 'LIST' },
      ],
    }),
    respondBookingRequest: builder.mutation<
      ApiSuccessEnvelope<BookingRequestItem>,
      { id: string; action: 'accept' | 'decline'; reasonNotes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/requests/${id}/respond`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'BookingRequest', id },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateBookingRequestMutation,
  useGetBookingRequestsQuery,
  useGetBookingRequestByIdQuery,
  useWithdrawBookingRequestMutation,
  useRespondBookingRequestMutation,
} = bookingsApi;
