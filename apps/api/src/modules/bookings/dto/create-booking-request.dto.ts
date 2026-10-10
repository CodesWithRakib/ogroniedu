import {
  IsUUID,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TutoringMode } from '../entities/booking.entity';

export class CreateBookingRequestDto {
  @IsNotEmpty()
  @IsUUID()
  tutorId!: string;

  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

  @IsNotEmpty()
  @IsUUID()
  subjectId!: string;

  @IsNotEmpty()
  @IsUUID()
  educationLevelId!: string;

  @IsNotEmpty()
  @IsIn(['in_person', 'online', 'hybrid'])
  mode!: TutoringMode;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageNotes?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  preferredDays?: number[];
}
