import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import type {
  ClassroomJoinPayload,
  ClassroomAttendeeSummary,
  ClassroomMode,
  ClassroomSessionStatus,
  ClassroomRole,
} from '@ogroniedu/contracts';

export interface ClassroomSessionInfo {
  id: string;
  sessionId: string;
  roomName: string;
  title: string;
  mode: ClassroomMode;
  status: ClassroomSessionStatus;
  maxParticipants: number;
  userRole: ClassroomRole;
  startsAt: string;
  endsAt: string;
  isTutor: boolean;
  bookingSessionStatus: string;
}

export const classroomApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClassroomSession: builder.query<ApiSuccessEnvelope<ClassroomSessionInfo>, string>({
      query: (sessionId) => `/api/v1/classroom/sessions/${sessionId}`,
      providesTags: (_res, _err, id) => [{ type: 'Classroom', id }],
    }),

    joinClassroom: builder.mutation<
      ApiSuccessEnvelope<ClassroomJoinPayload>,
      { sessionId: string; deviceInfo?: Record<string, unknown> }
    >({
      query: ({ sessionId, deviceInfo }) => ({
        url: `/api/v1/classroom/sessions/${sessionId}/join`,
        method: 'POST',
        body: { deviceInfo },
      }),
      invalidatesTags: (_res, _err, { sessionId }) => [
        { type: 'Classroom', id: sessionId },
        { type: 'Session', id: sessionId },
      ],
    }),

    raiseHand: builder.mutation<
      ApiSuccessEnvelope<{ isHandRaised: boolean }>,
      { sessionId: string; isHandRaised: boolean }
    >({
      query: ({ sessionId, isHandRaised }) => ({
        url: `/api/v1/classroom/sessions/${sessionId}/hand-raise`,
        method: 'POST',
        body: { isHandRaised },
      }),
      invalidatesTags: (_res, _err, { sessionId }) => [{ type: 'Classroom', id: sessionId }],
    }),

    promoteParticipant: builder.mutation<
      ApiSuccessEnvelope<{ participantIdentity: string; canPublish: boolean }>,
      { sessionId: string; participantIdentity: string; canPublish: boolean }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/api/v1/classroom/sessions/${sessionId}/promote`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { sessionId }) => [{ type: 'Classroom', id: sessionId }],
    }),

    muteParticipant: builder.mutation<
      ApiSuccessEnvelope<void>,
      { sessionId: string; participantIdentity: string; trackSid?: string; muted?: boolean }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/api/v1/classroom/sessions/${sessionId}/mute`,
        method: 'POST',
        body,
      }),
    }),

    kickParticipant: builder.mutation<
      ApiSuccessEnvelope<void>,
      { sessionId: string; participantIdentity: string; reason?: string }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/api/v1/classroom/sessions/${sessionId}/kick`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { sessionId }) => [{ type: 'Classroom', id: sessionId }],
    }),

    endClassroom: builder.mutation<ApiSuccessEnvelope<void>, { sessionId: string; notes?: string }>(
      {
        query: ({ sessionId, ...body }) => ({
          url: `/api/v1/classroom/sessions/${sessionId}/end`,
          method: 'POST',
          body,
        }),
        invalidatesTags: (_res, _err, { sessionId }) => [
          { type: 'Classroom', id: sessionId },
          { type: 'Session', id: sessionId },
          { type: 'Session', id: 'LIST' },
        ],
      },
    ),

    getClassroomAttendees: builder.query<ApiSuccessEnvelope<ClassroomAttendeeSummary[]>, string>({
      query: (sessionId) => `/api/v1/classroom/sessions/${sessionId}/attendees`,
      providesTags: (_res, _err, id) => [{ type: 'Classroom', id: `${id}-attendees` }],
    }),
  }),
});

export const {
  useGetClassroomSessionQuery,
  useJoinClassroomMutation,
  useRaiseHandMutation,
  usePromoteParticipantMutation,
  useMuteParticipantMutation,
  useKickParticipantMutation,
  useEndClassroomMutation,
  useGetClassroomAttendeesQuery,
} = classroomApi;
