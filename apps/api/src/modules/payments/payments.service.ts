import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PaymentOrdersService } from './services/payment-orders.service';
import { PaymentWebhooksService } from './services/payment-webhooks.service';
import { RefundsService } from './services/refunds.service';
import { SettlementService } from './services/settlement.service';
import { PayoutsService } from './services/payouts.service';
import { CreatePaymentOrderDto, RequestRefundDto, SettleMilestoneDto } from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type { PaymentReceiptDto } from './services/payment-orders.service';
export type { ReconciliationReport } from './services/settlement.service';

/**
 * Backward-compatible facade over the split payment domain services.
 * Controllers and other modules keep importing PaymentsService; new code
 * should inject PaymentOrdersService / PaymentWebhooksService /
 * RefundsService / SettlementService / PayoutsService directly.
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
    @Inject(forwardRef(() => PayoutsService))
    private readonly payouts: PayoutsService,
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
    rawBody: Record<string, unknown>,
    requestId?: string,
    rawBodyString?: string,
  ) {
    return this.webhooks.handleWebhook(provider, headers, rawBody, requestId, rawBodyString);
  }

  requestRefund(user: AuthenticatedUser, dto: RequestRefundDto) {
    return this.refunds.requestRefund(user, dto);
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

  runReconciliation(user?: AuthenticatedUser) {
    return this.settlement.runReconciliation(user);
  }

  getTutorSummary(user: AuthenticatedUser) {
    return this.payouts.getTutorSummary(user);
  }
}
