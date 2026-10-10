import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAttendanceEntity } from './entities/session-attendance.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { ProgressReportEntity } from './entities/progress-report.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionAttendanceEntity,
      AssignmentEntity,
      AssignmentSubmissionEntity,
      ProgressReportEntity,
      BookingEntity,
      BookingSessionEntity,
      GuardianStudentLinkEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService, TypeOrmModule],
})
export class LearningModule {}
