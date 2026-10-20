import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RequestPayoutDto {
  @IsInt()
  @Min(100)
  amountMinor!: number;

  @IsString()
  @IsIn(['bkash', 'nagad', 'rocket', 'bank', 'other'])
  method!: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'other';

  @IsString()
  @MinLength(4)
  @MaxLength(64)
  accountReference!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class RejectPayoutDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class MarkPayoutPaidDto {
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  externalReference!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

export class MarkPayoutFailedDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
