import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';

export class SuggestTutorsDto {
  @IsNotEmpty()
  @IsUUID()
  tutorUserId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  matchScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
