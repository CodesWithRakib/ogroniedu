import { IsObject, IsOptional } from 'class-validator';

export class CompleteOnboardingStepDto {
  /**
   * Step payload. The authoritative shape per step is validated by the
   * onboarding service; the DTO only guarantees the request body is an object.
   */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
