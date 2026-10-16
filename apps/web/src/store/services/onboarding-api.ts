import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type OnboardingStepState = 'pending' | 'completed' | 'pending_review';
export type OnboardingTrackStatus = 'not_started' | 'in_progress' | 'pending_review' | 'completed';

export interface OnboardingStep {
  key: string;
  titleEn: string;
  titleBn: string;
  required: boolean;
  submittable: boolean;
  approvalGated: boolean;
  status: OnboardingStepState;
}

export interface OnboardingStatus {
  role: string | null;
  roleLabelEn: string | null;
  roleLabelBn: string | null;
  status: OnboardingTrackStatus;
  isComplete: boolean;
  requiresApproval: boolean;
  completedSteps: string[];
  pendingSteps: string[];
  steps: OnboardingStep[];
  nextStep: string | null;
  verificationStatus: string | null;
  updatedAt: string | null;
}

export interface CompleteStepRequest {
  stepKey: string;
  payload: Record<string, unknown>;
}

function unwrapEnvelope<T>(response: ApiSuccessEnvelope<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    response.data !== undefined
  ) {
    return response.data as T;
  }
  return response as T;
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyOnboarding: builder.query<OnboardingStatus, void>({
      query: () => '/api/v1/onboarding/me',
      transformResponse: (response: ApiSuccessEnvelope<OnboardingStatus> | OnboardingStatus) =>
        unwrapEnvelope(response),
      providesTags: [{ type: 'Onboarding', id: 'ME' }],
    }),
    completeOnboardingStep: builder.mutation<OnboardingStatus, CompleteStepRequest>({
      query: ({ stepKey, payload }) => ({
        url: `/api/v1/onboarding/steps/${encodeURIComponent(stepKey)}`,
        method: 'POST',
        body: { payload },
      }),
      transformResponse: (response: ApiSuccessEnvelope<OnboardingStatus> | OnboardingStatus) =>
        unwrapEnvelope(response),
      invalidatesTags: [{ type: 'Onboarding', id: 'ME' }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetMyOnboardingQuery, useCompleteOnboardingStepMutation } = onboardingApi;
