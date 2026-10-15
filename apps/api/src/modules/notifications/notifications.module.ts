import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NotificationEntity,
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  BookingMessageEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { NotificationService } from './notification.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { BookingMessagesService } from './booking-messages.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { BookingMessagesController } from './booking-messages.controller';
import { AuditModule } from '../audit/audit.module';
import { GuardiansModule } from '../guardians/guardians.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationDeliveryEntity,
      NotificationPreferenceEntity,
      BookingMessageEntity,
      BookingEntity,
      OutboxEventEntity,
    ]),
    AuditModule,
    GuardiansModule,
  ],
  controllers: [NotificationController, BookingMessagesController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    NotificationGateway,
    OutboxWorkerService,
    BookingMessagesService,
  ],
  exports: [
    NotificationService,
    NotificationPreferencesService,
    NotificationGateway,
    OutboxWorkerService,
    BookingMessagesService,
  ],
})
export class NotificationsModule {}
