import { baseApi } from '../base-api';

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

export const guardiansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLinkedChildren: builder.query<LinkedChild[], void>({
      query: () => '/api/v1/guardians/children',
      transformResponse: (response: any) => (Array.isArray(response) ? response : response?.data ?? []),
      providesTags: (result) =>
        result
          ? [
              { type: 'GuardianChild', id: 'LIST' },
              ...result.map((c) => ({ type: 'GuardianChild' as const, id: c.studentId })),
            ]
          : [{ type: 'GuardianChild', id: 'LIST' }],
    }),
    registerChild: builder.mutation<
      LinkedChild,
      {
        displayName: string;
        dateOfBirth?: string;
        institutionName?: string;
        educationLevelId?: string;
        relationshipType: string;
        consentPolicyVersion: string;
        consentAgreed: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/guardians/children', method: 'POST', body }),
      transformResponse: (response: any) => response?.data ?? response,
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
      transformResponse: (response: any) => response?.data ?? response,
      invalidatesTags: [{ type: 'GuardianChild', id: 'LIST' }],
    }),
    getChildDetails: builder.query<LinkedChild, string>({
      query: (studentId) => `/api/v1/guardians/children/${studentId}`,
      transformResponse: (response: any) => response?.data ?? response,
      providesTags: (_r, _e, id) => [{ type: 'GuardianChild', id }],
    }),
    revokeChildLink: builder.mutation<unknown, { studentId: string; reason: string }>({
      query: ({ studentId, ...body }) => ({
        url: `/api/v1/guardians/children/${studentId}`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (_r, _e, { studentId }) => [
        { type: 'GuardianChild', id: studentId },
        { type: 'GuardianChild', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLinkedChildrenQuery,
  useRegisterChildMutation,
  useLinkChildRequestMutation,
  useGetChildDetailsQuery,
  useRevokeChildLinkMutation,
} = guardiansApi;
