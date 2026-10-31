import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import type { TaxonomySubject, TaxonomyCurriculum, TaxonomyEducationLevel } from './taxonomy-api';

export interface TuitionRequest {
  id: string;
  requestReference: string;
  guardianUserId: string;
  guardianUser?: {
    id: string;
    displayName: string;
    phoneE164?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  studentUserId?: string | null;
  studentName: string;
  studentGender: 'male' | 'female' | 'any';
  institutionName?: string | null;
  curriculumId?: string | null;
  curriculum?: TaxonomyCurriculum | null;
  educationLevelId?: string | null;
  educationLevel?: TaxonomyEducationLevel | null;
  streamId?: string | null;
  learningMode: 'in_person' | 'online' | 'hybrid';
  division?: string | null;
  district?: string | null;
  area?: string | null;
  addressDetails?: string | null;
  daysPerWeek?: number | null;
  preferredDays: string[];
  preferredTime?: string | null;
  salaryBudgetMin?: number | string | null;
  salaryBudgetMax?: number | string | null;
  salaryType: 'monthly' | 'per_session';
  currency: string;
  preferredTutorGender: 'male' | 'female' | 'any';
  preferredTutorBackground?: string | null;
  requirementsNotes?: string | null;
  status: 'open' | 'matched' | 'demo_scheduled' | 'confirmed' | 'cancelled' | 'closed';
  isVip: boolean;
  assignedTutorUserId?: string | null;
  assignedTutor?: {
    userId: string;
    tutorCode?: string;
    headlineEn?: string;
    headlineBn?: string;
    user?: {
      id: string;
      displayName: string;
      avatarUrl?: string;
      phoneE164?: string;
    };
  } | null;
  subjects?: TaxonomySubject[];
  suggestions?: TuitionSuggestion[];
  applications?: TuitionApplication[];
  hasApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TuitionSuggestion {
  id: string;
  requestId: string;
  tutorUserId: string;
  matchScore: number;
  adminNote?: string | null;
  status: 'suggested' | 'accepted_by_guardian' | 'declined_by_guardian' | 'demo_scheduled' | 'confirmed';
  guardianFeedback?: string | null;
  tutorProfile?: {
    userId: string;
    tutorCode?: string;
    headlineEn?: string;
    headlineBn?: string;
    yearsExperience?: number;
    hourlyRateMinor?: number | string;
    teachingModes?: string[];
    user?: {
      id: string;
      displayName: string;
      avatarUrl?: string;
    };
  };
  createdAt: string;
}

export interface TuitionApplication {
  id: string;
  requestId: string;
  tutorUserId: string;
  coverPitch: string;
  proposedSalary?: number | string | null;
  availableDays: string[];
  status: 'pending' | 'shortlisted_by_admin' | 'accepted' | 'rejected' | 'withdrawn';
  adminNotes?: string | null;
  tutorProfile?: {
    userId: string;
    tutorCode?: string;
    user?: {
      displayName: string;
      avatarUrl?: string;
    };
  };
  request?: TuitionRequest;
  createdAt: string;
}

export interface MatchCandidate {
  tutorUserId: string;
  tutorCode?: string;
  tutorName: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  district?: string;
  preferredAreas?: string[];
  publicationStatus?: string;
  verificationStatus?: string;
  headline?: string;
  hourlyRate?: number | string;
  yearsExperience?: number;
  teachingModes: string[];
  qualifications?: string[];
  matchScore: number;
  matchBreakdown: string[];
}

export interface CreateTuitionRequestInput {
  studentName: string;
  studentGender?: 'male' | 'female' | 'any';
  studentUserId?: string;
  institutionName?: string;
  curriculumId?: string;
  educationLevelId?: string;
  streamId?: string;
  subjectIds: string[];
  learningMode: 'in_person' | 'online' | 'hybrid';
  division?: string;
  district?: string;
  area?: string;
  addressDetails?: string;
  daysPerWeek?: number;
  preferredDays?: string[];
  preferredTime?: string;
  salaryBudgetMin?: number;
  salaryBudgetMax?: number;
  salaryType?: 'monthly' | 'per_session';
  preferredTutorGender?: 'male' | 'female' | 'any';
  preferredTutorBackground?: string;
  requirementsNotes?: string;
  isVip?: boolean;
}

export interface GetJobBoardQuery {
  district?: string;
  area?: string;
  learningMode?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetAdminRequestsQuery extends GetJobBoardQuery {
  status?: string;
}

export const tuitionRequestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Create request (Guardian)
    createTuitionRequest: builder.mutation<ApiSuccessEnvelope<TuitionRequest>, CreateTuitionRequestInput>({
      query: (body) => ({
        url: '/api/v1/tuition-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'TuitionRequest', id: 'MY_REQUESTS' }, { type: 'TuitionRequest', id: 'ADMIN_LIST' }],
    }),

    // 2. Guardian's own requests
    getMyTuitionRequests: builder.query<ApiSuccessEnvelope<TuitionRequest[]>, void>({
      query: () => '/api/v1/tuition-requests/my-requests',
      providesTags: [{ type: 'TuitionRequest', id: 'MY_REQUESTS' }],
    }),

    // 3. Public / Tutor Job Board
    getTuitionJobBoard: builder.query<
      ApiSuccessEnvelope<{ items: TuitionRequest[]; total: number; page: number; limit: number; totalPages: number }>,
      GetJobBoardQuery | void
    >({
      query: (params) => ({
        url: '/api/v1/tuition-requests/job-board',
        params: params || undefined,
      }),
      providesTags: [{ type: 'TuitionRequest', id: 'JOB_BOARD' }],
    }),

    // 4. Tutor applies for a request
    applyForTuition: builder.mutation<
      ApiSuccessEnvelope<TuitionApplication>,
      { requestId: string; coverPitch: string; proposedSalary?: number; availableDays?: string[] }
    >({
      query: ({ requestId, ...body }) => ({
        url: `/api/v1/tuition-requests/${requestId}/apply`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'TuitionRequest', id: 'JOB_BOARD' },
        { type: 'TuitionRequest', id: 'MY_APPLICATIONS' },
      ],
    }),

    // 5. Tutor views their applications
    getMyTuitionApplications: builder.query<ApiSuccessEnvelope<TuitionApplication[]>, void>({
      query: () => '/api/v1/tuition-requests/my-applications',
      providesTags: [{ type: 'TuitionRequest', id: 'MY_APPLICATIONS' }],
    }),

    // 6. Request details
    getTuitionRequestById: builder.query<ApiSuccessEnvelope<TuitionRequest>, string>({
      query: (id) => `/api/v1/tuition-requests/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'TuitionRequest', id }],
    }),

    // 7. Guardian responds to suggestion
    respondToTuitionSuggestion: builder.mutation<
      ApiSuccessEnvelope<TuitionSuggestion>,
      { suggestionId: string; action: 'accept' | 'decline' | 'request_demo'; feedback?: string }
    >({
      query: ({ suggestionId, ...body }) => ({
        url: `/api/v1/tuition-requests/suggestions/${suggestionId}/respond`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'TuitionRequest', id: 'MY_REQUESTS' }],
    }),

    // 8. Guardian cancels request
    cancelTuitionRequest: builder.mutation<ApiSuccessEnvelope<TuitionRequest>, string>({
      query: (id) => ({
        url: `/api/v1/tuition-requests/${id}/cancel`,
        method: 'PATCH',
      }),
      invalidatesTags: [{ type: 'TuitionRequest', id: 'MY_REQUESTS' }, { type: 'TuitionRequest', id: 'ADMIN_LIST' }],
    }),

    // 9. Admin gets all requests
    getAdminTuitionRequests: builder.query<
      ApiSuccessEnvelope<{ items: TuitionRequest[]; total: number; page: number; limit: number; totalPages: number }>,
      GetAdminRequestsQuery | void
    >({
      query: (params) => ({
        url: '/api/v1/tuition-requests/admin/all',
        params: params || undefined,
      }),
      providesTags: [{ type: 'TuitionRequest', id: 'ADMIN_LIST' }],
    }),

    // 10. Admin gets automated match candidates
    getAdminMatchCandidates: builder.query<ApiSuccessEnvelope<MatchCandidate[]>, string>({
      query: (id) => `/api/v1/tuition-requests/admin/${id}/candidates`,
      providesTags: (_res, _err, id) => [{ type: 'TuitionRequest', id: `CANDIDATES_${id}` }],
    }),

    // 11. Admin suggests tutor to guardian
    suggestTutorForRequest: builder.mutation<
      ApiSuccessEnvelope<TuitionSuggestion>,
      { requestId: string; tutorUserId: string; matchScore?: number; adminNote?: string }
    >({
      query: ({ requestId, ...body }) => ({
        url: `/api/v1/tuition-requests/admin/${requestId}/suggest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'TuitionRequest', id: 'ADMIN_LIST' },
        { type: 'TuitionRequest', id: 'MY_REQUESTS' },
      ],
    }),

    // 12. Admin updates status
    updateAdminTuitionStatus: builder.mutation<
      ApiSuccessEnvelope<TuitionRequest>,
      { requestId: string; status: string }
    >({
      query: ({ requestId, status }) => ({
        url: `/api/v1/tuition-requests/admin/${requestId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: [{ type: 'TuitionRequest', id: 'ADMIN_LIST' }],
    }),
  }),
});

export const {
  useCreateTuitionRequestMutation,
  useGetMyTuitionRequestsQuery,
  useGetTuitionJobBoardQuery,
  useApplyForTuitionMutation,
  useGetMyTuitionApplicationsQuery,
  useGetTuitionRequestByIdQuery,
  useRespondToTuitionSuggestionMutation,
  useCancelTuitionRequestMutation,
  useGetAdminTuitionRequestsQuery,
  useGetAdminMatchCandidatesQuery,
  useSuggestTutorForRequestMutation,
  useUpdateAdminTuitionStatusMutation,
} = tuitionRequestsApi;
