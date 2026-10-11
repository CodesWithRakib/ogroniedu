import { baseApi } from '../base-api';
import type { AuthUser } from '../slices/auth-slice';

export interface UserProfile extends Record<string, unknown> {
  id: string;
  displayName: string;
  email: string | null;
  roles: AuthUser['roles'];
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<UserProfile, void>({
      query: () => '/api/v1/users/me',
      providesTags: [{ type: 'User', id: 'ME' }],
    }),
    updateMyProfile: builder.mutation<UserProfile, { displayName?: string; preferredLocale?: 'bn' | 'en' }>({
      query: (body) => ({ url: '/api/v1/users/me', method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'User', id: 'ME' },
        { type: 'AuthUser', id: 'ME' },
      ],
    }),
    upsertStudentProfile: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/api/v1/users/me/student-profile', method: 'PUT', body }),
      invalidatesTags: [
        { type: 'StudentProfile', id: 'ME' },
        { type: 'User', id: 'ME' },
      ],
    }),
    exportMyData: builder.query<unknown, void>({
      query: () => '/api/v1/users/me/export',
    }),
    deleteMyAccount: builder.mutation<unknown, { reason: string }>({
      query: (body) => ({ url: '/api/v1/users/me/delete-account', method: 'POST', body }),
      invalidatesTags: [
        { type: 'User', id: 'ME' },
        { type: 'AuthUser', id: 'ME' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUpsertStudentProfileMutation,
  useExportMyDataQuery,
  useDeleteMyAccountMutation,
} = usersApi;
