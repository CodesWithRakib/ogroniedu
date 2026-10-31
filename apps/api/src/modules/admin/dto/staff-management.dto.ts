import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export const ALLOWED_STAFF_ROLES = [
  'admin',
  'support_agent',
  'compliance_reviewer',
] as const;

export type StaffRole = (typeof ALLOWED_STAFF_ROLES)[number];

export class CreateStaffDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  displayName!: string;

  @IsOptional()
  @IsString()
  phoneE164?: string;

  @IsIn(ALLOWED_STAFF_ROLES, { message: 'Role must be admin, support_agent, or compliance_reviewer' })
  role!: StaffRole;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneE164?: string;

  @IsOptional()
  @IsIn(ALLOWED_STAFF_ROLES, { message: 'Role must be admin, support_agent, or compliance_reviewer' })
  role?: StaffRole;

  @IsOptional()
  @IsIn(['active', 'suspended', 'banned'], { message: 'Invalid status' })
  status?: string;
}
