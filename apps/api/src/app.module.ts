import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import {
  NotificationEntity,
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  BookingMessageEntity,
} from './modules/notifications/entities';
import {
  UserEntity,
  RoleEntity,
  UserRoleEntity,
  AuthSessionEntity,
  AuthVerificationCodeEntity,
} from './modules/auth/entities';
import { StudentProfileEntity } from './modules/users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from './modules/guardians/entities/guardian-student-link.entity';
import { AuditLogEntity } from './modules/audit/entities/audit-log.entity';
import { FileAssetEntity } from './modules/files/entities/file-asset.entity';
import { TutorProfileEntity } from './modules/tutors/entities/tutor-profile.entity';
import { TutorQualificationEntity } from './modules/tutors/entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from './modules/tutors/entities/tutor-verification-review.entity';
import { TutorSubjectEntity } from './modules/tutors/entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from './modules/tutors/entities/tutor-service-area.entity';
import { TutorAvailabilityEntity } from './modules/tutors/entities/tutor-availability.entity';
import { SubjectEntity } from './modules/taxonomy/entities/subject.entity';
import { EducationLevelEntity } from './modules/taxonomy/entities/education-level.entity';
import { CurriculumEntity } from './modules/taxonomy/entities/curriculum.entity';
import { BookingEntity } from './modules/bookings/entities/booking.entity';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { validateEnvironment } from './config/env.validation';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { FilesModule } from './modules/files/files.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { LearningModule } from './modules/learning/learning.module';
import { PaymentsModule } from './modules/payments/payments.module';
import {
  SessionAttendanceEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  ProgressReportEntity,
} from './modules/learning/entities';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PaymentRefundEntity,
  LedgerAccountEntity,
  LedgerJournalEntity,
  LedgerEntryEntity,
} from './modules/payments/entities';
import {
  ReviewEntity,
  SafetyReportEntity,
  TutorReplacementCaseEntity,
} from './modules/trust/entities';
import { TrustModule } from './modules/trust/trust.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = process.env.NODE_ENV === 'test';
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'password'),
          database: config.get<string>('DB_NAME', 'ogroniedu_dev'),
          entities: [
            NotificationEntity,
            NotificationDeliveryEntity,
            NotificationPreferenceEntity,
            BookingMessageEntity,
            UserEntity,
            RoleEntity,
            UserRoleEntity,
            AuthSessionEntity,
            AuthVerificationCodeEntity,
            StudentProfileEntity,
            GuardianStudentLinkEntity,
            AuditLogEntity,
            FileAssetEntity,
            TutorProfileEntity,
            TutorQualificationEntity,
            TutorVerificationReviewEntity,
            TutorSubjectEntity,
            TutorServiceAreaEntity,
            TutorAvailabilityEntity,
            SubjectEntity,
            EducationLevelEntity,
            CurriculumEntity,
            BookingEntity,
            SessionAttendanceEntity,
            AssignmentEntity,
            AssignmentSubmissionEntity,
            ProgressReportEntity,
            PaymentOrderEntity,
            PaymentTransactionEntity,
            PaymentRefundEntity,
            LedgerAccountEntity,
            LedgerJournalEntity,
            LedgerEntryEntity,
            ReviewEntity,
            SafetyReportEntity,
            TutorReplacementCaseEntity,
          ],
          synchronize: false, // Never auto-sync in production or development (migrations are source of truth)
          autoLoadEntities: true,
          retryAttempts: isTest ? 1 : 3,
          retryDelay: 1000,
        };
      },
    }),
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    GuardiansModule,
    FilesModule,
    TaxonomyModule,
    TutorsModule,
    BookingsModule,
    LearningModule,
    PaymentsModule,
    NotificationsModule,
    TrustModule,
  ],
  providers: [StructuredLoggerService],
  exports: [StructuredLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
