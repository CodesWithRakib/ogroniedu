import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SERIES_SCOPES = ['this_occurrence', 'this_and_future', 'entire_series'] as const;
export type SeriesScope = (typeof SERIES_SCOPES)[number];

export class SeriesCancelDto {
  @IsIn(SERIES_SCOPES)
  scope!: SeriesScope;

  /** Anchor occurrence; required for this_occurrence and this_and_future. */
  @IsOptional()
  @IsUUID()
  anchorSessionId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class SeriesRescheduleDto {
  @IsIn(SERIES_SCOPES)
  scope!: SeriesScope;

  /** Anchor occurrence; required for this_occurrence and this_and_future. */
  @IsOptional()
  @IsUUID()
  anchorSessionId?: string;

  /** New start for the anchor occurrence; the delta shifts the whole scope. */
  @IsDateString()
  newStartsAt!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
