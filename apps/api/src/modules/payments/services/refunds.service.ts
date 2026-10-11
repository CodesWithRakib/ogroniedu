import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  PaymentOrderEntity,
  PaymentRefundEntity,
} from '../entities';
import { OutboxEventEntity } from '../../bookings/entities/outbox-event.entity';
import { LedgerService } from '../ledger.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { ProcessRefundDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

/**
 * Operational refunds with strict balance-bounds checks and reversal
 * ledger journals. Only succeeded orders can be refunded and total
 * refunded can never exceed the paid order amount.
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentRefundEntity)
    private readonly refundRepo: Repository<PaymentRefundEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(PaymentAdapterFactory)
    private readonly adapterFactory: PaymentAdapterFactory,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * 3. Process Operational Refund with Strict Balance Bounds Check
   */
  async processRefund(
    user: AuthenticatedUser,
    dto: ProcessRefundDto,
    requestId?: string,
  ): Promise<PaymentRefundEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.paymentOrderId },
      relations: { booking: true },
    });

    if (!order) {
      throw new NotFoundException(`Payment order ${dto.paymentOrderId} not found`);
    }

    if (order.status !== 'succeeded') {
      throw new BadRequestException('Only succeeded payment orders can be refunded');
    }

    // Verify refund bounds: total refunded cannot exceed total paid order amount
    const previousRefunds = await this.refundRepo.find({
      where: {
        paymentOrderId: order.id,
        status: In(['succeeded', 'processing', 'approved']),
      },
    });

    const alreadyRefunded = previousRefunds.reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);

    const requestedAmount = BigInt(dto.amountMinor);
    const orderTotal = BigInt(order.amountMinor);

    if (alreadyRefunded + requestedAmount > orderTotal) {
      throw new BadRequestException(
        `Refund amount (${requestedAmount}) exceeds available balance (${orderTotal - alreadyRefunded})`,
      );
    }

    // Call provider adapter for refund
    const adapter = this.adapterFactory.getAdapter(order.provider);
    const refundResult = await adapter.processRefund(
      `TXN-${order.id.slice(0, 8)}`,
      dto.amountMinor,
      dto.reason,
    );

    const refund = this.refundRepo.create({
      paymentOrderId: order.id,
      amountMinor: dto.amountMinor.toString(),
      currency: order.currency,
      reason: dto.reason,
      status: 'succeeded',
      providerRefundId: refundResult.providerRefundId,
      requestedBy: user.id,
      processedBy: user.id,
    });

    const savedRefund = await this.refundRepo.save(refund);

    // Post Reversal Double-Entry Ledger Journal:
    // Debit: 2100 Student Escrow Deposit (-Liability)
    // Credit: 1000 Escrow Holding Pool (-Asset)
    await this.ledgerService.postJournal({
      sourceType: 'payment_refund',
      sourceId: savedRefund.id,
      idempotencyKey: `ledger:refund:${savedRefund.id}`,
      description: `Refund for order #${order.id}: ${dto.reason}`,
      createdBy: user.id,
      entries: [
        { accountCode: '2100', direction: 'debit', amountMinor: dto.amountMinor },
        { accountCode: '1000', direction: 'credit', amountMinor: dto.amountMinor },
      ],
    });

    // Outbox Event
    const outbox = this.outboxRepo.create({
      aggregateType: 'payment_refund',
      aggregateId: savedRefund.id,
      eventType: 'refund.processed',
      payload: {
        refundId: savedRefund.id,
        orderId: order.id,
        amountMinor: dto.amountMinor,
      },
    });
    await this.outboxRepo.save(outbox);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.refund_processed',
      resourceType: 'payment_refunds',
      resourceId: savedRefund.id,
      requestId,
      safeMetadata: {
        orderId: order.id,
        amountMinor: dto.amountMinor,
        reason: dto.reason,
      },
    });

    // Notify Student & Guardians
    if (this.notificationService) {
      const amountBdt = (dto.amountMinor / 100).toFixed(2);
      await this.notificationService
        .dispatch({
          userId: order.payerUserId,
          recipientRole: 'student',
          eventType: 'refund.processed',
          payload: { refundId: savedRefund.id, amount: amountBdt },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch refund notification: ${err}`));
    }

    return savedRefund;
  }
}
