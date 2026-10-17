import { baseApi, type ApiSuccessEnvelope } from '../base-api';

function unwrapEnvelope<T>(response: ApiSuccessEnvelope<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    response.data !== undefined
  ) {
    return response.data as T;
  }
  return response as T;
}

function unwrapArray<T>(response: ApiSuccessEnvelope<T[]> | T[]): T[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data)
  ) {
    return response.data;
  }
  return [];
}

export interface LinkedChild {
  linkId: string;
  studentId: string;
  displayName: string;
  relationshipType: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: string | null;
  isMinor: boolean;
  institutionName?: string | null;
  educationLevelName?: string | null;
}

export interface LinkedGuardian {
  linkId: string;
  guardianId: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  relationshipType: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: string | null;
}

export const guardiansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLinkedChildren: builder.query<LinkedChild[], void>({
      query: () => '/api/v1/guardians/children',
      transformResponse: (response: ApiSuccessEnvelope<LinkedChild[]> | LinkedChild[]) =>
        unwrapArray(response),
      providesTags: (result) =>
        result
          ? [
              { type: 'GuardianChild', id: 'LIST' },
              ...result.map((c) => ({ type: 'GuardianChild' as const, id: c.studentId })),
            ]
          : [{ type: 'GuardianChild', id: 'LIST' }],
    }),
    getMyGuardians: builder.query<LinkedGuardian[], void>({
      query: () => '/api/v1/guardians/my-guardians',
      transformResponse: (response: ApiSuccessEnvelope<LinkedGuardian[]> | LinkedGuardian[]) =>
        unwrapArray(response),
      providesTags: [{ type: 'GuardianChild', id: 'MY_GUARDIANS' }],
    }),
    registerChild: builder.mutation<
      LinkedChild,
      {
        displayName: string;
        dateOfBirth?: string;
        institutionName?: string;
        educationLevelId?: string;
        curriculumId?: string;
        stream?: string;
        learningGoals?: string;
        gender?: string;
        email?: string;
        phone?: string;
        relationshipType: string;
        consentPolicyVersion: string;
        consentAgreed: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/guardians/children', method: 'POST', body }),
      transformResponse: (response: ApiSuccessEnvelope<LinkedChild> | LinkedChild) =>
        unwrapEnvelope(response),
      invalidatesTags: [{ type: 'GuardianChild', id: 'LIST' }],
    }),
    linkChildRequest: builder.mutation<
      LinkedChild,
      {
        studentIdentifier: string;
        relationshipType: string;
        consentPolicyVersion: string;
        consentAgreed: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/guardians/children/link-request', method: 'POST', body }),
      transformResponse: (response: ApiSuccessEnvelope<LinkedChild> | LinkedChild) =>
        unwrapEnvelope(response),
      invalidatesTags: [{ type: 'GuardianChild', id: 'LIST' }],
    }),
    getChildDetails: builder.query<LinkedChild, string>({
      query: (studentId) => `/api/v1/guardians/children/${studentId}`,
      transformResponse: (response: ApiSuccessEnvelope<LinkedChild> | LinkedChild) =>
        unwrapEnvelope(response),
      providesTags: (_r, _e, id) => [{ type: 'GuardianChild', id }],
    }),
    verifyChildLink: builder.mutation<
      { success: boolean; message?: string },
      { linkId: string; decision: 'approve' | 'reject' }
    >({
      query: ({ linkId, ...body }) => ({
        url: `/api/v1/guardians/children/${linkId}/verify`,
        method: 'POST',
        body,
      }),
      transformResponse: (
        response:
          | ApiSuccessEnvelope<{ success: boolean; message?: string }>
          | { success: boolean; message?: string },
      ) => unwrapEnvelope(response),
      invalidatesTags: [
        { type: 'GuardianChild', id: 'MY_GUARDIANS' },
        { type: 'GuardianChild', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    revokeChildLink: builder.mutation<
      { success: boolean; message: string },
      { studentId: string; reason: string }
    >({
      query: ({ studentId, ...body }) => ({
        url: `/api/v1/guardians/children/${studentId}`,
        method: 'DELETE',
        body,
      }),
      transformResponse: (
        response:
          | ApiSuccessEnvelope<{ success: boolean; message: string }>
          | { success: boolean; message: string },
      ) => unwrapEnvelope(response),
      invalidatesTags: (_r, _e, { studentId }) => [
        { type: 'GuardianChild', id: studentId },
        { type: 'GuardianChild', id: 'LIST' },
        { type: 'GuardianChild', id: 'MY_GUARDIANS' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLinkedChildrenQuery,
  useGetMyGuardiansQuery,
  useRegisterChildMutation,
  useLinkChildRequestMutation,
  useGetChildDetailsQuery,
  useVerifyChildLinkMutation,
  useRevokeChildLinkMutation,
} = guardiansApi;
