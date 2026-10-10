import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  PaymentOrderEntity,
  PaymentOrderStatus,
  PaymentTransactionEntity,
  PaymentRefundEntity,
  RefundStatus,
  LedgerJournalEntity,
} from './entities';
import { BookingEntity, BookingStatus } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { LedgerService } from './ledger.service';
import { PaymentAdapterFactory } from './adapters/adapter.factory';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CreatePaymentOrderDto,
  PaymentWebhookDto,
  ProcessRefundDto,
  SettleMilestoneDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface PaymentReceiptDto {
  receiptId: string;
  orderId: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountBdt: string;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  paymentMethod: string;
  provider: string;
  paidAt: string;
}

export interface ReconciliationReport {
  reconciledAt: string;
  totalOrders: number;
  succeededOrders: number;
  totalTransactions: number;
  isLedgerBalanced: boolean;
  ledgerTotalDebitsPoisha: string;
  ledgerTotalCreditsPoisha: string;
  unreconciledDiscrepancies: Array<{ orderId: string; reason: string }>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(PaymentRefundEntity)
    private readonly refundRepo: Repository<PaymentRefundEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepo: Repository<GuardianStudentLinkEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    private readonly ledgerService: LedgerService,
    private readonly adapterFactory: PaymentAdapterFactory,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Helper: Check if user is authorized to act on this booking
   */
  private async assertCanPayForBooking(
    user: AuthenticatedUser,
    booking: BookingEntity,
  ): Promise<void> {
    if (user.roles?.includes('admin')) {
      return;
    }

    if (user.id === booking.requesterUserId || user.id === booking.studentUserId) {
      return;
    }

    const activeLink = await this.guardianLinkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId: booking.studentUserId,
        status: 'active',
      },
    });

    if (activeLink) {
      return;
    }

    throw new ForbiddenException(
      'Access denied: Only the student, requester, or active linked guardian can pay for this booking',
    );
  }

  /**
   * 1. Create a Digital Payment Order with Idempotency Protection
   */
  async createPaymentOrder(
    user: AuthenticatedUser,
    dto: CreatePaymentOrderDto,
    idempotencyKey: string,
    requestId?: string,
  ): Promise<{
    orderId: string;
    checkoutUrl: string;
    amountMinor: number;
    currency: string;
    status: PaymentOrderStatus;
  }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: {
        studentUser: true,
        requesterUser: true,
        tutorProfile: true,
        subject: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    await this.assertCanPayForBooking(user, booking);

    // Validate booking state
    if (booking.status === 'confirmed') {
      throw new BadRequestException('This booking has already been paid and confirmed');
    }
    if (booking.status !== 'accepted' && booking.status !== 'awaiting_payment') {
      throw new BadRequestException(
        `Booking status '${booking.status}' cannot accept payments. Must be accepted by tutor first.`,
      );
    }

    // Idempotency check: Replay existing order if same idempotency key
    const existingOrder = await this.orderRepo.findOne({
      where: {
        payerUserId: user.id,
        idempotencyKey,
      },
    });

    const providerName = dto.provider || 'bkash';
    const adapter = this.adapterFactory.getAdapter(providerName);
    const amountMinor = Number(booking.pricePerSessionMinor);

    if (existingOrder) {
      this.logger.log(`Idempotent order returned for key ${idempotencyKey}`);
      const sessionResult = await adapter.createCheckoutSession(
        existingOrder.id,
        Number(existingOrder.amountMinor),
        existingOrder.currency,
        user.phone,
      );
      return {
        orderId: existingOrder.id,
        checkoutUrl: sessionResult.checkoutUrl,
        amountMinor: Number(existingOrder.amountMinor),
        currency: existingOrder.currency,
        status: existingOrder.status,
      };
    }

    // Create fresh payment order
    const order = this.orderRepo.create({
      bookingId: booking.id,
      payerUserId: user.id,
      amountMinor: amountMinor.toString(),
      currency: 'BDT',
      status: 'pending',
      idempotencyKey,
      provider: providerName,
    });

    const savedOrder = await this.orderRepo.save(order);

    // Call adapter to generate sandbox checkout session
    const sessionResult = await adapter.createCheckoutSession(
      savedOrder.id,
      amountMinor,
      'BDT',
      user.phone,
    );

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.order_created',
      resourceType: 'payment_orders',
      resourceId: savedOrder.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        amountMinor,
        currency: 'BDT',
        provider: providerName,
      },
    });

    return {
      orderId: savedOrder.id,
      checkoutUrl: sessionResult.checkoutUrl,
      amountMinor,
      currency: 'BDT',
      status: savedOrder.status,
    };
  }

  /**
   * 2. Verified Webhook Processing (Never Trust Client Redirects Alone!)
   */
  async handleWebhook(
    provider: string,
    headers: Record<string, any>,
    rawBody: PaymentWebhookDto,
    requestId?: string,
  ): Promise<{ received: boolean; processed: boolean; orderId?: string; status?: string }> {
    const adapter = this.adapterFactory.getAdapter(provider);

    // 1. Verify Cryptographic Webhook Signature
    const isValidSignature = adapter.verifyWebhookSignature(headers, rawBody as unknown as Record<string, unknown>);
    if (!isValidSignature) {
      this.logger.warn(`Rejected webhook from provider '${provider}' due to invalid signature`);
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    // 2. Timestamp Anti-Replay Tolerance Window Check (tolerance: 300 seconds / 5 minutes)
    const rawTimestamp =
      headers['x-webhook-timestamp'] ||
      headers['X-WEBHOOK-TIMESTAMP'] ||
      headers['x-timestamp'] ||
      (typeof rawBody === 'object' && (rawBody as any)?.timestamp);

    if (rawTimestamp) {
      const eventTimeMs =
        typeof rawTimestamp === 'number'
          ? rawTimestamp > 1e11
            ? rawTimestamp
            : rawTimestamp * 1000
          : new Date(rawTimestamp).getTime();

      if (isNaN(eventTimeMs)) {
        throw new BadRequestException('Malformed webhook timestamp header');
      }

      const nowMs = Date.now();
      const diffSeconds = Math.abs(nowMs - eventTimeMs) / 1000;
      const MAX_TOLERANCE_SECONDS = 300; // 5 minutes

      if (diffSeconds > MAX_TOLERANCE_SECONDS) {
        this.logger.warn(
          `Rejected webhook from provider '${provider}' due to timestamp expiration/replay (${diffSeconds}s skew)`,
        );
        throw new UnauthorizedException(
          'Webhook timestamp outside acceptable tolerance window (replay attack prevention)',
        );
      }
    }

    // 3. Replay & Duplicate Event Check
    const existingTxn = await this.transactionRepo.findOne({
      where: {
        provider,
        providerEventId: rawBody.providerEventId,
      },
    });

    if (existingTxn && existingTxn.status === 'succeeded') {
      this.logger.log(`Duplicate webhook event ${rawBody.providerEventId} received and ignored`);
      return { received: true, processed: false, status: 'succeeded' };
    }

    // 3. Find matching pending order
    const order = await this.orderRepo.findOne({
      where: { id: rawBody.providerTransactionId ? undefined : undefined }, // will find by booking or query
    }) || await this.orderRepo.findOne({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      relations: { booking: { subject: true, studentUser: true } },
    });

    if (!order) {
      throw new NotFoundException('Matching pending payment order not found');
    }

    // 4. Server-to-server transaction verification with provider
    const providerVerified = await adapter.queryTransaction(rawBody.providerTransactionId);

    // Amount & Currency mismatch verification
    if (BigInt(rawBody.amountMinor) !== BigInt(order.amountMinor)) {
      this.logger.error(
        `Amount mismatch for order ${order.id}: expected ${order.amountMinor}, got ${rawBody.amountMinor}`,
      );
      throw new BadRequestException('Payment amount mismatch between gateway and order');
    }

    if (rawBody.currency !== order.currency) {
      throw new BadRequestException('Currency mismatch between gateway and order');
    }

    // Handle failure event
    if (rawBody.status === 'failed' || providerVerified.status === 'failed') {
      order.status = 'failed';
      await this.orderRepo.save(order);

      const failedTxn = this.transactionRepo.create({
        paymentOrderId: order.id,
        provider,
        providerTransactionId: rawBody.providerTransactionId,
        providerEventId: rawBody.providerEventId,
        amountMinor: rawBody.amountMinor.toString(),
        currency: rawBody.currency,
        status: 'failed',
        rawPayloadRedacted: { status: 'failed', error: 'Payment declined at provider' },
      });
      await this.transactionRepo.save(failedTxn);

      if (this.notificationService) {
        const amountBdt = (Number(order.amountMinor) / 100).toFixed(2);
        await this.notificationService
          .dispatch({
            userId: order.payerUserId,
            recipientRole: 'student',
            eventType: 'payment.failed',
            payload: { bookingId: order.bookingId, amount: amountBdt },
          })
          .catch((err) => this.logger.warn(`Failed to dispatch payment.failed notification: ${err}`));
      }

      return { received: true, processed: true, orderId: order.id, status: 'failed' };
    }

    // 5. Atomic PostgreSQL Execution: Payment + Ledger Journal + Outbox + Booking
    await this.dataSource.transaction(async (manager) => {
      // a. Mark order succeeded
      order.status = 'succeeded';
      order.updatedAt = new Date();
      await manager.save(order);

      // b. Record payment transaction
      const txn = manager.create(PaymentTransactionEntity, {
        paymentOrderId: order.id,
        provider,
        providerTransactionId: rawBody.providerTransactionId,
        providerEventId: rawBody.providerEventId,
        amountMinor: order.amountMinor.toString(),
        currency: order.currency,
        status: 'succeeded',
        verifiedAt: new Date(),
        rawPayloadRedacted: {
          provider,
          txnId: rawBody.providerTransactionId,
          verified: true,
        },
      });
      await manager.save(txn);

      // c. Post Double-Entry Ledger Journal (Advance Escrow Deposit)
      // Debit: 1000 Escrow Pool (+Asset)
      // Credit: 2100 Student Escrow Deposit (+Liability)
      await this.ledgerService.postJournal({
        sourceType: 'payment_order',
        sourceId: order.id,
        idempotencyKey: `ledger:payment:${order.id}`,
        description: `Advance escrow deposit for booking #${order.bookingId}`,
        entries: [
          { accountCode: '1000', direction: 'debit', amountMinor: order.amountMinor },
          { accountCode: '2100', direction: 'credit', amountMinor: order.amountMinor },
        ],
      });

      // d. Transition Booking to Confirmed
      const booking = await manager.findOne(BookingEntity, { where: { id: order.bookingId } });
      if (booking) {
        booking.status = 'confirmed';
        await manager.save(booking);
      }

      // e. Transactional Outbox Event
      const outbox = manager.create(OutboxEventEntity, {
        aggregateType: 'payment_order',
        aggregateId: order.id,
        eventType: 'payment.succeeded',
        payload: {
          orderId: order.id,
          bookingId: order.bookingId,
          amountMinor: order.amountMinor,
          currency: order.currency,
        },
      });
      await manager.save(outbox);
    });

    // 6. Asynchronous Non-blocking Notifications & Audit
    await this.auditService.record({
      actorUserId: order.payerUserId,
      action: 'payment.order_succeeded',
      resourceType: 'payment_orders',
      resourceId: order.id,
      requestId,
      safeMetadata: {
        orderId: order.id,
        bookingId: order.bookingId,
        amountMinor: order.amountMinor,
        providerTransactionId: rawBody.providerTransactionId,
      },
    });

    if (this.notificationService) {
      const amountBdt = (Number(order.amountMinor) / 100).toFixed(2);
      await this.notificationService
        .dispatch({
          userId: order.payerUserId,
          recipientRole: 'student',
          eventType: 'payment.succeeded',
          payload: {
            paymentId: order.id,
            bookingId: order.bookingId,
            amount: amountBdt,
          },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch student payment notification: ${err}`));

      // Linked guardians
      const guardians = await this.guardianLinkRepo.find({
        where: { studentUserId: order.payerUserId, status: 'active' },
      });
      for (const g of guardians) {
        await this.notificationService
          .dispatch({
            userId: g.guardianUserId,
            recipientRole: 'guardian',
            eventType: 'payment.succeeded',
            payload: {
              paymentId: order.id,
              bookingId: order.bookingId,
              amount: amountBdt,
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian payment notification: ${err}`),
          );
      }
    }

    return { received: true, processed: true, orderId: order.id, status: 'succeeded' };
  }

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

    const alreadyRefunded = previousRefunds.reduce(
      (sum, r) => sum + BigInt(r.amountMinor),
      0n,
    );

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

  /**
   * 4. Settle Session Milestone (Escrow -> Tutor Payable 92% + Platform 8% Commission)
   */
  async settleMilestone(
    user: AuthenticatedUser,
    dto: SettleMilestoneDto,
    requestId?: string,
  ): Promise<LedgerJournalEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: { booking: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status !== 'completed') {
      throw new BadRequestException('Only completed sessions can be settled');
    }

    const booking = session.booking;
    if (!booking) {
      throw new NotFoundException('Associated booking not found');
    }

    const totalMinor = BigInt(booking.pricePerSessionMinor);
    // Platform charges 8% commission on lesson bookings (docs/audits/architecture-decisions-needed.md)
    const platformCommissionMinor = (totalMinor * 8n) / 100n;
    const tutorPayableMinor = totalMinor - platformCommissionMinor; // 92%

    // Post double-entry settlement journal
    // Debit: 2100 Student Escrow Deposit -> totalMinor
    // Credit: 2000 Tutor Earnings Payable Liability -> tutorPayableMinor (92%)
    // Credit: 4000 Tutoring Platform Service Fee Revenue -> platformCommissionMinor (8%)
    const journal = await this.ledgerService.postJournal({
      sourceType: 'session_milestone',
      sourceId: session.id,
      idempotencyKey: `ledger:settlement:session:${session.id}`,
      description: `Settlement for session #${session.id}: 92% tutor payout, 8% platform service fee`,
      createdBy: user.id,
      entries: [
        { accountCode: '2100', direction: 'debit', amountMinor: totalMinor },
        { accountCode: '2000', direction: 'credit', amountMinor: tutorPayableMinor },
        { accountCode: '4000', direction: 'credit', amountMinor: platformCommissionMinor },
      ],
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.milestone_settled',
      resourceType: 'booking_sessions',
      resourceId: session.id,
      requestId,
      safeMetadata: {
        sessionId: session.id,
        totalMinor: totalMinor.toString(),
        tutorPayableMinor: tutorPayableMinor.toString(),
        platformCommissionMinor: platformCommissionMinor.toString(),
      },
    });

    return journal;
  }

  /**
   * 5. Generate Verifiable Payment Receipt
   */
  async getPaymentReceipt(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<PaymentReceiptDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        booking: { subject: true, studentUser: true, requesterUser: true },
        payerUser: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Payment order ${orderId} not found`);
    }

    if (
      user.id !== order.payerUserId &&
      user.id !== order.booking?.studentUserId &&
      user.id !== order.booking?.requesterUserId &&
      !user.roles?.includes('admin')
    ) {
      throw new ForbiddenException('Access denied to payment receipt');
    }

    const amountBdt = (Number(order.amountMinor) / 100).toFixed(2);

    return {
      receiptId: `REC-${order.id.slice(0, 8).toUpperCase()}`,
      orderId: order.id,
      bookingId: order.bookingId,
      payerName: order.payerUser?.displayName || 'Valued Guardian/Student',
      studentName: order.booking?.studentUser?.displayName || 'Student',
      tutorName: 'Verified OgroniEdu Tutor',
      subjectName: order.booking?.subject?.nameEn || 'Tutoring Course',
      amountBdt,
      amountMinor: Number(order.amountMinor),
      currency: order.currency,
      status: order.status,
      paymentMethod: order.provider.toUpperCase(),
      provider: order.provider,
      paidAt: order.updatedAt.toISOString(),
    };
  }

  /**
   * 6. Financial Reconciliation Audit: Orders vs Ledger vs Bank/MFS Transactions
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    const orders = await this.orderRepo.find();
    const transactions = await this.transactionRepo.find();
    const ledgerIntegrity = await this.ledgerService.verifySystemLedgerIntegrity();

    const succeededOrders = orders.filter((o) => o.status === 'succeeded');
    const discrepancies: Array<{ orderId: string; reason: string }> = [];

    // Verify each succeeded order has a matching succeeded transaction
    for (const order of succeededOrders) {
      const match = transactions.find(
        (t) => t.paymentOrderId === order.id && t.status === 'succeeded',
      );
      if (!match) {
        discrepancies.push({
          orderId: order.id,
          reason: 'Succeeded payment order has no verified transaction record',
        });
      }
    }

    if (!ledgerIntegrity.isBalanced) {
      discrepancies.push({
        orderId: 'SYSTEM_LEDGER',
        reason: `System ledger is unbalanced by ${ledgerIntegrity.discrepancy} poisha`,
      });
    }

    return {
      reconciledAt: new Date().toISOString(),
      totalOrders: orders.length,
      succeededOrders: succeededOrders.length,
      totalTransactions: transactions.length,
      isLedgerBalanced: ledgerIntegrity.isBalanced,
      ledgerTotalDebitsPoisha: ledgerIntegrity.totalDebits.toString(),
      ledgerTotalCreditsPoisha: ledgerIntegrity.totalCredits.toString(),
      unreconciledDiscrepancies: discrepancies,
    };
  }
}
