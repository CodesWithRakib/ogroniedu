import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
  Matches,
  IsIn,
  Equals,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class RegisterChildDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164 formatted number',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be formatted as YYYY-MM-DD',
  })
  dateOfBirth?: string;

  @IsOptional()
  @IsUUID('4')
  educationLevelId?: string;

  @IsOptional()
  @IsUUID('4')
  curriculumId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  institutionName?: string;

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
  @Equals(true, { message: 'consentAgreed must be true to register a child' })
  consentAgreed!: boolean;
}
