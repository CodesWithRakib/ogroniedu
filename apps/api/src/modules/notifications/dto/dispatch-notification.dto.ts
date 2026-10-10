import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsIn, IsObject, IsOptional, IsNotEmpty } from 'class-validator';
import {
  NotificationEventTypes,
  NotificationRoles,
  type NotificationEventType,
  type NotificationRole,
} from '@ogroniedu/contracts';

export class DispatchNotificationDto {
  @ApiProperty({
    description: 'Target recipient user UUID (v4)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Canonical notification event type',
    enum: NotificationEventTypes,
    example: 'booking.requested',
  })
  @IsIn(NotificationEventTypes, {
    message: `eventType must be one of valid registered types: ${NotificationEventTypes.join(', ')}`,
  })
  eventType!: NotificationEventType;

  @ApiProperty({
    description: 'Target recipient role for entitlement checking',
    enum: NotificationRoles,
    example: 'tutor',
  })
  @IsIn(NotificationRoles, {
    message: `recipientRole must be one of: ${NotificationRoles.join(', ')}`,
  })
  recipientRole!: NotificationRole;

  @ApiProperty({
    description: 'Interpolation payload variables matching template placeholders',
    type: Object,
    example: { bookingId: 'BK-100', requesterName: 'Rahim' },
  })
  @IsObject({ message: 'payload must be a valid key-value object' })
  payload!: Record<string, string | number>;

  @ApiPropertyOptional({
    description: 'Optional idempotency key to prevent duplicate delivery',
    example: 'idem-booking-req-9912',
  })
  @IsOptional()
  @IsString({ message: 'idempotencyKey must be a string' })
  idempotencyKey?: string;
}
