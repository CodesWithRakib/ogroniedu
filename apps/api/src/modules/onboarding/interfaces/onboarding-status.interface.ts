/** Derived state of an individual onboarding step. */
export type OnboardingStepState = 'pending' | 'completed' | 'pending_review';

export interface OnboardingStepStatus {
  key: string;
  titleEn: string;
  titleBn: string;
  required: boolean;
  submittable: boolean;
  approvalGated: boolean;
  status: OnboardingStepState;
}

/** Overall onboarding track status, derived from trusted server-side records. */
export type OnboardingTrackStatus = 'not_started' | 'in_progress' | 'pending_review' | 'completed';

export interface OnboardingStatus {
  role: string | null;
  roleLabelEn: string | null;
  roleLabelBn: string | null;
  status: OnboardingTrackStatus;
  isComplete: boolean;
  requiresApproval: boolean;
  completedSteps: string[];
  pendingSteps: string[];
  steps: OnboardingStepStatus[];
  nextStep: string | null;
  /** Tutor only: authoritative verification state from tutor_profiles. */
  verificationStatus: string | null;
  updatedAt: string | null;
}
