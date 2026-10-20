import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeSafetyActionDto {
  @ApiProperty({ description: 'Mandatory reason for revoking the protective action' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  revocationReason!: string;
}
