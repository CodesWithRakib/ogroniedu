import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TuitionRequestEntity } from './entities/tuition-request.entity';
import { TuitionRequestSuggestionEntity } from './entities/tuition-request-suggestion.entity';
import { TuitionRequestApplicationEntity } from './entities/tuition-request-application.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { TutorSubjectEntity } from '../tutors/entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from '../tutors/entities/tutor-service-area.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { TuitionRequestsService } from './tuition-requests.service';
import { TuitionRequestsController } from './tuition-requests.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TuitionRequestEntity,
      TuitionRequestSuggestionEntity,
      TuitionRequestApplicationEntity,
      SubjectEntity,
      TutorProfileEntity,
      TutorSubjectEntity,
      TutorServiceAreaEntity,
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      StudentProfileEntity,
      GuardianStudentLinkEntity,
    ]),
    AuthModule,
  ],
  controllers: [TuitionRequestsController],
  providers: [TuitionRequestsService],
  exports: [TuitionRequestsService],
})
export class TuitionRequestsModule {}
