import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import { toQueryString } from '@/lib/api/query';
import type { TutoringMode } from '@/features/bookings/types/booking.types';
import type {
  TutorVerificationLevel,
  VerificationDocumentReviewStatus,
  VerificationDocumentType,
  VerificationLevelStatus,
  VerificationNextAction,
} from '@ogroniedu/contracts';

export interface TutorSubject {
  id: string;
  subjectId: string;
  subjectNameEn: string;
  subjectNameBn: string;
  educationLevelId?: string;
  educationLevelNameEn?: string;
  educationLevelNameBn?: string;
  curriculumNameEn?: string;
  curriculumNameBn?: string;
  rateMinor?: string | null;
}

export interface TutorServiceArea {
  id?: string;
  districtCode?: string;
  districtNameEn: string;
  districtNameBn: string;
  upazilaCode?: string | null;
  localityName?: string | null;
  radiusKm?: number | null;
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
  /** Straight-line km when a location search was supplied; null otherwise. */
  distanceKm: number | null;
  /** Published-review average; null when the tutor has no published review. */
  ratingAverage: number | null;
  totalReviews: number;
  /** Next weekday (0=Sun…6=Sat) with an active slot; null when unknown. */
  nextAvailableWeekday: number | null;
}

export interface SearchTutorsParams {
  q?: string;
  subjectId?: string;
  educationLevelId?: string;
  curriculumId?: string;
  mode?: TutoringMode;
  districtCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minExperience?: number;
  availableWeekday?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'recommended' | 'nearest' | 'price_asc' | 'price_desc' | 'experience_desc' | 'rating_desc';
  page?: number;
  /** @deprecated Prefer pageSize (canonical). Both accepted; pageSize wins server-side. */
  limit?: number;
  /** Canonical page size (1-50). Takes precedence over limit when both are sent. */
  pageSize?: number;
}

export interface SearchTutorsResponse {
  success: boolean;
  data: TutorSearchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Canonical pagination (preferred over legacy top-level fields). */
  meta?: {
    requestId?: string;
    pagination?: {
      strategy: 'offset';
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface PublicQualification {
  id: string;
  qualificationType: string;
  institution: string | null;
  title: string;
  issuedYear?: number | null;
  isVerified: boolean;
}

export interface PublicAvailability {
  weekday: number;
  startLocal: string;
  endLocal: string;
  timezone: string;
}

export interface TutorPublicProfile {
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
  qualifications?: PublicQualification[];
  subjects: TutorSubject[];
  serviceAreas: Array<{
    id?: string;
    districtCode?: string;
    upazilaCode?: string | null;
    localityName?: string | null;
    districtNameEn?: string;
    districtNameBn?: string;
    radiusKm?: number | null;
  }>;
  availability?: PublicAvailability[];
  ratingAverage: number | null;
  totalReviews: number;
  completedSessions: number;
  nextAvailableWeekday: number | null;
}

export interface SavedTutorItem {
  tutorId: string;
  savedAt: string;
  /** Null when the tutor is no longer publicly discoverable. */
  profile: TutorPublicProfile | null;
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

/* -------------------------------------------------------------------------- */
/* Three-level verification dossier (Phase 02)                                */
/* -------------------------------------------------------------------------- */

export interface VerificationLevelRequirementsView {
  level: TutorVerificationLevel;
  requiredDocumentTypes: VerificationDocumentType[];
  anyOfDocumentTypes: VerificationDocumentType[];
  /** Required types with no approved document (blocks level approval). */
  missingRequiredDocumentTypes: VerificationDocumentType[];
  anyOfSatisfied: boolean;
  complete: boolean;
  /** Required types with no upload at all (blocks submission). */
  missingUploadDocumentTypes: VerificationDocumentType[];
  submitReady: boolean;
  nextAction: VerificationNextAction;
}

export interface VerificationDocumentView {
  id: string;
  level: TutorVerificationLevel;
  documentType: VerificationDocumentType;
  fileAssetId: string;
  originalFilename?: string | null;
  mediaType?: string | null;
  sizeBytes?: number | null;
  reviewStatus: VerificationDocumentReviewStatus;
  reasonCode: string | null;
  expiresOn: string | null;
  createdAt: string;
}

export interface VerificationLevelView {
  id: string;
  level: TutorVerificationLevel;
  status: VerificationLevelStatus;
  assignedReviewerUserId: string | null;
  decisionReasonCode: string | null;
  /** Applicant-facing feedback only. */
  applicantFeedback: string | null;
  expiresAt: string | null;
  decidedAt: string | null;
  lastSubmittedAt: string | null;
  firstSubmittedAt?: string | null;
  submissionCount?: number;
  policyVersion: string;
  version: number;
  requirements: VerificationLevelRequirementsView;
  documents: VerificationDocumentView[];
}

export interface TutorVerificationDossier {
  profile: {
    userId: string;
    headline?: string | null;
    bio?: string | null;
    yearsExperience?: number | null;
    teachingModes?: string[];
    hourlyRateMinor?: string | null;
    currency?: string;
    verificationStatus: string;
    publicationStatus: string;
    verifiedAt?: string | null;
    verificationExpiresAt?: string | null;
    verificationPolicyVersion?: string | null;
  };
  user: {
    id: string;
    displayName: string;
    email?: string | null;
    phoneE164?: string | null;
  } | null;
  levels: VerificationLevelView[];
  policyVersion?: string | null;
  expiringDocuments?: Array<{
    documentId: string;
    level: TutorVerificationLevel;
    documentType: VerificationDocumentType;
    expiresOn: string | null;
  }>;
}

export interface AddVerificationDocumentRequest {
  level: TutorVerificationLevel;
  documentType: VerificationDocumentType;
  fileAssetId: string;
  expiresOn?: string;
}

export const tutorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchTutors: builder.query<SearchTutorsResponse, SearchTutorsParams | void>({
      query: (params) => `/api/v1/tutors/search${toQueryString(params ?? {})}`,
      providesTags: [{ type: 'TutorSearch', id: 'LIST' }],
    }),
    getTutorPublicProfile: builder.query<ApiSuccessEnvelope<TutorPublicProfile>, string>({
      query: (id) => `/api/v1/tutors/public/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'TutorProfile', id }],
    }),
    getSavedTutors: builder.query<ApiSuccessEnvelope<SavedTutorItem[]>, void>({
      query: () => '/api/v1/saved-tutors',
      providesTags: [{ type: 'SavedTutor', id: 'LIST' }],
    }),
    saveTutor: builder.mutation<ApiSuccessEnvelope<SavedTutorItem>, string>({
      query: (tutorUserId) => ({
        url: `/api/v1/saved-tutors/${tutorUserId}`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'SavedTutor', id: 'LIST' }],
    }),
    unsaveTutor: builder.mutation<ApiSuccessEnvelope<{ removed: boolean }>, string>({
      query: (tutorUserId) => ({
        url: `/api/v1/saved-tutors/${tutorUserId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SavedTutor', id: 'LIST' }],
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

    /* ---------------------------------------------------------------------- */
    /* Applicant dossier                                                      */
    /* ---------------------------------------------------------------------- */

    getOwnVerificationDossier: builder.query<ApiSuccessEnvelope<TutorVerificationDossier>, void>({
      query: () => '/api/v1/tutors/me/verification',
      providesTags: [{ type: 'TutorVerification', id: 'ME' }],
    }),
    addVerificationDocument: builder.mutation<
      ApiSuccessEnvelope<{
        document: VerificationDocumentView;
        levelRecord: VerificationLevelView;
      }>,
      AddVerificationDocumentRequest
    >({
      query: (body) => ({ url: '/api/v1/tutors/me/verification/documents', method: 'POST', body }),
      invalidatesTags: [{ type: 'TutorVerification', id: 'ME' }],
    }),
    deleteVerificationDocument: builder.mutation<ApiSuccessEnvelope<null>, string>({
      query: (id) => ({
        url: `/api/v1/tutors/me/verification/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'TutorVerification', id: 'ME' }],
    }),
    submitVerificationLevel: builder.mutation<ApiSuccessEnvelope<VerificationLevelView>, string>({
      query: (level) => ({
        url: `/api/v1/tutors/me/verification/levels/${level}/submit`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'TutorVerification', id: 'ME' },
        { type: 'TutorProfile', id: 'ME' },
      ],
    }),
    reopenVerificationLevel: builder.mutation<ApiSuccessEnvelope<VerificationLevelView>, string>({
      query: (level) => ({
        url: `/api/v1/tutors/me/verification/levels/${level}/reopen`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'TutorVerification', id: 'ME' },
        { type: 'TutorProfile', id: 'ME' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSearchTutorsQuery,
  useLazySearchTutorsQuery,
  useGetTutorPublicProfileQuery,
  useGetSavedTutorsQuery,
  useSaveTutorMutation,
  useUnsaveTutorMutation,
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
  useGetOwnVerificationDossierQuery,
  useAddVerificationDocumentMutation,
  useDeleteVerificationDocumentMutation,
  useSubmitVerificationLevelMutation,
  useReopenVerificationLevelMutation,
} = tutorsApi;
