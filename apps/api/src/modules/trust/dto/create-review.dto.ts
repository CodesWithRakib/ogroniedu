import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'UUID of the booking being reviewed' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ description: 'Overall rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Punctuality rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiPropertyOptional({ description: 'Teaching clarity rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  teachingClarityRating?: number;

  @ApiPropertyOptional({ description: 'Subject mastery rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  subjectMasteryRating?: number;

  @ApiProperty({ description: 'Written review comment', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comment!: string;
}
