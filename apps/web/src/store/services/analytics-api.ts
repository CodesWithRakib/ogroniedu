import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export interface AnalyticsTimeParams {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  days?: number;
}

function toQuery(params: AnalyticsTimeParams | void): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.startDate) search.append('startDate', params.startDate);
  if (params.endDate) search.append('endDate', params.endDate);
  if (params.from) search.append('from', params.from);
  if (params.to) search.append('to', params.to);
  if (params.days !== undefined) search.append('days', String(params.days));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export interface MyTutorAnalyticsData {
  tutorUserId: string;
  timeWindow: {
    startDate: string;
    endDate: string;
  };
  inquiries: {
    totalInquiries: number;
    acceptedInquiries: number;
    declinedInquiries: number;
    acceptanceRate: number;
  };
  sessions: {
    totalSessions: number;
    completedSessions: number;
    noShowSessions: number;
    completionRate: number;
  };
  earnings:
    | {
        totalEarningsBdt?: number;
      }
    | number;
  rating: {
    reviewsCount: number;
    averageRating: number;
  };
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<ApiSuccessEnvelope<unknown>, AnalyticsTimeParams | void>({
      query: (params) => `/api/v1/analytics/overview${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'OVERVIEW' }],
    }),
    getFinancialAnalytics: builder.query<ApiSuccessEnvelope<unknown>, AnalyticsTimeParams | void>({
      query: (params) => `/api/v1/analytics/financials${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'FINANCIALS' }],
    }),
    getTutorPerformanceAnalytics: builder.query<
      ApiSuccessEnvelope<unknown>,
      AnalyticsTimeParams | void
    >({
      query: (params) => `/api/v1/analytics/tutors${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'TUTORS' }],
    }),
    getRetentionAnalytics: builder.query<ApiSuccessEnvelope<unknown>, AnalyticsTimeParams | void>({
      query: (params) => `/api/v1/analytics/retention${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'RETENTION' }],
    }),
    getMyTutorAnalytics: builder.query<
      ApiSuccessEnvelope<MyTutorAnalyticsData>,
      AnalyticsTimeParams | void
    >({
      query: (params) => `/api/v1/analytics/tutors/me${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'ME' }],
    }),
    getFunnelAnalytics: builder.query<ApiSuccessEnvelope<unknown>, AnalyticsTimeParams | void>({
      query: (params) => `/api/v1/analytics/funnel${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'FUNNEL' }],
    }),
    getActivationAnalytics: builder.query<ApiSuccessEnvelope<unknown>, AnalyticsTimeParams | void>({
      query: (params) => `/api/v1/analytics/activation${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'ACTIVATION' }],
    }),
    getLearningEngagementAnalytics: builder.query<
      ApiSuccessEnvelope<unknown>,
      AnalyticsTimeParams | void
    >({
      query: (params) => `/api/v1/analytics/learning${toQuery(params)}`,
      providesTags: [{ type: 'Analytics', id: 'LEARNING' }],
    }),
    getOrganizationAnalytics: builder.query<
      ApiSuccessEnvelope<unknown>,
      { organizationId: string; params?: AnalyticsTimeParams }
    >({
      query: ({ organizationId, params }) =>
        `/api/v1/analytics/organizations/${organizationId}${toQuery(params)}`,
      providesTags: (_res, _err, { organizationId }) => [
        { type: 'Analytics', id: `ORG_${organizationId}` },
      ],
    }),
    trackAnalyticsEvent: builder.mutation<
      ApiSuccessEnvelope<{ recorded: boolean }>,
      {
        eventName: string;
        sessionId?: string;
        entityType?: string;
        entityId?: string;
        properties?: Record<string, unknown>;
        clientTimestamp?: string;
      }
    >({
      query: (body) => ({
        url: '/api/v1/analytics/events',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetFinancialAnalyticsQuery,
  useGetTutorPerformanceAnalyticsQuery,
  useGetRetentionAnalyticsQuery,
  useGetMyTutorAnalyticsQuery,
  useGetFunnelAnalyticsQuery,
  useGetActivationAnalyticsQuery,
  useGetLearningEngagementAnalyticsQuery,
  useGetOrganizationAnalyticsQuery,
  useTrackAnalyticsEventMutation,
} = analyticsApi;
