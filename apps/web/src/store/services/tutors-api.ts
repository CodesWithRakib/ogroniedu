import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export interface TutorSubject {
  id: string;
  subjectId: string;
  subjectNameEn: string;
  subjectNameBn: string;
  educationLevelNameEn?: string;
  educationLevelNameBn?: string;
  curriculumNameEn?: string;
  curriculumNameBn?: string;
  rateMinor?: string | null;
}

export interface TutorServiceArea {
  districtNameEn: string;
  districtNameBn: string;
}

export interface TutorSearchItem {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  yearsExperience: number | null;
  teachingModes: string[];
  hourlyRateMinor: string | null;
  currency: string;
  responseTimeMinutes: number | null;
  badges: string[];
  matchScore: number;
  rankingReasons: string[];
  subjects: TutorSubject[];
  serviceAreas: TutorServiceArea[];
}

export interface SearchTutorsParams {
  q?: string;
  subjectId?: string;
  educationLevelId?: string;
  curriculumId?: string;
  mode?: 'in_person' | 'online' | 'hybrid';
  districtCode?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'experience_desc';
  page?: number;
  limit?: number;
}

export interface SearchTutorsResponse {
  success: boolean;
  data: TutorSearchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TutorOwnProfile {
  id: string;
  userId: string;
  headline?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  teachingModes?: string[];
  hourlyRateMinor?: string | null;
  verificationStatus?: string;
  publicationStatus?: string;
  [key: string]: unknown;
}

function toQueryString(params: SearchTutorsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const tutorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchTutors: builder.query<SearchTutorsResponse, SearchTutorsParams | void>({
      query: (params) => `/api/v1/tutors/search${toQueryString(params ?? {})}`,
      providesTags: [{ type: 'TutorSearch', id: 'LIST' }],
    }),
    getTutorPublicProfile: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (id) => `/api/v1/tutors/public/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'TutorProfile', id }],
    }),
    getOwnTutorProfile: builder.query<ApiSuccessEnvelope<TutorOwnProfile>, void>({
      query: () => '/api/v1/tutors/me',
      providesTags: [{ type: 'TutorProfile', id: 'ME' }],
    }),
    updateOwnTutorProfile: builder.mutation<
      ApiSuccessEnvelope<TutorOwnProfile>,
      Record<string, unknown>
    >({
      query: (body) => ({ url: '/api/v1/tutors/me/profile', method: 'PUT', body }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorSearch', id: 'LIST' },
      ],
    }),
    submitTutorVerification: builder.mutation<ApiSuccessEnvelope<TutorOwnProfile>, void>({
      query: () => ({ url: '/api/v1/tutors/me/submit-verification', method: 'POST' }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorVerification', id: 'ME' },
      ],
    }),
    setTutorPublication: builder.mutation<
      ApiSuccessEnvelope<TutorOwnProfile>,
      { publicationStatus: 'draft' | 'published' | 'unpublished' }
    >({
      query: (body) => ({ url: '/api/v1/tutors/me/publication', method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorSearch', id: 'LIST' },
      ],
    }),
    addTutorQualification: builder.mutation<ApiSuccessEnvelope<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/api/v1/tutors/me/qualifications', method: 'POST', body }),
      invalidatesTags: [{ type: 'TutorProfile', id: 'ME' }],
    }),
    deleteTutorQualification: builder.mutation<ApiSuccessEnvelope<unknown>, string>({
      query: (id) => ({ url: `/api/v1/tutors/me/qualifications/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'TutorProfile', id: 'ME' }],
    }),
    addTutorSubject: builder.mutation<ApiSuccessEnvelope<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/api/v1/tutors/me/subjects', method: 'POST', body }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorSearch', id: 'LIST' },
      ],
    }),
    deleteTutorSubject: builder.mutation<ApiSuccessEnvelope<unknown>, string>({
      query: (id) => ({ url: `/api/v1/tutors/me/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorSearch', id: 'LIST' },
      ],
    }),
    setTutorServiceAreas: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { areas: Array<{ districtCode: string; upazilaCode?: string }> }
    >({
      query: (body) => ({ url: '/api/v1/tutors/me/service-areas', method: 'PUT', body }),
      invalidatesTags: [
        { type: 'TutorProfile', id: 'ME' },
        { type: 'TutorSearch', id: 'LIST' },
      ],
    }),
    setTutorAvailability: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { slots: Array<Record<string, unknown>> }
    >({
      query: (body) => ({ url: '/api/v1/tutors/me/availability', method: 'PUT', body }),
      invalidatesTags: [{ type: 'TutorProfile', id: 'ME' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSearchTutorsQuery,
  useLazySearchTutorsQuery,
  useGetTutorPublicProfileQuery,
  useGetOwnTutorProfileQuery,
  useUpdateOwnTutorProfileMutation,
  useSubmitTutorVerificationMutation,
  useSetTutorPublicationMutation,
  useAddTutorQualificationMutation,
  useDeleteTutorQualificationMutation,
  useAddTutorSubjectMutation,
  useDeleteTutorSubjectMutation,
  useSetTutorServiceAreasMutation,
  useSetTutorAvailabilityMutation,
} = tutorsApi;
