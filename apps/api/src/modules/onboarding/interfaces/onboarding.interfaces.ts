export interface OnboardingRow {
  role_code: string;
  status: string;
  completed_steps: string[] | null;
  pending_steps: string[] | null;
  step_data: Record<string, unknown> | null;
  completed_at: Date | null;
  updated_at: Date | null;
}

/** Trusted server-side facts used to evaluate system-verified steps. */
export interface SystemStepContext {
  hasVerifiedContact: boolean;
  hasActiveGuardianLink: boolean;
  tutorVerificationStatus: string | null;
}
