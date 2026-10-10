import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
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
  radiusKm?: number;
}

export class SetServiceAreasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaItemDto)
  areas!: ServiceAreaItemDto[];
}
