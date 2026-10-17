import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { TutorVerificationLevelValues, type TutorVerificationLevel } from '@ogroniedu/contracts';

/**
 * Validates a `:level` route segment against the shared contract.
 *
 * A route that also carries other path params cannot bind `@Param()` to a DTO
 * (the global pipe forbids non-whitelisted properties), so level validation is
 * done with an explicit pipe instead.
 */
@Injectable()
export class TutorVerificationLevelPipe implements PipeTransform<string, TutorVerificationLevel> {
  transform(value: string): TutorVerificationLevel {
    if (!(TutorVerificationLevelValues as readonly string[]).includes(value)) {
      throw new BadRequestException(
        `Invalid verification level '${value}'. Expected one of: ${TutorVerificationLevelValues.join(', ')}.`,
      );
    }
    return value as TutorVerificationLevel;
  }
}
