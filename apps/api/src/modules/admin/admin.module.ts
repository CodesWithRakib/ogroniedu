import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSettingEntity, FeatureFlagEntity } from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { TutorReplacementCaseEntity } from '../trust/entities/tutor-replacement-case.entity';
import { SafetyReportEntity } from '../trust/entities/safety-report.entity';
import { PaymentOrderEntity } from '../payments/entities/payment-order.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { AdminOperationsService } from './admin-operations.service';
import { AdminOperationsController } from './admin-operations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSettingEntity,
      FeatureFlagEntity,
      UserEntity,
      UserRoleEntity,
      BookingEntity,
      AuditLogEntity,
      TutorReplacementCaseEntity,
      SafetyReportEntity,
      PaymentOrderEntity,
    ]),
    AuthModule,
    PaymentsModule,
  ],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
  exports: [AdminOperationsService],
})
export class AdminModule {}
