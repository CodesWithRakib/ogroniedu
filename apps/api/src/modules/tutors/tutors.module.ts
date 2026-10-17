import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorProfileEntity } from './entities/tutor-profile.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from './entities/tutor-verification-review.entity';
import { TutorVerificationLevelEntity } from './entities/tutor-verification-level.entity';
import { TutorVerificationDocumentEntity } from './entities/tutor-verification-document.entity';
import { TutorSubjectEntity } from './entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from './entities/tutor-service-area.entity';
import { TutorAvailabilityEntity } from './entities/tutor-availability.entity';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { TutorsService } from './tutors.service';
import { TutorProfileService } from './services/tutor-profile.service';
import { TutorSearchService } from './services/tutor-search.service';
import { TutorVerificationService } from './services/tutor-verification.service';
import { TutorDossierService } from './services/tutor-dossier.service';
import { TutorVerificationStatusService } from './services/tutor-verification-status.service';
import { TutorVerificationReviewerDirectoryService } from './services/tutor-verification-reviewer-directory.service';
import { TutorVerificationExpiryService } from './services/tutor-verification-expiry.service';
import { TutorVerificationSweepScheduler } from './services/tutor-verification-sweep.scheduler';
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
      TutorVerificationLevelEntity,
      TutorVerificationDocumentEntity,
      TutorSubjectEntity,
      TutorServiceAreaEntity,
      TutorAvailabilityEntity,
      FileAssetEntity,
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      SubjectEntity,
      EducationLevelEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
    FilesModule,
  ],
  controllers: [TutorsController, AdminTutorsController],
  providers: [
    TutorsService,
    TutorProfileService,
    TutorSearchService,
    TutorVerificationService,
    TutorDossierService,
    TutorVerificationStatusService,
    TutorVerificationReviewerDirectoryService,
    TutorVerificationExpiryService,
    TutorVerificationSweepScheduler,
  ],
  exports: [
    TutorsService,
    TutorProfileService,
    TutorSearchService,
    TutorVerificationService,
    TutorDossierService,
    TutorVerificationStatusService,
    TutorVerificationExpiryService,
    TypeOrmModule,
  ],
})
export class TutorsModule {}
