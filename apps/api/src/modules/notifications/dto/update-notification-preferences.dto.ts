import { IsArray, IsBoolean, IsIn, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferenceItemDto {
  @ApiProperty({
    example: 'booking',
    enum: ['booking', 'schedule', 'payment', 'learning', 'system', 'marketing'],
  })
  @IsIn(['booking', 'schedule', 'payment', 'learning', 'system', 'marketing'])
  @IsNotEmpty()
  category!: 'booking' | 'schedule' | 'payment' | 'learning' | 'system' | 'marketing';

  @ApiProperty({
    example: 'in_app',
    enum: ['in_app', 'email', 'sms', 'push', 'whatsapp'],
  })
  @IsIn(['in_app', 'email', 'sms', 'push', 'whatsapp'])
  @IsNotEmpty()
  channel!: 'in_app' | 'email' | 'sms' | 'push' | 'whatsapp';

  @ApiProperty({ example: true })
  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences!: NotificationPreferenceItemDto[];
}
