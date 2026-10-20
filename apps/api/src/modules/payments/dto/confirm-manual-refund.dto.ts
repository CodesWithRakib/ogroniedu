import { IsString, MinLength, MaxLength, IsOptional, IsDateString } from 'class-validator';

/**
 * Manual refund confirmation. The operator must supply the real provider/bank
 * transfer reference; the server never generates one.
 */
export class ConfirmManualRefundDto {
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  externalReference!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;

  @IsDateString()
  @IsOptional()
  confirmedAt?: string;
}
