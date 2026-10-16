import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentOrderEntity, PaymentTransactionEntity } from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { OutboxEventEntity } from '../../bookings/entities/outbox-event.entity';
import { LedgerService } from '../ledger.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { PaymentWebhookDto } from '../dto';

type WebhookHeaderMap = Record<string, string | string[] | undefined>;

/**
 * Verified webhook processing: signature check, timestamp anti-replay
 * window, duplicate-event dedup, amount/currency matching, and the atomic
 * payment + escrow-ledger + outbox + booking-confirm transaction.
 * Never trusts client redirects alone.
 */
@Injectable()
export class PaymentWebhooksService {
  private readonly logger = new Logger(PaymentWebhooksService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(PaymentAdapterFactory)
    private readonly adapterFactory: PaymentAdapterFactory,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * 2. Verified Webhook Processing (Never Trust Client Redirects Alone!)
   */
  async handleWebhook(
    provider: string,
    headers: Record<string, unknown>,
    rawBody: PaymentWebhookDto,
    requestId?: string,
  ): Promise<{ received: boolean; processed: boolean; orderId?: string; status?: string }> {
    const adapter = this.adapterFactory.getAdapter(provider);

    // 1. Verify Cryptographic Webhook Signature
    const isValidSignature = adapter.verifyWebhookSignature(
      headers as WebhookHeaderMap,
      rawBody as unknown as Record<string, unknown>,
    );
    if (!isValidSignature) {
      this.logger.warn(`Rejected webhook from provider '${provider}' due to invalid signature`);
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    // 2. Timestamp Anti-Replay Tolerance Window Check (tolerance: 300 seconds / 5 minutes)
    const bodyTimestamp: unknown =
      typeof rawBody === 'object' && rawBody !== null && 'timestamp' in rawBody
        ? (rawBody as { timestamp?: unknown }).timestamp
        : undefined;
    const rawTimestamp: unknown =
      headers['x-webhook-timestamp'] ||
      headers['X-WEBHOOK-TIMESTAMP'] ||
      headers['x-timestamp'] ||
      bodyTimestamp;

    if (rawTimestamp) {
      const eventTimeMs =
        typeof rawTimestamp === 'number'
          ? rawTimestamp > 1e11
            ? rawTimestamp
            : rawTimestamp * 1000
          : typeof rawTimestamp === 'string'
            ? new Date(rawTimestamp).getTime()
            : NaN;

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

    // 3. Find matching pending order (by orderId/paymentOrderId if provided, or most recent pending order)
    const rawRecord = rawBody as unknown as Record<string, unknown>;
    const orderIdToFind = rawRecord.orderId || rawRecord.paymentOrderId;
    const order = orderIdToFind
      ? await this.orderRepo.findOne({
          where: { id: String(orderIdToFind), status: 'pending' },
          relations: { booking: { subject: true, studentUser: true, requesterUser: true, tutorProfile: { user: true } } },
        })
      : await this.orderRepo.findOne({
          where: { status: 'pending' },
          order: { createdAt: 'DESC' },
          relations: { booking: { subject: true, studentUser: true, requesterUser: true, tutorProfile: { user: true } } },
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
          .catch((err) =>
            this.logger.warn(`Failed to dispatch payment.failed notification: ${err}`),
          );
      }

      return { received: true, processed: true, orderId: order.id, status: 'failed' };
    }

    // 5. Atomic PostgreSQL Execution: Payment + Ledger Journal + Outbox + Booking
    let confirmedBooking: BookingEntity | null = null;
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
      const booking = await manager.findOne(BookingEntity, {
        where: { id: order.bookingId },
        relations: { subject: true, studentUser: true, requesterUser: true },
      });
      if (booking) {
        booking.status = 'confirmed';
        await manager.save(booking);
        confirmedBooking = booking;
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
      const booking: BookingEntity | undefined | null = confirmedBooking || order.booking;

      const isStudentPayer = booking
        ? order.payerUserId === booking.studentUserId &&
          booking.requesterUserId === booking.studentUserId
        : true;
      const payerRole = isStudentPayer ? 'student' : 'guardian';

      await this.notificationService
        .dispatch({
          userId: order.payerUserId,
          recipientRole: payerRole,
          eventType: 'payment.succeeded',
          payload: {
            paymentId: order.id,
            bookingId: order.bookingId,
            amount: amountBdt,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch payer payment notification: ${err}`),
        );

      // Linked guardians
      const guardianIds = await this.guardianAccess.findActiveGuardianIds(order.payerUserId);
      for (const guardianId of guardianIds) {
        if (guardianId !== order.payerUserId) {
          await this.notificationService
            .dispatch({
              userId: guardianId,
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

      // Dispatch booking.confirmed to Tutor, Requester, and Student
      if (booking) {
        const subjectName = booking.subject?.nameEn || 'Tuition Subject';
        // 1. To Tutor
        await this.notificationService
          .dispatch({
            userId: booking.tutorUserId,
            recipientRole: 'tutor',
            eventType: 'booking.confirmed',
            payload: {
              bookingId: booking.id,
              subjectName,
              nextSessionTime: 'As scheduled in calendar',
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch tutor booking.confirmed notification: ${err}`),
          );

        // 2. To Requester (Guardian or Student)
        const requesterRole =
          booking.requesterUserId === booking.studentUserId ? 'student' : 'guardian';
        await this.notificationService
          .dispatch({
            userId: booking.requesterUserId,
            recipientRole: requesterRole,
            eventType: 'booking.confirmed',
            payload: {
              bookingId: booking.id,
              subjectName,
              nextSessionTime: 'As scheduled in calendar',
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch requester booking.confirmed notification: ${err}`),
          );

        // 3. To Student (if requester was guardian and student is distinct)
        if (booking.studentUserId !== booking.requesterUserId) {
          await this.notificationService
            .dispatch({
              userId: booking.studentUserId,
              recipientRole: 'student',
              eventType: 'booking.confirmed',
              payload: {
                bookingId: booking.id,
                subjectName,
                nextSessionTime: 'As scheduled in calendar',
              },
            })
            .catch((err) =>
              this.logger.warn(`Failed to dispatch student booking.confirmed notification: ${err}`),
            );
        }
      }
    }

    return { received: true, processed: true, orderId: order.id, status: 'succeeded' };
  }
}
