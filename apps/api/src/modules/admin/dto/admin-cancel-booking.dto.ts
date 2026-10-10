import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class AdminCancelBookingDto {
  @IsString()
  @MinLength(5, { message: 'Administrative intervention reason must be at least 5 characters' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;

  @IsOptional()
  @IsBoolean()
  refundStudent?: boolean = true;
}
