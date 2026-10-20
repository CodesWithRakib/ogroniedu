import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Creates a new active commission-policy version; history is never edited. */
export class UpdateCommissionPolicyDto {
  @IsInt()
  @Min(0)
  @Max(3000)
  platformFeeBps!: number;

  @IsInt()
  @Min(0)
  @Max(10000000)
  minPayoutMinor!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
