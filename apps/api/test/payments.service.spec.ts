import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

describe('PaymentsService Unit & Financial Invariant Tests', () => {
  let service: PaymentsService;
  let mockOrderRepo: any;
  let mockTransactionRepo: any;
  let mockRefundRepo: any;
  let mockBookingRepo: any;
  let mockSessionRepo: any;
  let mockGuardianLinkRepo: any;
  let mockOutboxRepo: any;
  let mockLedgerService: any;
  let mockAdapterFactory: any;
  let mockAuditService: any;
  let mockDataSource: any;
  let mockNotificationService: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const _guardianId = '22222222-2222-4222-8222-222222222222';
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

  const sampleBooking: any = {
    id: bookingId,
    requesterUserId: studentId,
    studentUserId: studentId,
    tutorUserId: tutorId,
    pricePerSessionMinor: 100000, // 1000 BDT (100,000 poisha)
    currency: 'BDT',
    status: 'accepted',
    studentUser: { id: studentId, displayName: 'Rahim' },
    subject: { nameEn: 'Mathematics' },
  };

  let sampleOrder: any;

  beforeEach(() => {
    sampleOrder = {
      id: orderId,
      bookingId,
      payerUserId: studentId,
      amountMinor: 100000,
      currency: 'BDT',
      status: 'pending',
      idempotencyKey: 'idem-pay-1',
      provider: 'bkash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOrderRepo = {
      findOne: vi.fn(),
      find: vi.fn().mockImplementation(() => Promise.resolve([{ ...sampleOrder }])),
      create: vi.fn((data) => ({ id: orderId, ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || orderId, ...entity })),
    };

    mockTransactionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => ({ id: 'txn-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'txn-1', ...entity })),
    };

    mockRefundRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => ({ id: 'ref-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'ref-1', ...entity })),
    };

    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue(sampleBooking),
    };

    mockSessionRepo = {
      findOne: vi.fn(),
    };

    mockGuardianLinkRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: 'out-1', ...entity })),
    };

    mockLedgerService = {
      postJournal: vi.fn().mockResolvedValue({ id: 'journal-1' }),
      verifySystemLedgerIntegrity: vi.fn().mockResolvedValue({
        isBalanced: true,
        totalDebits: 100000n,
        totalCredits: 100000n,
        discrepancy: 0n,
      }),
    };

    const mockAdapter = {
      providerName: 'bkash',
      createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=mock',
        providerOrderId: 'BKASH-123',
      }),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      queryTransaction: vi.fn().mockResolvedValue({
        providerTransactionId: 'TRX-123',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'succeeded',
      }),
      processRefund: vi.fn().mockResolvedValue({
        providerRefundId: 'REF-123',
        amountMinor: 50000,
        status: 'succeeded',
      }),
    };

    mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'aud-1' }),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          save: vi.fn((entity) => Promise.resolve(entity)),
          create: vi.fn((_, data) => ({ id: `gen-${Math.random()}`, ...data })),
          findOne: vi.fn().mockResolvedValue(sampleBooking),
        };
        return cb(mockManager);
      }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new PaymentsService(
      new PaymentOrdersService(
        mockOrderRepo,
        mockBookingRepo,
        new GuardianAccessService(mockGuardianLinkRepo),
        mockAdapterFactory,
        mockAuditService,
      ) as never,
      new PaymentWebhooksService(
        mockOrderRepo,
        mockTransactionRepo,
        new GuardianAccessService(mockGuardianLinkRepo),
        mockLedgerService,
        mockAdapterFactory,
        mockAuditService,
        mockDataSource,
        mockNotificationService,
      ) as never,
      new RefundsService(
        mockOrderRepo,
        mockRefundRepo,
        mockOutboxRepo,
        mockLedgerService,
        mockAdapterFactory,
        mockAuditService,
        mockNotificationService,
      ) as never,
      new SettlementService(
        mockSessionRepo,
        mockOrderRepo,
        mockTransactionRepo,
        mockLedgerService,
        mockAuditService,
      ) as never,
    );
  });

  describe('Payment Order Creation & Idempotency', () => {
    it('should create pending payment order and return sandbox checkout URL', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);
      mockOrderRepo.findOne.mockResolvedValue(null);

      const res = await service.createPaymentOrder(
        studentUser,
        { bookingId, provider: 'bkash' },
        'idem-key-1',
      );

      expect(res.orderId).toBe(orderId);
      expect(res.amountMinor).toBe(100000);
      expect(res.currency).toBe('BDT');
      expect(res.checkoutUrl).toContain('bkash.com');
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.order_created' }),
      );
    });

    it('IDEMPOTENCY: should replay existing checkout session when same idempotencyKey is submitted', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);
      mockOrderRepo.findOne.mockResolvedValue(sampleOrder);

      const res = await service.createPaymentOrder(
        studentUser,
        { bookingId, provider: 'bkash' },
        'idem-pay-1',
      );

      expect(res.orderId).toBe(orderId);
      expect(mockOrderRepo.save).not.toHaveBeenCalled(); // No duplicate order created!
    });

    it('NEGATIVE TEST: should reject payment initiation by unrelated learner (403 Forbidden)', async () => {
      mockBookingRepo.findOne.mockResolvedValue(sampleBooking);

      await expect(
        service.createPaymentOrder(strangerUser, { bookingId }, 'idem-stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: should reject payment initiation if booking is already confirmed/paid', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...sampleBooking,
        status: 'confirmed',
      });

      await expect(
        service.createPaymentOrder(studentUser, { bookingId }, 'idem-already-paid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Verified Webhook & Double-Entry Escrow Invariants', () => {
    const validWebhookPayload: any = {
      providerTransactionId: 'TRX-123',
      providerEventId: 'EVT-999',
      amountMinor: 100000,
      currency: 'BDT',
      status: 'succeeded',
    };

    it('FINANCIAL INVARIANT: should process verified webhook, post escrow ledger journal, and confirm booking', async () => {
      mockOrderRepo.findOne.mockResolvedValue(sampleOrder);

      const res = await service.handleWebhook('bkash', {}, validWebhookPayload);

      expect(res.received).toBe(true);
      expect(res.processed).toBe(true);
      expect(res.status).toBe('succeeded');

      // Verify double-entry ledger journal was posted:
      // Debit: 1000 (Escrow Holding Pool)
      // Credit: 2100 (Student Escrow Deposit)
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payment_order',
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: sampleOrder.amountMinor },
            { accountCode: '2100', direction: 'credit', amountMinor: sampleOrder.amountMinor },
          ],
        }),
      );

      // Verify audit and outbox event emitted
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.order_succeeded' }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment.succeeded' }),
      );
    });

    it('NEGATIVE TEST: should reject webhook with invalid signature (401 Unauthorized)', async () => {
      mockAdapterFactory.getAdapter().verifyWebhookSignature.mockReturnValue(false);

      await expect(service.handleWebhook('bkash', {}, validWebhookPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('NEGATIVE TEST: should reject webhook when amount mismatches pending order (400 BadRequest)', async () => {
      mockOrderRepo.findOne.mockResolvedValue(sampleOrder);
      const tamperedPayload = {
        ...validWebhookPayload,
        amountMinor: 50000, // 500 BDT instead of 1000 BDT!
      };

      await expect(service.handleWebhook('bkash', {}, tamperedPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('IDEMPOTENCY: should ignore duplicate webhook event without double posting to ledger', async () => {
      mockTransactionRepo.findOne.mockResolvedValue({
        id: 'txn-existing',
        providerEventId: 'EVT-999',
        status: 'succeeded',
      });

      const res = await service.handleWebhook('bkash', {}, validWebhookPayload);
      expect(res.received).toBe(true);
      expect(res.processed).toBe(false);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  describe('Refunds & Balance Bounds', () => {
    it('should process refund within available balance and post reversal ledger journal', async () => {
      const succeededOrder = { ...sampleOrder, status: 'succeeded' };
      mockOrderRepo.findOne.mockResolvedValue(succeededOrder);
      mockRefundRepo.find.mockResolvedValue([]); // No previous refunds

      const refund = await service.processRefund(studentUser, {
        paymentOrderId: orderId,
        amountMinor: 80000, // 80% refund (800 BDT)
        reason: 'Cancelled with >24h notice per Bangladesh cancellation policy',
      });

      expect(refund.status).toBe('succeeded');
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payment_refund',
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: 80000 },
            { accountCode: '1000', direction: 'credit', amountMinor: 80000 },
          ],
        }),
      );
    });

    it('NEGATIVE TEST: should reject refund exceeding paid balance', async () => {
      const succeededOrder = { ...sampleOrder, status: 'succeeded' };
      mockOrderRepo.findOne.mockResolvedValue(succeededOrder);
      mockRefundRepo.find.mockResolvedValue([
        { id: 'ref-prev', amountMinor: '70000', status: 'succeeded' }, // Already refunded 700 BDT
      ]);

      await expect(
        service.processRefund(studentUser, {
          paymentOrderId: orderId,
          amountMinor: 50000, // 700 + 500 = 1200 BDT > 1000 BDT total!
          reason: 'Excessive refund attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Completed Session Milestone Settlement', () => {
    it('FINANCIAL INVARIANT: should settle completed session into 92% tutor payable and 8% platform revenue', async () => {
      const completedSession: any = {
        id: 'sess-123',
        status: 'completed',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValue(completedSession);

      const journal = await service.settleMilestone(studentUser, {
        sessionId: 'sess-123',
      });

      expect(journal).toBeDefined();
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'session_milestone',
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: 100000n },
            { accountCode: '2000', direction: 'credit', amountMinor: 92000n }, // 92%
            { accountCode: '4000', direction: 'credit', amountMinor: 8000n }, // 8%
          ],
        }),
      );
    });
  });

  describe('Financial Reconciliation & Receipts', () => {
    it('should generate official payment receipt with BDT format', async () => {
      const succeededOrder = {
        ...sampleOrder,
        status: 'succeeded',
        booking: sampleBooking,
      };
      mockOrderRepo.findOne.mockResolvedValue(succeededOrder);

      const receipt = await service.getPaymentReceipt(studentUser, orderId);

      expect(receipt.receiptId).toContain('REC-');
      expect(receipt.amountBdt).toBe('1000.00');
      expect(receipt.currency).toBe('BDT');
      expect(receipt.paymentMethod).toBe('BKASH');
    });

    it('should execute reconciliation audit confirming matching orders and balanced ledger', async () => {
      mockOrderRepo.find.mockResolvedValue([{ ...sampleOrder, status: 'succeeded' }]);
      mockTransactionRepo.find.mockResolvedValue([
        { paymentOrderId: orderId, status: 'succeeded' },
      ]);

      const report = await service.runReconciliation();

      expect(report.isLedgerBalanced).toBe(true);
      expect(report.unreconciledDiscrepancies).toHaveLength(0);
      expect(report.succeededOrders).toBe(1);
    });

    it('should flag discrepancy when succeeded order has missing transaction record', async () => {
      mockOrderRepo.find.mockResolvedValue([{ ...sampleOrder, status: 'succeeded' }]);
      mockTransactionRepo.find.mockResolvedValue([]);

      const report = await service.runReconciliation();

      expect(report.unreconciledDiscrepancies).toHaveLength(1);
      expect(report.unreconciledDiscrepancies[0].orderId).toBe(orderId);
      expect(report.unreconciledDiscrepancies[0].reason).toContain('no verified transaction');
    });
  });

  describe('Sandbox Confirmation Pipeline', () => {
    it('should verify a pending sandbox order through the webhook pipeline and post the escrow journal', async () => {
      mockOrderRepo.findOne.mockResolvedValue(sampleOrder); // pending, provider: 'bkash'
      mockTransactionRepo.findOne.mockResolvedValue(null);

      const res = await service.sandboxConfirmOrder(studentUser, orderId, undefined, 'req-sbx-1');

      expect(res.received).toBe(true);
      expect(res.processed).toBe(true);
      expect(res.status).toBe('succeeded');
      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('bkash');
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payment_order',
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: sampleOrder.amountMinor },
            { accountCode: '2100', direction: 'credit', amountMinor: sampleOrder.amountMinor },
          ],
        }),
      );
    });

    it('IDEMPOTENCY: already-succeeded order short-circuits without re-posting the ledger', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...sampleOrder, status: 'succeeded' });

      const res = await service.sandboxConfirmOrder(studentUser, orderId);

      expect(res).toEqual({ received: true, processed: true, orderId, status: 'succeeded' });
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('should fall back to the sslcommerz adapter when neither body nor order specifies a provider', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...sampleOrder, provider: null });

      await service.sandboxConfirmOrder(studentUser, orderId);

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('sslcommerz');
    });

    it('should honor an explicit body provider over the order provider', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...sampleOrder, provider: 'bkash' });

      await service.sandboxConfirmOrder(studentUser, orderId, 'sslcommerz');

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('sslcommerz');
    });
  });
});
