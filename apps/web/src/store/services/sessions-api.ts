import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import { toQueryString } from '@/lib/api/query';

export type SessionStatus =
  'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'reschedule_pending';

export interface SessionItem {
  id: string;
  bookingId: string;
  subjectName?: string;
  tutorName?: string;
  studentName?: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  status: SessionStatus;
  meetingUrl?: string | null;
  locationInstructions?: string | null;
  [key: string]: unknown;
}

export interface GetSessionsParams {
  bookingId?: string;
  studentId?: string;
  tutorId?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
}

export const sessionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSessions: builder.query<ApiSuccessEnvelope<SessionItem[]>, GetSessionsParams | void>({
      query: (params) =>
        `/api/v1/sessions${toQueryString({
          bookingId: params?.bookingId,
          studentId: params?.studentId,
          tutorId: params?.tutorId,
          from: params?.from,
          to: params?.to,
          status: params?.status,
        })}`,
      providesTags: (result) =>
        result
          ? [
              { type: 'Session', id: 'LIST' },
              ...result.data.map((s) => ({ type: 'Session' as const, id: s.id })),
            ]
          : [{ type: 'Session', id: 'LIST' }],
    }),
    getSessionById: builder.query<ApiSuccessEnvelope<SessionItem>, string>({
      query: (id) => `/api/v1/sessions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Session', id }],
    }),
    scheduleSession: builder.mutation<
      ApiSuccessEnvelope<SessionItem>,
      { bookingId: string; startsAt: string; meetingUrl?: string; locationInstructions?: string }
    >({
      query: (body) => ({ url: '/api/v1/sessions', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),
    scheduleRecurringSessions: builder.mutation<
      ApiSuccessEnvelope<SessionItem[]>,
      Record<string, unknown>
    >({
      query: (body) => ({ url: '/api/v1/sessions/recurring', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    rescheduleSession: builder.mutation<
      ApiSuccessEnvelope<SessionItem>,
      { id: string; newStartsAt: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/sessions/${id}/reschedule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    cancelSession: builder.mutation<
      ApiSuccessEnvelope<{ session: SessionItem; policyAssessment: unknown }>,
      { id: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/sessions/${id}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    startSession: builder.mutation<ApiSuccessEnvelope<SessionItem>, string>({
      query: (id) => ({
        url: `/api/v1/sessions/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    completeSession: builder.mutation<
      ApiSuccessEnvelope<SessionItem>,
      { id: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/sessions/${id}/complete`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    updateMeetingUrl: builder.mutation<
      ApiSuccessEnvelope<SessionItem>,
      { id: string; meetingUrl: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/sessions/${id}/meeting-url`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
      ],
    }),
    markNoShow: builder.mutation<ApiSuccessEnvelope<SessionItem>, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/v1/sessions/${id}/no-show`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getTutorCalendar: builder.query<
      ApiSuccessEnvelope<Array<Record<string, unknown>>>,
      { tutorId: string; from?: string; to?: string }
    >({
      query: ({ tutorId, from, to }) =>
        `/api/v1/tutors/${tutorId}/calendar${toQueryString({ from, to })}`,
      providesTags: (_r, _e, arg) => [{ type: 'TutorCalendar', id: arg.tutorId }],
    }),
    getIcsCalendar: builder.query<
      ApiSuccessEnvelope<{ icsContent: string; filename: string; eventsCount: number }>,
      GetSessionsParams | void
    >({
      query: (params) =>
        `/api/v1/sessions/calendar/ical${toQueryString({
          bookingId: params?.bookingId,
          studentId: params?.studentId,
          tutorId: params?.tutorId,
          from: params?.from,
          to: params?.to,
          status: params?.status,
        })}`,
      providesTags: [{ type: 'Session', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useScheduleSessionMutation,
  useScheduleRecurringSessionsMutation,
  useRescheduleSessionMutation,
  useCancelSessionMutation,
  useStartSessionMutation,
  useCompleteSessionMutation,
  useUpdateMeetingUrlMutation,
  useMarkNoShowMutation,
  useGetTutorCalendarQuery,
  useGetIcsCalendarQuery,
  useLazyGetIcsCalendarQuery,
} = sessionsApi;
