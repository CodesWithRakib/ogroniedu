import { baseApi } from '../base-api';
import type { AuthUser } from '../slices/auth-slice';

export type RegisterRole = 'student' | 'guardian' | 'tutor';

export interface RegisterRequest {
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
  role: RegisterRole;
  preferredLocale?: 'bn' | 'en';
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponseUser {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: AuthUser['roles'];
  status: string;
  preferredLocale: 'bn' | 'en';
}

export interface AuthResponse {
  user: AuthResponseUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  preferredLocale: 'bn' | 'en';
  status: string;
  roles: AuthUser['roles'];
}

export function toAuthUser(raw: AuthResponseUser | MeResponse): AuthUser {
  return {
    id: raw.id,
    displayName: raw.displayName,
    email: raw.email,
    phone: raw.phone,
    roles: raw.roles,
    status: 'status' in raw ? raw.status : undefined,
    preferredLocale: raw.preferredLocale,
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/api/v1/auth/register', method: 'POST', body }),
      invalidatesTags: [{ type: 'AuthUser', id: 'ME' }],
    }),
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/api/v1/auth/login', method: 'POST', body }),
      invalidatesTags: [{ type: 'AuthUser', id: 'ME' }],
    }),
    refresh: builder.mutation<RefreshResponse, { refreshToken: string }>({
      query: (body) => ({ url: '/api/v1/auth/refresh', method: 'POST', body }),
    }),
    logout: builder.mutation<{ success: boolean; message: string }, { refreshToken?: string }>({
      query: (body) => ({ url: '/api/v1/auth/logout', method: 'POST', body }),
      invalidatesTags: [{ type: 'AuthUser', id: 'ME' }],
    }),
    revokeAllSessions: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({ url: '/api/v1/auth/revoke-all', method: 'POST', body: {} }),
      invalidatesTags: [{ type: 'AuthUser', id: 'ME' }],
    }),
    getSessionUser: builder.query<MeResponse, void>({
      query: () => '/api/v1/auth/me',
      providesTags: [{ type: 'AuthUser', id: 'ME' }],
    }),
    requestCode: builder.mutation<
      { success: boolean; message: string; contact: string; expiresInSeconds: number },
      { contact: string; purpose: 'contact_verification' | 'password_recovery' | string }
    >({
      query: (body) => ({ url: '/api/v1/auth/request-code', method: 'POST', body }),
    }),
    verifyCode: builder.mutation<
      { success: boolean; message: string },
      { contact: string; code: string; purpose: string }
    >({
      query: (body) => ({ url: '/api/v1/auth/verify-code', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<
      { success: boolean; message: string },
      { contact: string; code: string; newPassword: string }
    >({
      query: (body) => ({ url: '/api/v1/auth/reset-password', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useRevokeAllSessionsMutation,
  useGetSessionUserQuery,
  useLazyGetSessionUserQuery,
  useRequestCodeMutation,
  useVerifyCodeMutation,
  useResetPasswordMutation,
} = authApi;
