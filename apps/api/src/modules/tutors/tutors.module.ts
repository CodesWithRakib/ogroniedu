import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorProfileEntity } from './entities/tutor-profile.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from './entities/tutor-verification-review.entity';
import { TutorSubjectEntity } from './entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from './entities/tutor-service-area.entity';
import { TutorAvailabilityEntity } from './entities/tutor-availability.entity';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { TutorsService } from './tutors.service';
import { TutorProfileService } from './services/tutor-profile.service';
import { TutorSearchService } from './services/tutor-search.service';
import { TutorVerificationService } from './services/tutor-verification.service';
import { TutorsController } from './tutors.controller';
import { AdminTutorsController } from './admin-tutors.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutorProfileEntity,
      TutorQualificationEntity,
      TutorVerificationReviewEntity,
      TutorSubjectEntity,
      TutorServiceAreaEntity,
      TutorAvailabilityEntity,
      FileAssetEntity,
      UserEntity,
      SubjectEntity,
      EducationLevelEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
    FilesModule,
  ],
  controllers: [TutorsController, AdminTutorsController],
  providers: [TutorsService, TutorProfileService, TutorSearchService, TutorVerificationService],
  exports: [TutorsService, TutorProfileService, TutorSearchService, TutorVerificationService, TypeOrmModule],
})
export class TutorsModule {}
