import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { BookingSessionEntity } from './entities/booking-session.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { TutorSubjectEntity } from '../tutors/entities/tutor-subject.entity';
import { TutorAvailabilityEntity } from '../tutors/entities/tutor-availability.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { SchedulingService } from './scheduling.service';
import { SessionSchedulingService } from './services/session-scheduling.service';
import { SessionReschedulingService } from './services/session-rescheduling.service';
import { SessionQueriesService } from './services/session-queries.service';
import { SessionsController } from './sessions.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuardiansModule } from '../guardians/guardians.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingSessionEntity,
      OutboxEventEntity,
      TutorProfileEntity,
      TutorSubjectEntity,
      TutorAvailabilityEntity,
      GuardianStudentLinkEntity,
      UserEntity,
      SubjectEntity,
      EducationLevelEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
    GuardiansModule,
  ],
  controllers: [BookingsController, SessionsController],
  providers: [
    BookingsService,
    SchedulingService,
    SessionSchedulingService,
    SessionReschedulingService,
    SessionQueriesService,
  ],
  exports: [
    BookingsService,
    SchedulingService,
    SessionSchedulingService,
    SessionReschedulingService,
    SessionQueriesService,
    TypeOrmModule,
  ],
})
export class BookingsModule {}
