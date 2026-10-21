import { IsNotEmpty, IsString, MaxLength, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendBookingMessageDto {
  @ApiProperty({
    description: 'Message content for booking participants',
    example: 'Hello! Looking forward to our upcoming lesson on Newtonian Dynamics.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({
    description: 'Optional file asset IDs (documents, images, homework) attached to message',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentAssetIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional metadata for message formatting or client context',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
