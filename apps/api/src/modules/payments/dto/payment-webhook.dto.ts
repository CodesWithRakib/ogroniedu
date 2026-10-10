import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  providerTransactionId!: string;

  @IsString()
  @IsNotEmpty()
  providerEventId!: string;

  @IsNumber()
  @IsNotEmpty()
  amountMinor!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}
