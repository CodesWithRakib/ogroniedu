import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationEntity } from './modules/notifications/entities/notification.entity';
import { NotificationDeliveryEntity } from './modules/notifications/entities/notification-delivery.entity';
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
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { validateEnvironment } from './config/env.validation';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { GuardiansModule } from './modules/guardians/guardians.module';

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
            UserEntity,
            RoleEntity,
            UserRoleEntity,
            AuthSessionEntity,
            AuthVerificationCodeEntity,
            StudentProfileEntity,
            GuardianStudentLinkEntity,
            AuditLogEntity,
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
    NotificationsModule,
  ],
  providers: [StructuredLoggerService],
  exports: [StructuredLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
