import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TutorReplyDto {
  @ApiProperty({ description: 'Tutor formal rebuttal / response text', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reply!: string;
}
