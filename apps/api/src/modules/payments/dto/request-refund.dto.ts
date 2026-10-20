import {
  IsUUID,
  IsNotEmpty,
  IsInt,
  Min,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

/** Customer/admin refund request. Approval and execution are separate steps. */
export class RequestRefundDto {
  @IsUUID()
  @IsNotEmpty()
  paymentOrderId!: string;

  @IsInt()
  @Min(100)
  amountMinor!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey?: string;
}
