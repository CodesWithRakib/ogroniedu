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
import { Repository, DataSource, EntityManager } from 'typeorm';
import crypto from 'node:crypto';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  EscrowHoldEntity,
  WebhookEventEntity,
  InvoiceEntity,
} from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingStatusEventEntity } from '../../bookings/entities/booking-status-event.entity';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { OutboxEventEntity } from '../../bookings/entities/outbox-event.entity';
import { LedgerService } from '../ledger.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { InvoicesService } from './invoices.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import type { NormalizedWebhookEvent } from '../adapters/payment-provider.interface';

type WebhookHeaderMap = Record<string, string | string[] | undefined>;

interface ConfirmedPayment {
  order: PaymentOrderEntity;
  booking: BookingEntity | null;
  invoice: InvoiceEntity | null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

/**
 * Verified webhook processing: raw-body signature check, timestamp anti-replay,
 * durable event dedupe, strict order reference, server-to-server verification,
 * amount/currency matching, and one atomic transaction for payment, escrow
 * hold, ledger, invoice, booking confirmation and outbox.
 */
@Injectable()
export class PaymentWebhooksService {
  private readonly logger = new Logger(PaymentWebhooksService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(WebhookEventEntity)
    private readonly webhookRepo: Repository<WebhookEventEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(PaymentAdapterFactory)
    private readonly adapterFactory: PaymentAdapterFactory,
    @Inject(InvoicesService)
    private readonly invoicesService: InvoicesService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  async handleWebhook(
    provider: string,
    headers: Record<string, unknown>,
    body: Record<string, unknown>,
    requestId?: string,
    rawBodyString?: string,
  ): Promise<{ received: boolean; processed: boolean; orderId?: string; status?: string }> {
    const adapter = this.adapterFactory.getAdapter(provider);
    const headerMap = headers as WebhookHeaderMap;
    const signaturePayload = rawBodyString ?? body;

    if (!adapter.verifyWebhookSignature(headerMap, signaturePayload)) {
      this.logger.warn(`Rejected webhook from provider '${provider}' due to invalid signature`);
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    const event = adapter.normalizeWebhook(headerMap, signaturePayload);
    if (!event.orderReference) {
      throw new BadRequestException('Webhook does not reference a payment order');
    }

    const eventRecord = await this.persistEventReceived(provider, event, signaturePayload);
    if (!eventRecord) {
      return { received: true, processed: false };
    }

    try {
      this.assertTimestamp(headerMap, body);

      const order = await this.orderRepo.findOne({
        where: { id: event.orderReference },
        relations: {
          payerUser: true,
          booking: {
            subject: true,
            studentUser: true,
            requesterUser: true,
            tutorProfile: { user: true },
          },
        },
      });
      if (!order) {
        await this.finishEvent(eventRecord.id, 'rejected', null, 'Unknown payment order reference');
        throw new NotFoundException('Payment order referenced by the webhook was not found');
      }

      if (event.status === 'pending') {
        await this.finishEvent(eventRecord.id, 'processed', order.id, null);
        return { received: true, processed: false, orderId: order.id, status: 'pending' };
      }

      if (event.status === 'failed') {
        return await this.handleFailure(eventRecord, order, event, provider);
      }

      const result = await this.handleSuccess(eventRecord, order, event, provider, requestId);
      if (!result) {
        return { received: true, processed: false, orderId: order.id, status: 'succeeded' };
      }

      await this.dispatchSuccessNotifications(result);
      return { received: true, processed: true, orderId: order.id, status: 'succeeded' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      await this.finishEvent(eventRecord.id, 'failed', null, message).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Insert-first dedupe. Returns null when the event is already processed or
   * currently in flight. A previously failed event is retried; payment order
   * locking plus ledger idempotency keep the retry safe.
   */
  private async persistEventReceived(
    provider: string,
    event: NormalizedWebhookEvent,
    payload: unknown,
  ): Promise<WebhookEventEntity | null> {
    const payloadHash = crypto
      .createHash('sha256')
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');

    const record = this.webhookRepo.create({
      provider,
      providerEventId: event.eventId,
      eventType: event.eventType,
      signatureValid: true,
      payloadHash,
      payloadRedacted: {
        orderReference: event.orderReference,
        providerTransactionId: event.providerTransactionId,
        amountMinor: event.amountMinor,
        currency: event.currency,
        status: event.status,
        rawStatus: event.rawStatus,
      },
      status: 'received',
      paymentOrderId: null,
    });

    try {
      return await this.webhookRepo.save(record);
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.webhookRepo.findOne({
        where: { provider, providerEventId: event.eventId },
      });
      if (!existing || existing.status !== 'failed') {
        this.logger.log(`Duplicate webhook event ${event.eventId} ignored`);
        return null;
      }
      existing.status = 'received';
      existing.errorMessage = null;
      existing.processedAt = null;
      return this.webhookRepo.save(existing);
    }
  }

  private assertTimestamp(headers: WebhookHeaderMap, body: Record<string, unknown>): void {
    const rawTimestamp =
      headers['x-webhook-timestamp'] ||
      headers['X-WEBHOOK-TIMESTAMP'] ||
      headers['x-timestamp'] ||
      body.timestamp;

    if (!rawTimestamp) return;

    const eventTimeMs =
      typeof rawTimestamp === 'number'
        ? rawTimestamp > 1e11
          ? rawTimestamp
          : rawTimestamp * 1000
        : typeof rawTimestamp === 'string'
          ? new Date(rawTimestamp).getTime()
          : NaN;

    if (Number.isNaN(eventTimeMs)) {
      throw new BadRequestException('Malformed webhook timestamp header');
    }

    const diffSeconds = Math.abs(Date.now() - eventTimeMs) / 1000;
    if (diffSeconds > 300) {
      throw new UnauthorizedException(
        'Webhook timestamp outside acceptable tolerance window (replay attack prevention)',
      );
    }
  }

  private async handleFailure(
    eventRecord: WebhookEventEntity,
    order: PaymentOrderEntity,
    event: NormalizedWebhookEvent,
    provider: string,
  ): Promise<{ received: boolean; processed: boolean; orderId: string; status: string }> {
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentOrderEntity, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payment order not found');

      if (locked.status === 'pending') {
        locked.status = 'failed';
        locked.updatedAt = new Date();
        await manager.save(locked);
      }

      const existingTxn = await manager.findOne(PaymentTransactionEntity, {
        where: { provider, providerEventId: event.eventId },
      });
      if (!existingTxn) {
        await manager.save(
          manager.create(PaymentTransactionEntity, {
            paymentOrderId: locked.id,
            provider,
            providerTransactionId: event.providerTransactionId || null,
            providerEventId: event.eventId,
            amountMinor: event.amountMinor,
            currency: event.currency || locked.currency,
            status: 'failed',
            rawPayloadRedacted: { status: 'failed', rawStatus: event.rawStatus },
          }),
        );
      }

      await this.finishEventInTransaction(manager, eventRecord.id, 'processed', locked.id, null);
    });

    if (this.notificationService) {
      await this.notificationService
        .dispatch({
          userId: order.payerUserId,
          recipientRole: 'student',
          eventType: 'payment.failed',
          payload: {
            bookingId: order.bookingId,
            amount: (Number(order.amountMinor) / 100).toFixed(2),
          },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch payment.failed notification: ${err}`));
    }

    return { received: true, processed: true, orderId: order.id, status: 'failed' };
  }

  private async handleSuccess(
    eventRecord: WebhookEventEntity,
    order: PaymentOrderEntity,
    event: NormalizedWebhookEvent,
    provider: string,
    requestId?: string,
  ): Promise<ConfirmedPayment | null> {
    // Server-to-server verification. A failed/unreachable check must never
    // confirm a payment.
    const providerVerified = await this.adapterFactory
      .getAdapter(provider)
      .queryTransaction(event.providerTransactionId);

    if (providerVerified.status !== 'succeeded') {
      throw new BadRequestException('Provider could not verify this transaction as successful');
    }

    if (BigInt(event.amountMinor) !== BigInt(order.amountMinor)) {
      this.logger.error(
        `Amount mismatch for order ${order.id}: expected ${order.amountMinor}, got ${event.amountMinor}`,
      );
      throw new BadRequestException('Payment amount mismatch between gateway and order');
    }
    if (event.currency !== order.currency) {
      throw new BadRequestException('Currency mismatch between gateway and order');
    }
    if (
      BigInt(providerVerified.amountMinor) !== BigInt(order.amountMinor) ||
      providerVerified.currency !== order.currency
    ) {
      throw new BadRequestException('Provider-verified amount/currency does not match the order');
    }

    const confirmed = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentOrderEntity, {
        where: { id: order.id },
        relations: {
          payerUser: true,
          booking: {
            subject: true,
            studentUser: true,
            requesterUser: true,
            tutorProfile: { user: true },
          },
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payment order not found');

      if (locked.status === 'succeeded') {
        await this.finishEventInTransaction(manager, eventRecord.id, 'duplicate', locked.id, null);
        return null;
      }

      const booking = locked.booking ?? null;

      const existingTxn = await manager.findOne(PaymentTransactionEntity, {
        where: { provider, providerEventId: event.eventId },
      });
      if (!existingTxn) {
        await manager.save(
          manager.create(PaymentTransactionEntity, {
            paymentOrderId: locked.id,
            provider,
            providerTransactionId: event.providerTransactionId,
            providerEventId: event.eventId,
            amountMinor: locked.amountMinor.toString(),
            currency: locked.currency,
            status: 'succeeded',
            verifiedAt: new Date(),
            rawPayloadRedacted: {
              provider,
              txnId: event.providerTransactionId,
              verified: true,
            },
          }),
        );
      }

      let hold = await manager.findOne(EscrowHoldEntity, {
        where: { paymentOrderId: locked.id },
      });
      if (!hold && booking) {
        hold = manager.create(EscrowHoldEntity, {
          paymentOrderId: locked.id,
          bookingId: booking.id,
          payerUserId: locked.payerUserId,
          tutorUserId: booking.tutorUserId,
          amountMinor: locked.amountMinor.toString(),
          releasedMinor: '0',
          refundedMinor: '0',
          currency: locked.currency,
          commissionRateBps: locked.commissionRateBps,
          commissionPolicyId: locked.commissionPolicyId,
          status: 'held',
          heldAt: new Date(),
        });
        hold = await manager.save(hold);
      }

      locked.status = 'succeeded';
      locked.escrowHoldId = hold?.id ?? null;
      locked.updatedAt = new Date();
      await manager.save(locked);

      await this.ledgerService.postJournal(
        {
          sourceType: 'payment_order',
          sourceId: locked.id,
          idempotencyKey: `ledger:payment:${locked.id}`,
          description: `Advance escrow deposit for booking #${locked.bookingId}`,
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: locked.amountMinor },
            { accountCode: '2100', direction: 'credit', amountMinor: locked.amountMinor },
          ],
        },
        manager,
      );

      let invoice: InvoiceEntity | null = null;
      if (booking) {
        invoice = await this.invoicesService.createForOrder(
          manager,
          locked,
          booking,
          locked.commissionRateBps,
        );
        await this.confirmBooking(manager, booking, locked, provider, event.providerTransactionId);
      }

      await manager.save(
        manager.create(OutboxEventEntity, {
          aggregateType: 'payment_order',
          aggregateId: locked.id,
          eventType: 'payment.succeeded',
          payload: {
            orderId: locked.id,
            bookingId: locked.bookingId,
            amountMinor: locked.amountMinor,
            currency: locked.currency,
          },
        }),
      );

      await this.finishEventInTransaction(manager, eventRecord.id, 'processed', locked.id, null);
      return { order: locked, booking, invoice };
    });

    if (!confirmed) return null;

    await this.auditService.record({
      actorUserId: confirmed.order.payerUserId,
      action: 'payment.order_succeeded',
      resourceType: 'payment_orders',
      resourceId: confirmed.order.id,
      requestId,
      safeMetadata: {
        orderId: confirmed.order.id,
        bookingId: confirmed.order.bookingId,
        amountMinor: confirmed.order.amountMinor,
        providerTransactionId: event.providerTransactionId,
      },
    });

    return confirmed;
  }

  private async confirmBooking(
    manager: EntityManager,
    booking: BookingEntity,
    order: PaymentOrderEntity,
    provider: string,
    providerTransactionId: string,
  ): Promise<void> {
    if (booking.status === 'confirmed') return;
    if (booking.status !== 'accepted' && booking.status !== 'awaiting_payment') {
      this.logger.error(
        `Payment succeeded for booking ${booking.id} in non-payable status '${booking.status}'. Booking left unchanged; manual reconciliation required.`,
      );
      return;
    }

    const from = booking.status;
    booking.status = 'confirmed';
    await manager.save(booking);
    await manager.save(
      manager.create(BookingStatusEventEntity, {
        bookingId: booking.id,
        fromStatus: from,
        toStatus: 'confirmed',
        actorUserId: order.payerUserId,
        actorRole: 'student',
        reason: 'Verified payment webhook',
        safeMetadata: {
          orderId: order.id,
          provider,
          providerTransactionId,
        },
      }),
    );
  }

  private async finishEvent(
    id: string,
    status: 'processed' | 'duplicate' | 'rejected' | 'failed',
    orderId: string | null,
    error: string | null,
  ): Promise<void> {
    await this.webhookRepo.update(id, {
      status,
      paymentOrderId: orderId,
      errorMessage: error,
      processedAt: new Date(),
    });
  }

  private async finishEventInTransaction(
    manager: EntityManager,
    id: string,
    status: 'processed' | 'duplicate' | 'rejected' | 'failed',
    orderId: string | null,
    error: string | null,
  ): Promise<void> {
    await manager.update(WebhookEventEntity, id, {
      status,
      paymentOrderId: orderId,
      errorMessage: error,
      processedAt: new Date(),
    });
  }

  private async dispatchSuccessNotifications(result: ConfirmedPayment): Promise<void> {
    if (!this.notificationService) return;
    const { order, booking, invoice } = result;
    const amountBdt = (Number(order.amountMinor) / 100).toFixed(2);

    const payerRole =
      booking &&
      order.payerUserId === booking.studentUserId &&
      booking.requesterUserId === booking.studentUserId
        ? 'student'
        : 'guardian';

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
      .catch((err) => this.logger.warn(`Failed to dispatch payer payment notification: ${err}`));

    if (invoice) {
      await this.notificationService
        .dispatch({
          userId: order.payerUserId,
          recipientRole: payerRole,
          eventType: 'invoice.issued',
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: amountBdt,
          },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch invoice notification: ${err}`));
    }

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

    if (!booking) return;
    const subjectName = booking.subject?.nameEn || 'Tuition Subject';
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
