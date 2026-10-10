import { IsString, IsNotEmpty, IsIn, Equals, IsBoolean } from 'class-validator';

export class LinkChildRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'studentIdentifier (email, phone, or UUID) is required' })
  studentIdentifier!: string;

  @IsIn(['father', 'mother', 'legal_guardian'], {
    message: 'relationshipType must be one of: father, mother, legal_guardian',
  })
  relationshipType!: 'father' | 'mother' | 'legal_guardian';

  @IsString()
  @Equals('v1.0-bd-minor-consent', {
    message: 'consentPolicyVersion must be "v1.0-bd-minor-consent"',
  })
  consentPolicyVersion!: string;

  @IsBoolean()
  @Equals(true, { message: 'consentAgreed must be true to link a minor student' })
  consentAgreed!: boolean;
}
