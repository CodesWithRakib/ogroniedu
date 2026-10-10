import { IsArray, ArrayMinSize, IsIn } from 'class-validator';

export const ALLOWED_PLATFORM_ROLES = [
  'student',
  'guardian',
  'tutor',
  'support_agent',
  'compliance_reviewer',
  'admin',
  'super_admin',
  'organization_owner',
  'organization_staff',
] as const;

export type PlatformRole = (typeof ALLOWED_PLATFORM_ROLES)[number];

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one role must be assigned to the user' })
  @IsIn(ALLOWED_PLATFORM_ROLES, { each: true, message: 'Invalid role specified in roles array' })
  roles!: PlatformRole[];
}
