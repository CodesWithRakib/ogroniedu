import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  MaxLength,
} from 'class-validator';

export class ApplyTuitionRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  coverPitch!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  proposedSalary?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];
}
