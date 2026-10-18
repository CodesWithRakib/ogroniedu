import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceAreaItemDto {
  @IsNotEmpty()
  @IsString()
  districtCode!: string;

  @IsOptional()
  @IsString()
  upazilaCode?: string;

  @IsOptional()
  @IsString()
  localityName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  radiusKm?: number;

  /**
   * Optional *service-area centre* the tutor consents to publish for distance
   * search. Both fields must be supplied together; it must never be a private
   * home address. Range validation is repeated by a DB check constraint.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class SetServiceAreasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaItemDto)
  areas!: ServiceAreaItemDto[];
}
