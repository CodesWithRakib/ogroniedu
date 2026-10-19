import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PaymentOrdersService } from './services/payment-orders.service';
import { PaymentWebhooksService } from './services/payment-webhooks.service';
import { RefundsService } from './services/refunds.service';
import { SettlementService } from './services/settlement.service';
import {
  CreatePaymentOrderDto,
  PaymentWebhookDto,
  ProcessRefundDto,
  SettleMilestoneDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type { PaymentReceiptDto } from './services/payment-orders.service';
export type { ReconciliationReport } from './services/settlement.service';

/**
 * Backward-compatible facade over the split payment domain services.
 * Controllers and other modules keep importing PaymentsService; new code
 * should inject PaymentOrdersService / PaymentWebhooksService /
 * RefundsService / SettlementService directly.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(forwardRef(() => PaymentOrdersService))
    private readonly orders: PaymentOrdersService,
    @Inject(forwardRef(() => PaymentWebhooksService))
    private readonly webhooks: PaymentWebhooksService,
    @Inject(forwardRef(() => RefundsService))
    private readonly refunds: RefundsService,
    @Inject(forwardRef(() => SettlementService))
    private readonly settlement: SettlementService,
  ) {}

  createPaymentOrder(
    user: AuthenticatedUser,
    dto: CreatePaymentOrderDto,
    idempotencyKey: string,
    requestId?: string,
  ) {
    return this.orders.createPaymentOrder(user, dto, idempotencyKey, requestId);
  }

  handleWebhook(
    provider: string,
    headers: Record<string, unknown>,
    rawBody: PaymentWebhookDto,
    requestId?: string,
  ) {
    return this.webhooks.handleWebhook(provider, headers, rawBody, requestId);
  }

  processRefund(user: AuthenticatedUser, dto: ProcessRefundDto, requestId?: string) {
    return this.refunds.processRefund(user, dto, requestId);
  }

  settleMilestone(user: AuthenticatedUser, dto: SettleMilestoneDto, requestId?: string) {
    return this.settlement.settleMilestone(user, dto, requestId);
  }

  getPaymentReceipt(user: AuthenticatedUser, orderId: string) {
    return this.orders.getPaymentReceipt(user, orderId);
  }

  getMyPaymentOrders(user: AuthenticatedUser) {
    return this.orders.getMyPaymentOrders(user);
  }

  runReconciliation() {
    return this.settlement.runReconciliation();
  }
}
