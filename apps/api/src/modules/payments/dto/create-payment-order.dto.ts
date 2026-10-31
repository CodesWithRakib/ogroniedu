import { IsUUID, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsOptional()
  @IsIn(['bkash', 'nagad', 'sslcommerz'], {
    message: 'provider must be bkash, nagad, or sslcommerz',
  })
  provider?: string;

  @IsString()
  @IsOptional()
  @IsIn(['bkash', 'nagad', 'rocket', 'upay', 'card'], {
    message: 'paymentMethod must be bkash, nagad, rocket, upay, or card',
  })
  paymentMethod?: string;

  @IsOptional()
  amountMinor?: string | number;

  @IsString()
  @IsOptional()
  @IsIn(['bn', 'en'], {
    message: 'locale must be bn or en',
  })
  locale?: string;

  @IsString()
  @IsOptional()
  frontendOrigin?: string;
}
