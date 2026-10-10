import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity, SafetyReportEntity, TutorReplacementCaseEntity } from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsService } from './reviews.service';
import { SafetyReportsService } from './safety-reports.service';
import { TutorReplacementService } from './tutor-replacement.service';
import { ReviewsController } from './reviews.controller';
import { SafetyReportsController } from './safety-reports.controller';
import { TutorReplacementController } from './tutor-replacement.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      SafetyReportEntity,
      TutorReplacementCaseEntity,
      BookingEntity,
      OutboxEventEntity,
      AuditLogEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [ReviewsController, SafetyReportsController, TutorReplacementController],
  providers: [ReviewsService, SafetyReportsService, TutorReplacementService],
  exports: [ReviewsService, SafetyReportsService, TutorReplacementService],
})
export class TrustModule {}
