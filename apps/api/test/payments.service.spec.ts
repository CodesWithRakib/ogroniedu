import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import { PayoutsService } from '../src/modules/payments/services/payouts.service';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  EscrowHoldEntity,
  SessionSettlementEntity,
  TutorFinancialAccountEntity,
} from '../src/modules/payments/entities';
import { BookingSessionEntity } from '../src/modules/bookings/entities/booking-session.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

describe('Payments domain: orders, verified webhooks, settlement and reconciliation', () => {
  let service: PaymentsService;
  let orders: PaymentOrdersService;
  let webhooks: PaymentWebhooksService;
  let settlement: SettlementService;

  let mockOrderRepo: any;
  let mockTransactionRepo: any;
  let mockRefundRepo: any;
  let mockBookingRepo: any;
  let mockSessionRepo: any;
  let mockEscrowRepo: any;
  let mockSettlementRepo: any;
  let mockPayoutRepo: any;
  let mockReconciliationRepo: any;
  let mockWebhookRepo: any;
  let mockGuardianLinkRepo: any;
  let mockOutboxRepo: any;
  let mockLedgerService: any;
  let mockAdapterFactory: any;
  let mockAuditService: any;
  let mockNotificationService: any;
  let mockCommissionPolicyService: any;
  let mockInvoicesService: any;
  let mockDataSource: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const strangerId = '99999999-9999-4999-8999-999999999999';
  const tutorId = '33333333-3333-4333-8333-333333333333';
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const orderId = '00000000-0000-4000-8000-000000000000';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@example.com',
    roles: ['student'],
  };

  const strangerUser: AuthenticatedUser = {
    id: strangerId,
    email: 'stranger@example.com',
    roles: ['student'],
  };

  let booking: any;
  let sampleOrder: any;
  let lockedOrder: any;
  let hold: any;
  let invoice: any;

  beforeEach(() => {
    booking = {
      id: bookingId,
      requesterUserId: studentId,
      studentUserId: studentId,
      tutorUserId: tutorId,
      pricePerSessionMinor: '100000', // 1000.00 BDT
      currency: 'BDT',
      status: 'accepted',
      studentUser: { id: studentId, displayName: 'Rahim' },
      requesterUser: { id: studentId, displayName: 'Rahim' },
      tutorProfile: { user: { id: tutorId, displayName: 'Tutor One' } },
      subject: { nameEn: 'Mathematics' },
    };

    sampleOrder = {
      id: orderId,
      bookingId,
      payerUserId: studentId,
      amountMinor: '100000',
      currency: 'BDT',
      status: 'pending',
      idempotencyKey: 'idem-pay-1',
      provider: 'bkash',
      providerReference: 'PROV-ORDER-1',
      commissionRateBps: 800,
      commissionPolicyId: 'policy-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      booking,
    };
    lockedOrder = { ...sampleOrder, payerUser: { id: studentId, displayName: 'Rahim' } };

    hold = {
      id: 'hold-1',
      paymentOrderId: orderId,
      bookingId,
      payerUserId: studentId,
      tutorUserId: tutorId,
      amountMinor: '100000',
      releasedMinor: '0',
      refundedMinor: '0',
      currency: 'BDT',
      commissionRateBps: 800,
      commissionPolicyId: 'policy-1',
      status: 'held',
      heldAt: new Date(),
    };

    invoice = {
      id: 'invoice-1',
      invoiceNumber: 'INV-2026-000001',
      paymentOrderId: orderId,
      status: 'issued',
      totalMinor: '100000',
      commissionMinor: '8000',
      snapshot: {},
    };

    mockOrderRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => ({ ...data, id: orderId })),
      save: vi.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? orderId,
        updatedAt: new Date(),
      })),
    };

    mockTransactionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockRefundRepo = { find: vi.fn().mockResolvedValue([]), findOne: vi.fn() };
    mockBookingRepo = { findOne: vi.fn().mockResolvedValue(booking), save: vi.fn(async (b) => b) };
    mockSessionRepo = { findOne: vi.fn() };
    mockEscrowRepo = { find: vi.fn().mockResolvedValue([]) };
    mockSettlementRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn() };
    mockPayoutRepo = { find: vi.fn().mockResolvedValue([]) };
    mockReconciliationRepo = {
      create: vi.fn((data) => ({ id: 'run-1', ...data })),
      save: vi.fn(async (r) => ({ id: r.id ?? 'run-1', ...r })),
    };
    mockWebhookRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (record) => ({ id: 'webhook-1', ...record })),
      update: vi.fn().mockResolvedValue({}),
      findOne: vi.fn(),
    };
    mockGuardianLinkRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };
    mockOutboxRepo = { create: vi.fn((e) => e), save: vi.fn(async (e) => e) };

    mockLedgerService = {
      postJournal: vi.fn().mockResolvedValue({ id: 'journal-1', entries: [] }),
      getPartyBalance: vi.fn().mockResolvedValue(0n),
      verifySystemLedgerIntegrity: vi.fn().mockResolvedValue({
        isBalanced: true,
        totalDebits: 100000n,
        totalCredits: 100000n,
        discrepancy: 0n,
      }),
    };

    mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue({
        providerName: 'bkash',
        createCheckoutSession: vi.fn().mockResolvedValue({
          checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=mock',
          providerOrderId: 'PROV-ORDER-1',
        }),
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
        normalizeWebhook: vi.fn((_headers, rawBody) => {
          const body = rawBody as Record<string, unknown>;
          return {
            eventId: String(body.providerEventId ?? 'EVT-999'),
            eventType: 'bkash.succeeded',
            orderReference: String(body.orderReference ?? orderId),
            providerTransactionId: String(body.providerTransactionId ?? 'TRX-123'),
            amountMinor: String(body.amountMinor ?? '100000'),
            currency: String(body.currency ?? 'BDT'),
            status: body.status === 'failed' ? 'failed' : 'succeeded',
            rawStatus: 'COMPLETED',
          };
        }),
        queryTransaction: vi.fn().mockResolvedValue({
          providerTransactionId: 'TRX-123',
          amountMinor: 100000,
          currency: 'BDT',
          status: 'succeeded',
          verifiedAt: new Date(),
        }),
        processRefund: vi.fn().mockResolvedValue({
          providerRefundId: null,
          amountMinor: 50000,
          status: 'unsupported',
        }),
      }),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue({ id: 'aud-1' }) };
    mockNotificationService = { dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }) };
    mockCommissionPolicyService = {
      getActivePolicy: vi.fn().mockResolvedValue({
        id: 'policy-1',
        version: 1,
        platformFeeBps: 800,
        minPayoutMinor: '50000',
        currency: 'BDT',
      }),
    };
    mockInvoicesService = {
      createForOrder: vi.fn().mockResolvedValue(invoice),
      getInvoiceForOrder: vi.fn().mockResolvedValue(invoice),
    };

    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const manager = {
          findOne: vi.fn(async (entity) => {
            if (entity === PaymentOrderEntity) return lockedOrder;
            if (entity === PaymentTransactionEntity) return null;
            if (entity === EscrowHoldEntity) return null;
            if (entity === BookingSessionEntity) return mockSessionRepo.findOne();
            if (entity === SessionSettlementEntity) return null;
            if (entity === TutorFinancialAccountEntity)
              return { tutorUserId: tutorId, reservedMinor: '0' };
            return null;
          }),
          create: vi.fn((entity, data) => ({
            ...data,
            id:
              entity === EscrowHoldEntity
                ? 'hold-1'
                : entity === SessionSettlementEntity
                  ? 'settlement-1'
                  : `gen-${Math.random()}`,
          })),
          save: vi.fn(async (value) => value),
          update: vi.fn().mockResolvedValue({}),
        };
        return cb(manager);
      }),
    };

    orders = new PaymentOrdersService(
      mockOrderRepo,
      mockBookingRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
      mockAdapterFactory,
      mockAuditService,
      mockCommissionPolicyService,
      mockInvoicesService,
    );
    webhooks = new PaymentWebhooksService(
      mockOrderRepo,
      mockTransactionRepo,
      mockWebhookRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
      mockLedgerService,
      mockAdapterFactory,
      mockInvoicesService,
      mockAuditService,
      mockDataSource,
      mockNotificationService,
    );
    const refunds = new RefundsService(
      mockOrderRepo,
      mockRefundRepo,
      mockTransactionRepo,
      mockEscrowRepo,
      mockOutboxRepo,
      mockLedgerService,
      mockAdapterFactory,
      mockAuditService,
      new GuardianAccessService(mockGuardianLinkRepo),
      mockDataSource,
      mockNotificationService,
    );
    settlement = new SettlementService(
      mockSessionRepo,
      mockOrderRepo,
      mockTransactionRepo,
      mockEscrowRepo,
      mockSettlementRepo,
      mockRefundRepo,
      mockPayoutRepo,
      mockReconciliationRepo,
      mockLedgerService,
      mockAuditService,
      mockDataSource,
      mockNotificationService,
    );
    const payouts = new PayoutsService(
      mockPayoutRepo,
      { findOne: vi.fn() } as never,
      mockSettlementRepo,
      { find: vi.fn() } as never,
      mockEscrowRepo,
      mockLedgerService,
      mockCommissionPolicyService,
      mockAuditService,
      mockNotificationService,
      mockDataSource,
    );

    service = new PaymentsService(orders, webhooks, refunds, settlement, payouts);
  });

  describe('Payment order creation and idempotency', () => {
    it('snapshots the active commission policy and stores the provider reference', async () => {
      const res = await service.createPaymentOrder(
        studentUser,
        { bookingId, provider: 'bkash' },
        'idem-key-1',
        'req-1',
      );

      expect(res.orderId).toBe(orderId);
      expect(res.amountMinor).toBe(100000);
      expect(res.currency).toBe('BDT');
      expect(res.checkoutUrl).toContain('bkash.com');
      expect(res.commissionRateBps).toBe(800);
      expect(mockOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRateBps: 800, commissionPolicyId: 'policy-1' }),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.order_created' }),
      );
    });

    it('replays the existing order for the same idempotency key without creating another', async () => {
      mockOrderRepo.findOne.mockResolvedValue(sampleOrder);

      const res = await service.createPaymentOrder(
        studentUser,
        { bookingId, provider: 'bkash' },
        'idem-pay-1',
      );

      expect(res.orderId).toBe(orderId);
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an idempotency key reused with a different booking', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...sampleOrder, bookingId: 'other-booking' });

      await expect(
        service.createPaymentOrder(studentUser, { bookingId }, 'idem-pay-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects payment initiation by an unrelated learner', async () => {
      await expect(
        service.createPaymentOrder(strangerUser, { bookingId }, 'idem-stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects payment initiation when the booking is already confirmed', async () => {
      mockBookingRepo.findOne.mockResolvedValue({ ...booking, status: 'confirmed' });

      await expect(
        service.createPaymentOrder(studentUser, { bookingId }, 'idem-already-paid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to fund a booking that already has a succeeded order', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...sampleOrder,
        status: 'succeeded',
      });

      await expect(
        service.createPaymentOrder(studentUser, { bookingId }, 'idem-new-key'),
      ).rejects.toThrow(BadRequestException);

      expect(mockOrderRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Verified webhook pipeline', () => {
    const validWebhookPayload = {
      providerTransactionId: 'TRX-123',
      providerEventId: 'EVT-999',
      orderReference: orderId,
      amountMinor: 100000,
      currency: 'BDT',
      status: 'succeeded',
    };

    it('posts escrow ledger, creates the invoice, confirms the booking and outbox event', async () => {
      mockOrderRepo.findOne.mockResolvedValue(lockedOrder);

      const res = await service.handleWebhook(
        'bkash',
        { 'x-webhook-timestamp': new Date().toISOString() },
        validWebhookPayload,
        'req-sbx-1',
      );

      expect(res).toMatchObject({ received: true, processed: true, status: 'succeeded' });
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payment_order',
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: '100000' },
            { accountCode: '2100', direction: 'credit', amountMinor: '100000' },
          ],
        }),
        expect.anything(),
      );
      expect(mockInvoicesService.createForOrder).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.order_succeeded' }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment.succeeded' }),
      );
    });

    it('ignores an already-recorded webhook event without re-posting the ledger', async () => {
      mockWebhookRepo.save.mockRejectedValueOnce({ code: '23505' });
      mockWebhookRepo.findOne.mockResolvedValue({ id: 'webhook-old', status: 'processed' });

      const res = await service.handleWebhook(
        'bkash',
        { 'x-webhook-timestamp': new Date().toISOString() },
        validWebhookPayload,
      );

      expect(res).toEqual({ received: true, processed: false });
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('rejects a webhook with an invalid signature before persisting it', async () => {
      mockAdapterFactory.getAdapter().verifyWebhookSignature.mockReturnValue(false);

      await expect(service.handleWebhook('bkash', {}, validWebhookPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockWebhookRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a webhook timestamp outside the replay window', async () => {
      await expect(
        service.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': new Date(Date.now() - 10 * 60 * 1000).toISOString() },
          validWebhookPayload,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an amount that does not match the order', async () => {
      mockOrderRepo.findOne.mockResolvedValue(lockedOrder);

      await expect(
        service.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': new Date().toISOString() },
          { ...validWebhookPayload, amountMinor: 50000 },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects confirmation when server-to-server verification does not succeed', async () => {
      mockOrderRepo.findOne.mockResolvedValue(lockedOrder);
      mockAdapterFactory.getAdapter().queryTransaction.mockResolvedValue({
        providerTransactionId: 'TRX-123',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'failed',
        verifiedAt: new Date(),
      });

      await expect(
        service.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': new Date().toISOString() },
          validWebhookPayload,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('rejects a provider-verified amount that differs from the order', async () => {
      mockOrderRepo.findOne.mockResolvedValue(lockedOrder);
      mockAdapterFactory.getAdapter().queryTransaction.mockResolvedValue({
        providerTransactionId: 'TRX-123',
        amountMinor: 99000,
        currency: 'BDT',
        status: 'succeeded',
        verifiedAt: new Date(),
      });

      await expect(
        service.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': new Date().toISOString() },
          validWebhookPayload,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Session settlement from escrow', () => {
    function stubSettlementManager(holdRow: any) {
      const holdBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        setLock: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(holdRow),
      };
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        orIgnore: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({}),
      };
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: vi.fn(async (entity) => {
            if (entity === BookingSessionEntity) {
              return { id: 'sess-123', status: 'completed', booking };
            }
            if (entity === SessionSettlementEntity) return null;
            if (entity === TutorFinancialAccountEntity) {
              return { tutorUserId: tutorId, reservedMinor: '0' };
            }
            return null;
          }),
          createQueryBuilder: vi
            .fn()
            .mockReturnValueOnce(holdBuilder)
            .mockReturnValueOnce(insertBuilder),
          create: vi.fn((entity, data) => ({ ...data, id: 'settlement-1' })),
          save: vi.fn(async (value) => value),
        };
        return cb(manager);
      });
    }

    it('splits 8% commission using the hold snapshot and credits the tutor party balance', async () => {
      stubSettlementManager({ ...hold });

      const journal = await service.settleMilestone(studentUser, { sessionId: 'sess-123' });

      expect(journal).toBeDefined();
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'session_milestone',
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: 100000n },
            {
              accountCode: '2000',
              direction: 'credit',
              amountMinor: 92000n,
              tutorUserId: tutorId,
            },
            { accountCode: '4000', direction: 'credit', amountMinor: 8000n },
          ],
        }),
        expect.anything(),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'tutor.earnings_released' }),
      );
    });

    it('refuses to release more than the funded escrow hold remaining', async () => {
      // Only 500.00 BDT was funded but the session costs 1000.00 BDT.
      stubSettlementManager({ ...hold, amountMinor: '50000' });

      await expect(
        service.settleMilestone(studentUser, { sessionId: 'sess-123' }),
      ).rejects.toThrow(ConflictException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  describe('Receipts and reconciliation', () => {
    it('returns real names and the issued invoice number instead of a synthetic receipt', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...sampleOrder,
        status: 'succeeded',
        booking,
        payerUser: { displayName: 'Rahim' },
      });

      const receipt = await service.getPaymentReceipt(studentUser, orderId);

      expect(receipt.invoiceNumber).toBe('INV-2026-000001');
      expect(receipt.amountBdt).toBe('1000.00');
      expect(receipt.payerName).toBe('Rahim');
      expect(receipt.tutorName).toBe('Tutor One');
      expect(receipt.paymentMethod).toBe('BKASH');
    });

    it('flags a succeeded order with no verified transaction as a discrepancy', async () => {
      mockOrderRepo.find.mockResolvedValue([{ ...sampleOrder, status: 'succeeded' }]);
      mockTransactionRepo.find.mockResolvedValue([]);

      const report = await service.runReconciliation(studentUser);

      expect(report.isLedgerBalanced).toBe(true);
      expect(report.succeededOrders).toBe(1);
      expect(report.unreconciledDiscrepancies).toEqual([
        expect.objectContaining({ reference: orderId }),
      ]);
      expect(report.unreconciledDiscrepancies[0].reason).toContain('no verified transaction');
      expect(mockReconciliationRepo.save).toHaveBeenCalled();
    });

    it('flags a paid payout that has no external reference', async () => {
      mockPayoutRepo.find.mockResolvedValue([{ id: 'payout-1', status: 'paid', externalReference: null }]);

      const report = await service.runReconciliation(studentUser);

      expect(report.unreconciledDiscrepancies).toEqual([
        expect.objectContaining({ reference: 'payout-1' }),
      ]);
    });
  });
});
