import { IsNotEmpty, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondBookingRequestDto {
  @IsNotEmpty()
  @IsIn(['accept', 'decline'])
  action!: 'accept' | 'decline';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonNotes?: string;
}

export class WithdrawBookingRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
