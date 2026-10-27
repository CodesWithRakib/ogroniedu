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
import { UserEntity } from '../auth/entities/user.entity';
import { NotificationService } from './notification.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxScheduler } from './outbox.scheduler';
import { BookingMessagesService } from './booking-messages.service';
import { NotificationGateway } from './notification.gateway';
import { NOTIFICATION_BROADCASTER } from './interfaces/notification-broadcaster.interface';
import { NotificationController } from './notification.controller';
import { BookingMessagesController } from './booking-messages.controller';
import { ConversationsController } from './conversations.controller';
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
      UserEntity,
    ]),
    AuditModule,
    GuardiansModule,
  ],
  controllers: [NotificationController, BookingMessagesController, ConversationsController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    NotificationGateway,
    {
      provide: NOTIFICATION_BROADCASTER,
      useExisting: NotificationGateway,
    },
    OutboxWorkerService,
    OutboxScheduler,
    BookingMessagesService,
  ],
  exports: [
    NotificationService,
    NotificationPreferencesService,
    NotificationGateway,
    NOTIFICATION_BROADCASTER,
    OutboxWorkerService,
    OutboxScheduler,
    BookingMessagesService,
  ],
})
export class NotificationsModule {}
