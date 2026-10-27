import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ReviewEntity,
  SafetyReportEntity,
  SafetyCaseMessageEntity,
  SafetyCaseEventEntity,
  SafetyActionEntity,
  BannedIdentityEntity,
  TutorReplacementCaseEntity,
  TutorReplacementCaseEventEntity,
  BookingDisputeEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TutorsModule } from '../tutors/tutors.module';
import { PaymentsModule } from '../payments/payments.module';
import { FilesModule } from '../files/files.module';
import { ReviewsService } from './reviews.service';
import { SafetyReportsService } from './safety-reports.service';
import { TutorReplacementService } from './tutor-replacement.service';
import { DisputesService } from './disputes.service';
import { UserSafetyEnforcementService } from './services/user-safety-enforcement.service';
import { ReviewsController } from './reviews.controller';
import { SafetyReportsController } from './safety-reports.controller';
import { TutorReplacementController } from './tutor-replacement.controller';
import { DisputesController } from './disputes.controller';
import { TutorReplacementNotifier } from './services/tutor-replacement-notifier';
import { TutorReplacementDeadlineScheduler } from './services/tutor-replacement-deadline.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      SafetyReportEntity,
      SafetyCaseMessageEntity,
      SafetyCaseEventEntity,
      SafetyActionEntity,
      BannedIdentityEntity,
      TutorReplacementCaseEntity,
      TutorReplacementCaseEventEntity,
      BookingDisputeEntity,
      BookingEntity,
      BookingSessionEntity,
      TutorProfileEntity,
      OutboxEventEntity,
      AuditLogEntity,
      UserEntity,
    ]),
    NotificationsModule,
    TutorsModule,
    FilesModule,
    PaymentsModule,
  ],
  controllers: [
    ReviewsController,
    SafetyReportsController,
    TutorReplacementController,
    DisputesController,
  ],
  providers: [
    ReviewsService,
    SafetyReportsService,
    TutorReplacementService,
    DisputesService,
    UserSafetyEnforcementService,
    TutorReplacementNotifier,
    TutorReplacementDeadlineScheduler,
  ],
  exports: [
    ReviewsService,
    SafetyReportsService,
    TutorReplacementService,
    DisputesService,
    UserSafetyEnforcementService,
    TutorReplacementNotifier,
  ],
})
export class TrustModule {}
