import {
  IsInt,
  Min,
  Max,
  IsString,
  Matches,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilitySlotItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startLocal must be in 24-hour format HH:mm (e.g. 14:00)',
  })
  startLocal!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endLocal must be in 24-hour format HH:mm (e.g. 16:00)',
  })
  endLocal!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotItemDto)
  slots!: AvailabilitySlotItemDto[];
}
