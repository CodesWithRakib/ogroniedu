import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  PaymentOrderEntity,
  PaymentRefundEntity,
  PaymentTransactionEntity,
  EscrowHoldEntity,
} from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../../bookings/entities/outbox-event.entity';
import { LedgerService } from '../ledger.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { ConfirmManualRefundDto, DecideRefundDto, RequestRefundDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { parseMinor } from '../../../common/money/money';

const RESERVED_STATUSES = ['requested', 'approved', 'processing'] as const;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentRefundEntity)
    private readonly refundRepo: Repository<PaymentRefundEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(EscrowHoldEntity)
    private readonly escrowRepo: Repository<EscrowHoldEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(PaymentAdapterFactory)
    private readonly adapterFactory: PaymentAdapterFactory,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Step 1: create a refund request. No money moves here. The amount is
   * reserved against the order so parallel requests cannot exceed the paid
   * balance, and the released-to-tutor portion is explicitly excluded.
   */
  async requestRefund(
    user: AuthenticatedUser,
    dto: RequestRefundDto,
  ): Promise<PaymentRefundEntity> {
    const amount = parseMinor(dto.amountMinor);

    const refund = await this.dataSource.transaction(async (manager) => {
      if (dto.idempotencyKey) {
        const existing = await manager.findOne(PaymentRefundEntity, {
          where: { requestedBy: user.id, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return existing;
      }

      const order = await manager.findOne(PaymentOrderEntity, {
        where: { id: dto.paymentOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Payment order not found');

      const booking =
        order.booking ??
        (order.bookingId
          ? await manager.findOne(BookingEntity, {
              where: { id: order.bookingId },
              relations: {
                studentUser: true,
                requesterUser: true,
                tutorProfile: { user: true },
              },
            })
          : null);
      if (!booking) throw new NotFoundException('Booking for payment order not found');
      order.booking = booking;

      await this.guardianAccess.assertCanAccessBooking(
        user,
        booking,
        'Access denied: only the payer, student, requester, linked guardian or an administrator may request this refund',
      );

      if (order.status !== 'succeeded') {
        throw new BadRequestException('Only a verified successful payment can be refunded');
      }

      const hold = await manager.findOne(EscrowHoldEntity, {
        where: { paymentOrderId: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      const released = hold ? BigInt(hold.releasedMinor) : 0n;
      if (released > 0n && !isAdminRole(user)) {
        throw new BadRequestException(
          'Settled tutor earnings cannot be refunded through a customer request. Open a dispute for finance review.',
        );
      }

      const previous = await manager.find(PaymentRefundEntity, {
        where: { paymentOrderId: order.id },
      });
      const succeeded = previous
        .filter((r) => r.status === 'succeeded')
        .reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);
      const reserved = previous
        .filter((r) => (RESERVED_STATUSES as readonly string[]).includes(r.status))
        .reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);

      const orderTotal = BigInt(order.amountMinor);
      const refundable = orderTotal - succeeded - reserved - released;
      if (amount <= 0n || amount > refundable) {
        throw new BadRequestException(
          `Refund amount exceeds the refundable balance (${refundable > 0n ? refundable.toString() : '0'} poisha)`,
        );
      }

      const rows = await manager.query<Array<{ nextval: string }>>(
        "SELECT nextval('refund_number_seq')::text AS nextval",
      );
      const sequence = rows[0]?.nextval ?? '1';

      const entity = manager.create(PaymentRefundEntity, {
        paymentOrderId: order.id,
        bookingId: order.bookingId,
        amountMinor: amount.toString(),
        currency: order.currency,
        reason: dto.reason,
        status: 'requested',
        refundNumber: `RFD-${new Date().getUTCFullYear()}-${sequence.padStart(6, '0')}`,
        initiatedByRole: isAdminRole(user) ? 'admin' : (user.roles?.[0] ?? 'user'),
        requestedBy: user.id,
        idempotencyKey: dto.idempotencyKey ?? null,
        eligibilitySnapshot: {
          orderAmountMinor: orderTotal.toString(),
          releasedToTutorMinor: released.toString(),
          previouslyRefundedMinor: succeeded.toString(),
          reservedMinor: reserved.toString(),
          refundableMinor: refundable.toString(),
          bookingStatus: order.booking.status,
          assessedAt: new Date().toISOString(),
        },
      });

      return manager.save(entity);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.refund_requested',
      resourceType: 'payment_refunds',
      resourceId: refund.id,
      safeMetadata: {
        refundNumber: refund.refundNumber,
        orderId: refund.paymentOrderId,
        amountMinor: refund.amountMinor.toString(),
      },
    });

    await this.notify(refund.paymentOrderId, 'refund.requested', {
      refundId: refund.id,
      amount: (Number(refund.amountMinor) / 100).toFixed(2),
    });

    return refund;
  }

  /** Finance step: approve or reject a pending request. */
  async decide(
    user: AuthenticatedUser,
    refundId: string,
    dto: DecideRefundDto,
  ): Promise<PaymentRefundEntity> {
    const refund = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentRefundEntity, {
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Refund not found');
      if (locked.status !== 'requested') {
        throw new BadRequestException(`Refund in status '${locked.status}' cannot be decided`);
      }

      locked.status = dto.decision === 'approve' ? 'approved' : 'rejected';
      locked.decidedBy = user.id;
      locked.decidedAt = new Date();
      locked.decisionNote = dto.note ?? null;
      if (dto.decision === 'reject') {
        locked.failureReason = dto.note ?? 'Rejected by finance review';
      }
      return manager.save(locked);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: `finance.refund_${dto.decision === 'approve' ? 'approved' : 'rejected'}`,
      resourceType: 'payment_refunds',
      resourceId: refund.id,
      safeMetadata: { note: dto.note ?? null },
    });

    if (dto.decision === 'approve') {
      await this.notify(refund.paymentOrderId, 'refund.approved', {
        refundId: refund.id,
        amount: (Number(refund.amountMinor) / 100).toFixed(2),
      });
    } else {
      await this.notify(refund.paymentOrderId, 'refund.rejected', {
        refundId: refund.id,
      });
    }

    return refund;
  }

  /**
   * Finance step: attempt automated provider refund. Adapters report
   * `unsupported` when no automated contract is provisioned; the refund stays
   * approved and requires the audited manual confirmation path.
   */
  async process(
    user: AuthenticatedUser,
    refundId: string,
  ): Promise<{ refund: PaymentRefundEntity; manualConfirmationRequired: boolean }> {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status === 'succeeded') {
      return { refund, manualConfirmationRequired: false };
    }
    if (refund.status !== 'approved' && refund.status !== 'processing') {
      throw new BadRequestException(`Refund in status '${refund.status}' cannot be processed`);
    }

    const order = await this.orderRepo.findOne({ where: { id: refund.paymentOrderId } });
    if (!order || order.status !== 'succeeded') {
      throw new BadRequestException('Refund order is not a successful payment');
    }

    const transaction = await this.transactionRepo.findOne({
      where: { paymentOrderId: order.id, status: 'succeeded' },
    });
    if (!transaction?.providerTransactionId) {
      throw new ConflictException(
        'No verified provider transaction reference exists for this payment',
      );
    }

    const adapter = this.adapterFactory.getAdapter(order.provider);
    let result;
    try {
      result = await adapter.processRefund(
        transaction.providerTransactionId,
        Number(refund.amountMinor),
        refund.reason ?? 'refund',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Provider refund call failed';
      const failed = await this.markFailed(refund.id, message, 'error');
      return { refund: failed, manualConfirmationRequired: false };
    }

    if (result.status === 'unsupported') {
      refund.providerStatus = 'unsupported';
      refund.failureReason = result.failureReason ?? 'Automated refund is not supported';
      await this.refundRepo.save(refund);
      return { refund, manualConfirmationRequired: true };
    }

    if (result.status === 'failed') {
      const failed = await this.markFailed(
        refund.id,
        result.failureReason ?? 'Provider rejected the refund',
        'failed',
      );
      return { refund: failed, manualConfirmationRequired: false };
    }

    const finalized = await this.finalize(user, refund.id, {
      providerRefundId: result.providerRefundId ?? null,
      externalReference: result.providerRefundId ?? null,
      providerStatus: 'succeeded',
      confirmedAt: new Date(),
      note: 'Provider-confirmed automated refund',
    });
    return { refund: finalized, manualConfirmationRequired: false };
  }

  /** Finance step: record a real external transfer and post the reversal. */
  async confirmManual(
    user: AuthenticatedUser,
    refundId: string,
    dto: ConfirmManualRefundDto,
  ): Promise<PaymentRefundEntity> {
    return this.finalize(user, refundId, {
      providerRefundId: null,
      externalReference: dto.externalReference,
      providerStatus: 'manual_confirmed',
      confirmedAt: dto.confirmedAt ? new Date(dto.confirmedAt) : new Date(),
      note: dto.note ?? 'Manually confirmed external refund',
    });
  }

  private async markFailed(
    refundId: string,
    reason: string,
    providerStatus: string,
  ): Promise<PaymentRefundEntity> {
    const failed = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!failed) throw new NotFoundException('Refund not found');
    failed.status = 'failed';
    failed.failureReason = reason;
    failed.providerStatus = providerStatus;
    const saved = await this.refundRepo.save(failed);
    await this.notify(saved.paymentOrderId, 'refund.failed', { refundId: saved.id });
    return saved;
  }

  private async finalize(
    user: AuthenticatedUser,
    refundId: string,
    confirmation: {
      providerRefundId: string | null;
      externalReference: string | null;
      providerStatus: string;
      confirmedAt: Date;
      note: string;
    },
  ): Promise<PaymentRefundEntity> {
    if (!confirmation.externalReference?.trim()) {
      throw new BadRequestException('An external refund reference is required');
    }

    const finalized = await this.dataSource.transaction(async (manager) => {
      const refund = await manager.findOne(PaymentRefundEntity, {
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refund) throw new NotFoundException('Refund not found');
      if (refund.status === 'succeeded') return refund;
      if (refund.status !== 'approved' && refund.status !== 'processing') {
        throw new BadRequestException(`Refund in status '${refund.status}' cannot be completed`);
      }

      const order = await manager.findOne(PaymentOrderEntity, {
        where: { id: refund.paymentOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Payment order not found');

      const hold = await manager.findOne(EscrowHoldEntity, {
        where: { paymentOrderId: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!hold) {
        throw new ConflictException('Escrow hold is missing for this payment');
      }

      const amount = BigInt(refund.amountMinor);
      const otherRefunds = await manager.find(PaymentRefundEntity, {
        where: {
          paymentOrderId: order.id,
          status: In(['succeeded', 'approved', 'processing', 'requested']),
        },
      });
      const committedElsewhere = otherRefunds
        .filter((r) => r.id !== refund.id)
        .reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);

      const released = BigInt(hold.releasedMinor);
      const refunded = BigInt(hold.refundedMinor);
      if (refunded + amount + released + committedElsewhere > BigInt(order.amountMinor)) {
        throw new ConflictException('Refund would exceed the escrow hold balance');
      }

      const journal = await this.ledgerService.postJournal(
        {
          sourceType: 'payment_refund',
          sourceId: refund.id,
          idempotencyKey: `ledger:refund:${refund.id}`,
          description: `Refund ${refund.refundNumber ?? refund.id} for order #${order.id}`,
          createdBy: user.id,
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: amount },
            { accountCode: '1000', direction: 'credit', amountMinor: amount },
          ],
        },
        manager,
      );

      refund.status = 'succeeded';
      refund.processedBy = user.id;
      refund.providerRefundId = confirmation.providerRefundId;
      refund.providerReference = confirmation.externalReference;
      refund.providerStatus = confirmation.providerStatus;
      refund.providerConfirmedAt = confirmation.confirmedAt;
      refund.failureReason = null;
      refund.ledgerJournalId = journal.id;
      if (confirmation.note) refund.decisionNote = confirmation.note;
      const saved = await manager.save(refund);

      hold.refundedMinor = (refunded + amount).toString();
      const newRefunded = refunded + amount;
      const totalConsumed = released + newRefunded;
      hold.status =
        totalConsumed === BigInt(hold.amountMinor)
          ? released > 0n
            ? 'closed'
            : 'refunded'
          : newRefunded > 0n
            ? 'partially_refunded'
            : hold.status;
      if (totalConsumed === BigInt(hold.amountMinor)) {
        hold.closedAt = new Date();
      }
      await manager.save(hold);

      await manager.save(
        manager.create(OutboxEventEntity, {
          aggregateType: 'payment_refund',
          aggregateId: saved.id,
          eventType: 'refund.processed',
          payload: {
            refundId: saved.id,
            orderId: order.id,
            amountMinor: saved.amountMinor,
            externalReference: confirmation.externalReference,
          },
        }),
      );

      return saved;
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.refund_succeeded',
      resourceType: 'payment_refunds',
      resourceId: finalized.id,
      safeMetadata: {
        refundNumber: finalized.refundNumber,
        amountMinor: finalized.amountMinor.toString(),
        externalReference: confirmation.externalReference,
        providerStatus: confirmation.providerStatus,
      },
    });

    await this.notify(finalized.paymentOrderId, 'refund.processed', {
      refundId: finalized.id,
      amount: (Number(finalized.amountMinor) / 100).toFixed(2),
    });

    return finalized;
  }

  async listMine(user: AuthenticatedUser): Promise<PaymentRefundEntity[]> {
    return this.refundRepo
      .createQueryBuilder('refund')
      .innerJoin(PaymentOrderEntity, 'orders', 'orders.id = refund.payment_order_id')
      .leftJoin('bookings', 'booking', 'booking.id = orders.booking_id')
      .where('refund.requested_by = :userId', { userId: user.id })
      .orWhere('orders.payer_user_id = :userId', { userId: user.id })
      .orWhere('booking.student_user_id = :userId', { userId: user.id })
      .orWhere('booking.requester_user_id = :userId', { userId: user.id })
      .orderBy('refund.created_at', 'DESC')
      .take(100)
      .getMany();
  }

  async listForFinance(status?: string): Promise<PaymentRefundEntity[]> {
    const where = status ? { status: status as PaymentRefundEntity['status'] } : {};
    return this.refundRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async getRefund(user: AuthenticatedUser, refundId: string): Promise<PaymentRefundEntity> {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (isAdminRole(user) || refund.requestedBy === user.id) return refund;

    const order = await this.orderRepo.findOne({
      where: { id: refund.paymentOrderId },
      relations: {
        booking: { studentUser: true, requesterUser: true, tutorProfile: { user: true } },
      },
    });
    if (!order?.booking) throw new ForbiddenException('Access denied to this refund');
    await this.guardianAccess.assertCanAccessBooking(
      user,
      order.booking,
      'Access denied to this refund',
    );
    return refund;
  }

  private async notify(
    paymentOrderId: string,
    eventType:
      | 'refund.requested'
      | 'refund.approved'
      | 'refund.rejected'
      | 'refund.processed'
      | 'refund.failed',
    payload: Record<string, string | number>,
  ): Promise<void> {
    if (!this.notificationService) return;
    const order = await this.orderRepo.findOne({ where: { id: paymentOrderId } });
    if (!order) return;
    await this.notificationService
      .dispatch({
        userId: order.payerUserId,
        recipientRole: 'student',
        eventType,
        payload,
      })
      .catch((err) => this.logger.warn(`Refund notification failed: ${err}`));
  }

  /** Backward-compatible admin cancellation helper (request + auto-approve). */
  async requestAndApproveForAdmin(
    user: AuthenticatedUser,
    dto: { paymentOrderId: string; amountMinor: number; reason: string },
  ): Promise<PaymentRefundEntity> {
    const refund = await this.requestRefund(user, dto as RequestRefundDto);
    if (refund.status === 'requested') {
      return this.decide(user, refund.id, {
        decision: 'approve',
        note: 'Approved as part of administrative booking cancellation',
      });
    }
    return refund;
  }
}
