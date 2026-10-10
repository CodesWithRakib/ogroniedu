import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { TutorSubjectEntity } from '../tutors/entities/tutor-subject.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      TutorProfileEntity,
      TutorSubjectEntity,
      GuardianStudentLinkEntity,
      UserEntity,
      SubjectEntity,
      EducationLevelEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
