import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RateLimiterService } from './rate-limiter.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GuardianStudentGuard } from '../../common/guards/guardian-student.guard';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import {
  UserEntity,
  RoleEntity,
  UserRoleEntity,
  AuthSessionEntity,
  AuthVerificationCodeEntity,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      AuthSessionEntity,
      AuthVerificationCodeEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RateLimiterService,
    AuthGuard,
    RolesGuard,
    GuardianStudentGuard,
    StructuredLoggerService,
  ],
  exports: [AuthService, RateLimiterService, AuthGuard, RolesGuard, GuardianStudentGuard],
})
export class AuthModule {}
