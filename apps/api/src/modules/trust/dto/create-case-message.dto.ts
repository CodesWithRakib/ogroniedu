import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaseMessageDto {
  @ApiProperty({ description: 'Message or note text' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Whether this message is an internal investigator note (staff only)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;

  @ApiPropertyOptional({
    description: 'Optional evidence attachment asset UUIDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentAssetIds?: string[];
}
