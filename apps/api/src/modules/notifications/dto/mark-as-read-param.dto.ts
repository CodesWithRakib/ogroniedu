import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MarkAsReadParamDto {
  @ApiProperty({
    description: 'Notification identifier UUID (v4)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID('4', { message: 'id parameter must be a valid UUID v4' })
  @IsNotEmpty({ message: 'id cannot be empty' })
  id!: string;
}
