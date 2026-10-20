import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCaseDto {
  @ApiProperty({ description: 'User ID of the assigned investigator' })
  @IsUUID()
  assignedTo!: string;

  @ApiPropertyOptional({ description: 'Reason or context for assignment/reassignment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
