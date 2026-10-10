import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PaymentRefundEntity,
  LedgerAccountEntity,
  LedgerJournalEntity,
  LedgerEntryEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { PaymentsService } from './payments.service';
import { LedgerService } from './ledger.service';
import { PaymentsController } from './payments.controller';
import { BkashSandboxAdapter } from './adapters/bkash-sandbox.adapter';
import { SslcommerzSandboxAdapter } from './adapters/sslcommerz-sandbox.adapter';
import { PaymentAdapterFactory } from './adapters/adapter.factory';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentOrderEntity,
      PaymentTransactionEntity,
      PaymentRefundEntity,
      LedgerAccountEntity,
      LedgerJournalEntity,
      LedgerEntryEntity,
      BookingEntity,
      BookingSessionEntity,
      GuardianStudentLinkEntity,
      OutboxEventEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    LedgerService,
    BkashSandboxAdapter,
    SslcommerzSandboxAdapter,
    PaymentAdapterFactory,
  ],
  exports: [PaymentsService, LedgerService, TypeOrmModule],
})
export class PaymentsModule {}
