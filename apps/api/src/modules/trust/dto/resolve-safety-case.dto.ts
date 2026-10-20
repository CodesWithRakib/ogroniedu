import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveSafetyCaseDto {
  @ApiProperty({ description: 'Detailed resolution findings and documented decisions' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(5000)
  resolutionNotes!: string;

  @ApiPropertyOptional({
    description: 'Target case status',
    enum: ['resolved', 'closed', 'dismissed'],
    default: 'resolved',
  })
  @IsOptional()
  @IsIn(['resolved', 'closed', 'dismissed'])
  status?: 'resolved' | 'closed' | 'dismissed';

  @ApiPropertyOptional({ description: 'Specific outcome type code (e.g. warning, no_action, suspension)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  outcomeType?: string;
}
