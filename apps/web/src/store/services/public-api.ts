import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export interface PlatformStats {
  verifiedTutors: number;
  activeStudents: number;
  completedSessions: number;
  averageRating: number | null;
}

/** Unauthenticated platform aggregates for the public site (no PII). */
export const publicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformStats: builder.query<ApiSuccessEnvelope<PlatformStats>, void>({
      query: () => '/api/v1/public/stats',
    }),
  }),
  overrideExisting: false,
});

export const { useGetPlatformStatsQuery } = publicApi;
