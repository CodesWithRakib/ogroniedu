import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NotificationEntity,
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  BookingMessageEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { NotificationService } from './notification.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { BookingMessagesService } from './booking-messages.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { BookingMessagesController } from './booking-messages.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationDeliveryEntity,
      NotificationPreferenceEntity,
      BookingMessageEntity,
      BookingEntity,
      GuardianStudentLinkEntity,
      OutboxEventEntity,
    ]),
    AuditModule,
  ],
  controllers: [NotificationController, BookingMessagesController],
  providers: [
    NotificationService,
    NotificationGateway,
    OutboxWorkerService,
    BookingMessagesService,
  ],
  exports: [NotificationService, NotificationGateway, OutboxWorkerService, BookingMessagesService],
})
export class NotificationsModule {}
