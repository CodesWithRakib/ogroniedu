import { IsUUID, IsIn, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { ReplacementReasonCode } from '../entities/tutor-replacement-case.entity';

export class CreateReplacementCaseDto {
  @ApiProperty({ description: 'Booking ID for which replacement is requested' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({
    description: 'Reason code for tutor replacement guarantee',
    enum: [
      'trial_dissatisfaction',
      'frequent_tutor_cancellation',
      'tutor_no_show',
      'teaching_mismatch',
      'unprofessional_conduct',
      'other',
    ],
  })
  @IsIn([
    'trial_dissatisfaction',
    'frequent_tutor_cancellation',
    'tutor_no_show',
    'teaching_mismatch',
    'unprofessional_conduct',
    'other',
  ])
  reasonCode!: ReplacementReasonCode;

  @ApiProperty({ description: 'Detailed explanation for the replacement request', maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  explanation!: string;
}
