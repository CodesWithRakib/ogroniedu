import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import type { AuthUser } from '../slices/auth-slice';

function unwrapEnvelope<T>(response: ApiSuccessEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
}

export interface StudentProfileData {
  dateOfBirth?: string | null;
  educationLevelId?: string | null;
  curriculumId?: string | null;
  institutionName?: string | null;
  stream?: string | null;
  districtCode?: string | null;
  upazilaCode?: string | null;
  learningGoals?: string | null;
  profileVisibility?: 'private' | 'limited' | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164?: string | null;
  preferredLocale?: 'bn' | 'en';
  status: string;
  roles: AuthUser['roles'];
  isMinor?: boolean;
  studentProfile?: StudentProfileData | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UpsertStudentProfileInput {
  dateOfBirth?: string;
  educationLevelId?: string;
  curriculumId?: string;
  institutionName?: string;
  stream?: string;
  districtCode?: string;
  upazilaCode?: string;
  learningGoals?: string;
  profileVisibility?: 'private' | 'limited';
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<UserProfile, void>({
      query: () => '/api/v1/users/me',
      transformResponse: (response: ApiSuccessEnvelope<UserProfile> | UserProfile) =>
        unwrapEnvelope(response),
      providesTags: [{ type: 'User', id: 'ME' }],
    }),
    updateMyProfile: builder.mutation<
      UserProfile,
      { displayName?: string; preferredLocale?: 'bn' | 'en' }
    >({
      query: (body) => ({ url: '/api/v1/users/me', method: 'PATCH', body }),
      transformResponse: (response: ApiSuccessEnvelope<UserProfile> | UserProfile) =>
        unwrapEnvelope(response),
      invalidatesTags: [
        { type: 'User', id: 'ME' },
        { type: 'AuthUser', id: 'ME' },
      ],
    }),
    upsertStudentProfile: builder.mutation<StudentProfileData, UpsertStudentProfileInput>({
      query: (body) => ({ url: '/api/v1/users/me/student-profile', method: 'PUT', body }),
      transformResponse: (response: ApiSuccessEnvelope<StudentProfileData> | StudentProfileData) =>
        unwrapEnvelope(response),
      invalidatesTags: [
        { type: 'StudentProfile', id: 'ME' },
        { type: 'User', id: 'ME' },
        { type: 'AuthUser', id: 'ME' },
      ],
    }),
    exportMyData: builder.query<Record<string, unknown>, void>({
      query: () => '/api/v1/users/me/export',
      transformResponse: (
        response: ApiSuccessEnvelope<Record<string, unknown>> | Record<string, unknown>,
      ) => unwrapEnvelope(response),
    }),
    deleteMyAccount: builder.mutation<
      { success: boolean; message: string },
      { reason: string }
    >({
      query: (body) => ({ url: '/api/v1/users/me/delete-account', method: 'POST', body }),
      transformResponse: (
        response:
          | ApiSuccessEnvelope<{ success: boolean; message: string }>
          | { success: boolean; message: string },
      ) => unwrapEnvelope(response),
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
