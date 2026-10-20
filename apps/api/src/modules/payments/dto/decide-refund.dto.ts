import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideRefundDto {
  @IsString()
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
