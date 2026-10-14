import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAttendanceEntity } from './entities/session-attendance.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { ProgressReportEntity } from './entities/progress-report.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { LearningService } from './learning.service';
import { LearningAccessService } from './services/learning-access.service';
import { LearningAttendanceService } from './services/attendance.service';
import { LearningAssignmentsService } from './services/assignments.service';
import { LearningProgressService } from './services/progress.service';
import { LearningController } from './learning.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuardiansModule } from '../guardians/guardians.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionAttendanceEntity,
      AssignmentEntity,
      AssignmentSubmissionEntity,
      ProgressReportEntity,
      BookingEntity,
      BookingSessionEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
    GuardiansModule,
  ],
  controllers: [LearningController],
  providers: [
    LearningService,
    LearningAccessService,
    LearningAttendanceService,
    LearningAssignmentsService,
    LearningProgressService,
  ],
  exports: [
    LearningService,
    LearningAccessService,
    LearningAttendanceService,
    LearningAssignmentsService,
    LearningProgressService,
    TypeOrmModule,
  ],
})
export class LearningModule {}
