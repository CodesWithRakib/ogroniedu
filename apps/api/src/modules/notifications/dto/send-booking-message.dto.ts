import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendBookingMessageDto {
  @ApiProperty({
    description: 'Message content for booking participants',
    example: 'Hello! Looking forward to our upcoming lesson on Newtonian Dynamics.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
