import { IsEmail, IsIn } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['admin', 'staff', 'tutor'], {
    message: 'Role must be one of: admin, staff, tutor',
  })
  role!: 'admin' | 'staff' | 'tutor';
}
