import { IsUUID, IsNotEmpty, IsNumber, Min, IsString, MinLength, MaxLength } from 'class-validator';

export class ProcessRefundDto {
  @IsUUID()
  @IsNotEmpty()
  paymentOrderId!: string;

  @IsNumber()
  @Min(100) // At least 1 BDT (100 poisha)
  @IsNotEmpty()
  amountMinor!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @IsNotEmpty()
  reason!: string;
}
