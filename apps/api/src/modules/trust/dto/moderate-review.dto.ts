import { IsIn, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ReviewModerationStatus } from '../entities/review.entity';

export class ModerateReviewDto {
  @ApiProperty({
    description: 'Target moderation status',
    enum: ['pending', 'published', 'flagged', 'hidden'],
  })
  @IsIn(['pending', 'published', 'flagged', 'hidden'])
  status!: ReviewModerationStatus;

  @ApiPropertyOptional({ description: 'Reason for the moderation action' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
