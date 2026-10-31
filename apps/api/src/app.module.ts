import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthSecurityModule } from './modules/auth/auth-security.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
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
import { TrustModule } from './modules/trust/trust.module';
import { SupportModule } from './modules/support/support.module';
import { PublicModule } from './modules/public/public.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { TuitionRequestsModule } from './modules/tuition-requests/tuition-requests.module';
import { AppController } from './app.controller';

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
        const databaseUrl = config.get<string>('DATABASE_URL');
        const dbSsl = config.get<string>('DB_SSL');
        const isSsl =
          dbSsl === 'true' ||
          Boolean(databaseUrl && databaseUrl.includes('sslmode=require')) ||
          config.get<string>('NODE_ENV') === 'production';

        const sslOption = isSsl ? { rejectUnauthorized: false } : false;

        const poolOptions = {
          max: Number(config.get<string | number>('DB_POOL_MAX', 20)),
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        };

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: sslOption,
            extra: poolOptions,
            entities: [],
            synchronize: false,
            autoLoadEntities: true,
            retryAttempts: isTest ? 1 : 3,
            retryDelay: 1000,
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'password'),
          database: config.get<string>('DB_NAME', 'ogroniedu_dev'),
          ssl: sslOption,
          extra: poolOptions,
          // Entities are registered by feature modules via TypeOrmModule.forFeature
          // and picked up automatically (autoLoadEntities). The root module owns
          // wiring only — never the entity list (backlog B-6).
          entities: [],
          synchronize: false, // Never auto-sync in production or development (migrations are source of truth)
          autoLoadEntities: true,
          retryAttempts: isTest ? 1 : 3,
          retryDelay: 1000,
        };
      },
    }),
    HealthModule,
    AuditModule,
    AuthSecurityModule,
    AuthModule,
    OnboardingModule,
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
    SupportModule,
    PublicModule,
    AdminModule,
    AnalyticsModule,
    OrganizationsModule,
    FeedbackModule,
    ClassroomModule,
    TuitionRequestsModule,
  ],
  controllers: [AppController],
  providers: [StructuredLoggerService],
  exports: [StructuredLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, SecurityHeadersMiddleware).forRoutes('*');
  }
}
