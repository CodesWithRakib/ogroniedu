import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ReviewEntity,
  SafetyReportEntity,
  TutorReplacementCaseEntity,
  TutorReplacementCaseEventEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TutorsModule } from '../tutors/tutors.module';
import { ReviewsService } from './reviews.service';
import { SafetyReportsService } from './safety-reports.service';
import { TutorReplacementService } from './tutor-replacement.service';
import { ReviewsController } from './reviews.controller';
import { SafetyReportsController } from './safety-reports.controller';
import { TutorReplacementController } from './tutor-replacement.controller';
import { TutorReplacementNotifier } from './services/tutor-replacement-notifier';
import { TutorReplacementDeadlineScheduler } from './services/tutor-replacement-deadline.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      SafetyReportEntity,
      TutorReplacementCaseEntity,
      TutorReplacementCaseEventEntity,
      BookingEntity,
      BookingSessionEntity,
      OutboxEventEntity,
      AuditLogEntity,
    ]),
    NotificationsModule,
    TutorsModule,
  ],
  controllers: [ReviewsController, SafetyReportsController, TutorReplacementController],
  providers: [
    ReviewsService,
    SafetyReportsService,
    TutorReplacementService,
    TutorReplacementNotifier,
    TutorReplacementDeadlineScheduler,
  ],
  exports: [
    ReviewsService,
    SafetyReportsService,
    TutorReplacementService,
    TutorReplacementNotifier,
  ],
})
export class TrustModule {}
