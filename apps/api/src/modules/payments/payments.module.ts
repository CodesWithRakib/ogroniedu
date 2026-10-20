import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PaymentRefundEntity,
  LedgerAccountEntity,
  LedgerJournalEntity,
  LedgerEntryEntity,
  CommissionPolicyEntity,
  EscrowHoldEntity,
  WebhookEventEntity,
  SessionSettlementEntity,
  TutorFinancialAccountEntity,
  TutorEarningAdjustmentEntity,
  PayoutEntity,
  InvoiceEntity,
  ReconciliationRunEntity,
} from './entities';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { PaymentsService } from './payments.service';
import { PaymentOrdersService } from './services/payment-orders.service';
import { PaymentWebhooksService } from './services/payment-webhooks.service';
import { RefundsService } from './services/refunds.service';
import { SettlementService } from './services/settlement.service';
import { PayoutsService } from './services/payouts.service';
import { InvoicesService } from './services/invoices.service';
import { CommissionPolicyService } from './services/commission-policy.service';
import { LedgerService } from './ledger.service';
import { PaymentsController } from './payments.controller';
import { TutorFinanceController } from './tutor-finance.controller';
import { AdminFinanceController } from './admin-finance.controller';
import { BkashSandboxAdapter } from './adapters/bkash-sandbox.adapter';
import { SslcommerzSandboxAdapter } from './adapters/sslcommerz-sandbox.adapter';
import { PaymentAdapterFactory } from './adapters/adapter.factory';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuardiansModule } from '../guardians/guardians.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentOrderEntity,
      PaymentTransactionEntity,
      PaymentRefundEntity,
      LedgerAccountEntity,
      LedgerJournalEntity,
      LedgerEntryEntity,
      CommissionPolicyEntity,
      EscrowHoldEntity,
      WebhookEventEntity,
      SessionSettlementEntity,
      TutorFinancialAccountEntity,
      TutorEarningAdjustmentEntity,
      PayoutEntity,
      InvoiceEntity,
      ReconciliationRunEntity,
      BookingEntity,
      BookingSessionEntity,
      OutboxEventEntity,
    ]),
    AuthModule,
    AuditModule,
    forwardRef(() => NotificationsModule),
    GuardiansModule,
  ],
  controllers: [PaymentsController, TutorFinanceController, AdminFinanceController],
  providers: [
    PaymentsService,
    PaymentOrdersService,
    PaymentWebhooksService,
    RefundsService,
    SettlementService,
    PayoutsService,
    InvoicesService,
    CommissionPolicyService,
    LedgerService,
    BkashSandboxAdapter,
    SslcommerzSandboxAdapter,
    PaymentAdapterFactory,
  ],
  exports: [
    PaymentsService,
    PaymentOrdersService,
    PaymentWebhooksService,
    RefundsService,
    SettlementService,
    PayoutsService,
    InvoicesService,
    CommissionPolicyService,
    LedgerService,
    TypeOrmModule,
  ],
})
export class PaymentsModule {}
