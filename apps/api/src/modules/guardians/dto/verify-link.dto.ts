import { IsIn } from 'class-validator';

export class VerifyLinkDto {
  @IsIn(['approve', 'reject'], {
    message: 'decision must be either "approve" or "reject"',
  })
  decision!: 'approve' | 'reject';
}
