import { BadRequestException } from '@nestjs/common';

/**
 * Guardian consent gate shared by linkChildRequest and registerChild.
 * Single home for the approved policy version + explicit affirmation check
 * (previously copy-pasted in both flows with drift risk).
 */
export function assertGuardianConsent(
  dto: { consentPolicyVersion?: string; consentAgreed?: boolean },
  approvedPolicyVersion: string,
): void {
  if (dto.consentPolicyVersion !== approvedPolicyVersion) {
    throw new BadRequestException(
      `Invalid consent policy version. Must be '${approvedPolicyVersion}'`,
    );
  }
  if (!dto.consentAgreed) {
    throw new BadRequestException('Explicit guardian consent affirmation is mandatory.');
  }
}
