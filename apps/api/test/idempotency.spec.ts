import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { CreatePaymentOrderDto, PaymentWebhookDto } from '../src/modules/payments/dto';
import {
  PaymentOrderEntity,
  LedgerJournalEntity,
  LedgerAccountEntity,
} from '../src/modules/payments/entities';
import { BadRequestException } from '@nestjs/common';

describe('NFR-002: Concurrency & Idempotency Tests', () => {
  describe('1. Payment Order Idempotency Engine', () => {
    let paymentsService: PaymentsService;
    let mockOrderRepo: any;
    let mockTxnRepo: any;
    let mockRefundRepo: any;
    let mockBookingRepo: any;
    let mockSessionRepo: any;
    let mockGuardianLinkRepo: any;
    let mockOutboxRepo: any;
    let mockLedgerService: any;
    let mockAdapterFactory: any;
    let mockAuditService: any;
    let mockDataSource: any;

    const studentUser: AuthenticatedUser = {
      id: 'usr-student-idem',
      email: 'student@example.com',
      roles: ['student'],
    };

    const mockBooking = {
      id: 'booking-uuid-idem-1',
      studentUserId: studentUser.id,
      requesterUserId: studentUser.id,
      tutorUserId: 'usr-tutor-idem',
      status: 'accepted',
      pricePerSessionMinor: '50000',
      subject: { name: 'Mathematics' },
      studentUser: { displayName: 'Student One' },
    };

    beforeEach(() => {
      mockOrderRepo = {
        findOne: vi.fn(),
        create: vi.fn((dto) => ({
          ...dto,
          id: 'order-uuid-1',
          status: 'pending',
          createdAt: new Date(),
        })),
        save: vi.fn((e) => Promise.resolve(e)),
      };
      mockTxnRepo = {
        findOne: vi.fn(),
        create: vi.fn((e) => e),
        save: vi.fn((e) => Promise.resolve(e)),
      };
      mockRefundRepo = { findOne: vi.fn() };
      mockBookingRepo = {
        findOne: vi.fn().mockResolvedValue(mockBooking),
        save: vi.fn((b) => Promise.resolve(b)),
      };
      mockSessionRepo = { find: vi.fn().mockResolvedValue([]) };
      mockGuardianLinkRepo = { findOne: vi.fn().mockResolvedValue(null) };
      mockOutboxRepo = { create: vi.fn((e) => e), save: vi.fn((e) => Promise.resolve(e)) };
      mockLedgerService = { recordOrderEscrowHolding: vi.fn().mockResolvedValue({}) };
      mockAuditService = { record: vi.fn().mockResolvedValue({}) };
      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          return await cb({
            save: vi.fn((x) => Promise.resolve(x)),
            create: vi.fn((_, x) => x),
          });
        }),
      };

      const mockAdapter = {
        createCheckoutSession: vi.fn().mockResolvedValue({
          checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=123',
          providerOrderId: 'PROV-ORD-123',
        }),
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
        queryTransaction: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      };

      mockAdapterFactory = {
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      paymentsService = new PaymentsService(
        mockOrderRepo,
        mockTxnRepo,
        mockRefundRepo,
        mockBookingRepo,
        mockSessionRepo,
        mockGuardianLinkRepo,
        mockOutboxRepo,
        mockLedgerService,
        mockAdapterFactory,
        mockAuditService,
        mockDataSource,
      );
    });

    it('POSITIVE TEST: should create new order on first invocation with unique idempotency key', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce(null); // No previous order with this key

      const dto: CreatePaymentOrderDto = {
        bookingId: mockBooking.id,
        amountMinor: 50000,
        currency: 'BDT',
        paymentMethod: 'bkash',
      };

      const result = await paymentsService.createPaymentOrder(
        studentUser,
        dto,
        'idem-key-unique-001',
        'req-id-1',
      );

      expect(result).toBeDefined();
      expect(result.orderId).toBe('order-uuid-1');
      expect(result.amountMinor).toBe(50000);
      expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
    });

    it('POSITIVE TEST: should return existing order idempotently on replay without duplicate creation', async () => {
      const existingOrder: Partial<PaymentOrderEntity> = {
        id: 'order-uuid-existing',
        payerUserId: studentUser.id,
        bookingId: mockBooking.id,
        idempotencyKey: 'idem-key-unique-001',
        amountMinor: '50000',
        currency: 'BDT',
        status: 'pending',
        providerOrderId: 'PROV-ORD-123',
      };

      // Mock that finding by idempotency key returns the existing order
      mockOrderRepo.findOne.mockResolvedValueOnce(existingOrder);

      const dto: CreatePaymentOrderDto = {
        bookingId: mockBooking.id,
        amountMinor: 50000,
        currency: 'BDT',
        paymentMethod: 'bkash',
      };

      const result = await paymentsService.createPaymentOrder(
        studentUser,
        dto,
        'idem-key-unique-001', // Replayed key
        'req-id-2',
      );

      expect(result).toBeDefined();
      expect(result.orderId).toBe('order-uuid-existing');
      expect(result.amountMinor).toBe(50000);
      // save should NOT be called again because existing order is returned idempotently
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should detect conflict if existing order amount does not match incoming replayed payload', async () => {
      const existingOrder: Partial<PaymentOrderEntity> = {
        id: 'order-uuid-existing',
        payerUserId: studentUser.id,
        bookingId: mockBooking.id,
        idempotencyKey: 'idem-key-conflict-001',
        amountMinor: '50000',
        currency: 'BDT',
        status: 'pending',
      };

      mockOrderRepo.findOne.mockResolvedValueOnce(existingOrder);

      const mismatchDto: CreatePaymentOrderDto = {
        bookingId: mockBooking.id,
        amountMinor: 75000, // Different amount with same key!
        currency: 'BDT',
        paymentMethod: 'bkash',
      };

      await expect(
        paymentsService.createPaymentOrder(
          studentUser,
          mismatchDto,
          'idem-key-conflict-001',
          'req-id-3',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Double-Entry Ledger Journal Idempotency', () => {
    let ledgerService: LedgerService;
    let mockAccountRepo: any;
    let mockJournalRepo: any;
    let mockEntryRepo: any;
    let mockAuditService: any;
    let mockDataSource: any;

    beforeEach(() => {
      mockAccountRepo = {
        findOne: vi.fn().mockImplementation(({ where }) => {
          return Promise.resolve({
            id: `acc-${where.code}`,
            code: where.code,
            name: where.code,
            type: 'liability',
            balanceMinor: '0',
            currency: 'BDT',
            isActive: true,
          } as LedgerAccountEntity);
        }),
        find: vi.fn().mockResolvedValue([
          {
            id: 'acc-1',
            code: 'GATEWAY_CLEARING',
            name: 'Gateway',
            type: 'asset',
            balanceMinor: '0',
            currency: 'BDT',
            isActive: true,
          },
          {
            id: 'acc-2',
            code: 'STUDENT_ESCROW',
            name: 'Escrow',
            type: 'liability',
            balanceMinor: '0',
            currency: 'BDT',
            isActive: true,
          },
        ]),
      };

      mockJournalRepo = {
        findOne: vi.fn(),
        create: vi.fn((j) => ({ ...j, id: 'journal-123', entries: [] })),
        save: vi.fn((j) => Promise.resolve(j)),
      };

      mockEntryRepo = {
        create: vi.fn((e) => e),
      };

      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          return await cb({
            save: vi.fn((x) => Promise.resolve(x)),
            create: vi.fn((_, x) => x),
          });
        }),
      };

      ledgerService = new LedgerService(
        mockAccountRepo,
        mockJournalRepo,
        mockEntryRepo,
        mockDataSource,
      );
    });

    it('POSITIVE TEST: should record new double-entry journal when idempotency key is fresh', async () => {
      mockJournalRepo.findOne.mockResolvedValueOnce(null);

      const journal = await ledgerService.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-101',
        description: 'Student payment held in escrow',
        idempotencyKey: 'ledger:pay:order-101',
        entries: [
          { accountCode: 'GATEWAY_CLEARING', direction: 'debit', amountMinor: 50000 },
          { accountCode: 'STUDENT_ESCROW', direction: 'credit', amountMinor: 50000 },
        ],
      });

      expect(journal).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('POSITIVE TEST: should return existing journal idempotently when same key is submitted again', async () => {
      const existingJournal: Partial<LedgerJournalEntity> = {
        id: 'journal-existing-999',
        sourceType: 'payment_order',
        sourceId: 'order-101',
        idempotencyKey: 'ledger:pay:order-101',
        description: 'Existing journal',
        entries: [],
      };

      mockJournalRepo.findOne.mockResolvedValueOnce(existingJournal);

      const journal = await ledgerService.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-101',
        description: 'Duplicate attempt to record same journal',
        idempotencyKey: 'ledger:pay:order-101',
        entries: [
          { accountCode: 'GATEWAY_CLEARING', direction: 'debit', amountMinor: 50000 },
          { accountCode: 'STUDENT_ESCROW', direction: 'credit', amountMinor: 50000 },
        ],
      });

      expect(journal.id).toBe('journal-existing-999');
      // Must NOT run a new transaction or insert duplicate entries
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('3. Webhook Event Deduplication Idempotency', () => {
    let paymentsService: PaymentsService;
    let mockOrderRepo: any;
    let mockTxnRepo: any;
    let mockRefundRepo: any;
    let mockBookingRepo: any;
    let mockSessionRepo: any;
    let mockGuardianLinkRepo: any;
    let mockOutboxRepo: any;
    let mockLedgerService: any;
    let mockAdapterFactory: any;
    let mockAuditService: any;
    let mockDataSource: any;

    beforeEach(() => {
      mockOrderRepo = { findOne: vi.fn(), save: vi.fn((e) => Promise.resolve(e)) };
      mockTxnRepo = {
        findOne: vi.fn(),
        create: vi.fn((e) => e),
        save: vi.fn((e) => Promise.resolve(e)),
      };
      mockRefundRepo = { findOne: vi.fn() };
      mockBookingRepo = { findOne: vi.fn(), save: vi.fn((e) => Promise.resolve(e)) };
      mockSessionRepo = { find: vi.fn().mockResolvedValue([]) };
      mockGuardianLinkRepo = { findOne: vi.fn().mockResolvedValue(null) };
      mockOutboxRepo = { create: vi.fn((e) => e), save: vi.fn((e) => Promise.resolve(e)) };
      mockLedgerService = { recordOrderEscrowHolding: vi.fn().mockResolvedValue({}) };
      mockAuditService = { record: vi.fn().mockResolvedValue({}) };
      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          return await cb({
            save: vi.fn((x) => Promise.resolve(x)),
            create: vi.fn((_, x) => x),
          });
        }),
      };

      const mockAdapter = {
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
        queryTransaction: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      };

      mockAdapterFactory = {
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      paymentsService = new PaymentsService(
        mockOrderRepo,
        mockTxnRepo,
        mockRefundRepo,
        mockBookingRepo,
        mockSessionRepo,
        mockGuardianLinkRepo,
        mockOutboxRepo,
        mockLedgerService,
        mockAdapterFactory,
        mockAuditService,
        mockDataSource,
      );
    });

    it('POSITIVE TEST: should ignore duplicate webhook event without re-executing ledger or booking mutations', async () => {
      // Simulate that this providerEventId has already been recorded and succeeded
      mockTxnRepo.findOne.mockResolvedValueOnce({
        id: 'txn-existing-1',
        provider: 'bkash',
        providerEventId: 'EVT-DUPLICATE-777',
        status: 'succeeded',
      });

      const webhookPayload: PaymentWebhookDto = {
        providerTransactionId: 'TXN-777',
        providerEventId: 'EVT-DUPLICATE-777',
        amountMinor: 50000,
        currency: 'BDT',
        status: 'succeeded',
      };

      const result = await paymentsService.handleWebhook(
        'bkash',
        { 'x-webhook-timestamp': new Date().toISOString() },
        webhookPayload,
        'req-webhook-idem',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(false);
      expect(result.status).toBe('succeeded');
      // Must not mutate database in transaction
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
