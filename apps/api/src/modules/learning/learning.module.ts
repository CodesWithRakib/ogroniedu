import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAttendanceEntity } from './entities/session-attendance.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { AssignmentRevisionEntity } from './entities/assignment-revision.entity';
import { ProgressReportEntity } from './entities/progress-report.entity';
import { LessonPlanEntity } from './entities/lesson-plan.entity';
import { LearningMaterialEntity } from './entities/learning-material.entity';
import { LearningGoalEntity } from './entities/learning-goal.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { LearningService } from './learning.service';
import { LearningAccessService } from './services/learning-access.service';
import { LearningAttendanceService } from './services/attendance.service';
import { LearningAssignmentsService } from './services/assignments.service';
import { LearningProgressService } from './services/progress.service';
import { LessonPlansService } from './services/lesson-plans.service';
import { LearningMaterialsService } from './services/learning-materials.service';
import { LearningGoalsService } from './services/learning-goals.service';
import { LearningOversightService } from './services/learning-oversight.service';
import { LearningController } from './learning.controller';
import { LessonContentController } from './lesson-content.controller';
import { LearningGoalsController } from './learning-goals.controller';
import { LearningReportsController } from './learning-reports.controller';
import { LearningOversightController } from './learning-oversight.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionAttendanceEntity,
      AssignmentEntity,
      AssignmentSubmissionEntity,
      AssignmentRevisionEntity,
      ProgressReportEntity,
      LessonPlanEntity,
      LearningMaterialEntity,
      LearningGoalEntity,
      BookingEntity,
      BookingSessionEntity,
      FileAssetEntity,
    ]),
    AuthModule,
    AuditModule,
    FilesModule,
    forwardRef(() => NotificationsModule),
    GuardiansModule,
  ],
  controllers: [
    LearningController,
    LessonContentController,
    LearningGoalsController,
    LearningReportsController,
    LearningOversightController,
  ],
  providers: [
    LearningService,
    LearningAccessService,
    LearningAttendanceService,
    LearningAssignmentsService,
    LearningProgressService,
    LessonPlansService,
    LearningMaterialsService,
    LearningGoalsService,
    LearningOversightService,
  ],
  exports: [
    LearningService,
    LearningAccessService,
    LearningAttendanceService,
    LearningAssignmentsService,
    LearningProgressService,
    LessonPlansService,
    LearningMaterialsService,
    LearningGoalsService,
    TypeOrmModule,
  ],
})
export class LearningModule {}
