import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import { toQueryString } from '@/lib/api/query';
import type { OffsetCollectionEnvelope } from '@/lib/api/contract';
import type {
  OrganizationRecord,
  OrganizationMemberRecord,
  OrganizationInvitationRecord,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationStatusInput,
  InviteOrganizationMemberInput,
  TransferOrganizationOwnershipInput,
} from '@ogroniedu/contracts';

export interface ListOrganizationsParams {
  search?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const organizationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Platform Admin: list all organizations
    getAdminOrganizations: builder.query<
      OffsetCollectionEnvelope<OrganizationRecord>,
      ListOrganizationsParams | void
    >({
      query: (params) => {
        const qs = params ? toQueryString(params as Record<string, unknown>) : '';
        return `/api/v1/admin/organizations${qs}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Organizations' as const, id })),
              { type: 'Organizations', id: 'LIST' },
            ]
          : [{ type: 'Organizations', id: 'LIST' }],
    }),

    // Platform Admin: approve, suspend, archive
    adminUpdateOrganizationStatus: builder.mutation<
      ApiSuccessEnvelope<OrganizationRecord>,
      { id: string } & UpdateOrganizationStatusInput
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/admin/organizations/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: 'LIST' },
      ],
    }),

    // User: list affiliated organizations
    getMyOrganizations: builder.query<ApiSuccessEnvelope<OrganizationRecord[]>, void>({
      query: () => '/api/v1/organizations',
      providesTags: [{ type: 'Organizations', id: 'MY_LIST' }],
    }),

    // Organization details
    getOrganization: builder.query<
      ApiSuccessEnvelope<OrganizationRecord & { memberCount: number }>,
      string
    >({
      query: (id) => `/api/v1/organizations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Organizations', id }],
    }),

    // Create organization
    createOrganization: builder.mutation<ApiSuccessEnvelope<OrganizationRecord>, CreateOrganizationInput>({
      query: (body) => ({
        url: '/api/v1/organizations',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Organizations', id: 'LIST' },
        { type: 'Organizations', id: 'MY_LIST' },
      ],
    }),

    // Update organization
    updateOrganization: builder.mutation<
      ApiSuccessEnvelope<OrganizationRecord>,
      { id: string } & UpdateOrganizationInput
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/organizations/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: 'LIST' },
        { type: 'Organizations', id: 'MY_LIST' },
      ],
    }),

    // List members
    getOrganizationMembers: builder.query<ApiSuccessEnvelope<OrganizationMemberRecord[]>, string>({
      query: (id) => `/api/v1/organizations/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'Organizations', id: `MEMBERS_${id}` }],
    }),

    // Invite member
    inviteOrganizationMember: builder.mutation<
      ApiSuccessEnvelope<OrganizationInvitationRecord>,
      { id: string } & InviteOrganizationMemberInput
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/organizations/${id}/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Organizations', id: `MEMBERS_${id}` }],
    }),

    // Accept invitation
    acceptOrganizationInvitation: builder.mutation<
      ApiSuccessEnvelope<{ organization: OrganizationRecord; member: OrganizationMemberRecord }>,
      { token: string }
    >({
      query: (body) => ({
        url: '/api/v1/organizations/invitations/accept',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Organizations', id: 'MY_LIST' },
        { type: 'Organizations', id: 'LIST' },
      ],
    }),

    // Remove member
    removeOrganizationMember: builder.mutation<
      ApiSuccessEnvelope<{ message: string }>,
      { id: string; memberUserId: string }
    >({
      query: ({ id, memberUserId }) => ({
        url: `/api/v1/organizations/${id}/members/${memberUserId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: `MEMBERS_${id}` },
      ],
    }),

    // Transfer ownership
    transferOrganizationOwnership: builder.mutation<
      ApiSuccessEnvelope<OrganizationRecord>,
      { id: string } & TransferOrganizationOwnershipInput
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/organizations/${id}/transfer-ownership`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: 'LIST' },
        { type: 'Organizations', id: 'MY_LIST' },
      ],
    }),
  }),
});

export const {
  useGetAdminOrganizationsQuery,
  useAdminUpdateOrganizationStatusMutation,
  useGetMyOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useGetOrganizationMembersQuery,
  useInviteOrganizationMemberMutation,
  useAcceptOrganizationInvitationMutation,
  useRemoveOrganizationMemberMutation,
  useTransferOrganizationOwnershipMutation,
} = organizationsApi;
