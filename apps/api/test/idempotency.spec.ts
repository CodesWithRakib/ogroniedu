import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { CreatePaymentOrderDto } from '../src/modules/payments/dto';
import {
  PaymentOrderEntity,
  LedgerJournalEntity,
  LedgerAccountEntity,
} from '../src/modules/payments/entities';
import { BadRequestException } from '@nestjs/common';

describe('NFR-002: Concurrency & Idempotency Tests', () => {
  describe('1. Payment Order Idempotency', () => {
    let paymentsService: PaymentsService;
    let mockOrderRepo: any;
    let mockBookingRepo: any;
    let mockAdapterFactory: any;

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
      currency: 'BDT',
      subject: { nameEn: 'Mathematics' },
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
          updatedAt: new Date(),
        })),
        save: vi.fn(async (entity) => entity),
      };
      mockBookingRepo = {
        findOne: vi.fn().mockResolvedValue(mockBooking),
        save: vi.fn(async (b) => b),
      };
      mockAdapterFactory = {
        getAdapter: vi.fn().mockReturnValue({
          providerName: 'bkash',
          createCheckoutSession: vi.fn().mockResolvedValue({
            checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=123',
            providerOrderId: 'PROV-ORD-123',
          }),
        }),
      };

      paymentsService = new PaymentsService(
        new PaymentOrdersService(
          mockOrderRepo,
          mockBookingRepo,
          new GuardianAccessService({
            findOne: vi.fn().mockResolvedValue(null),
            find: vi.fn().mockResolvedValue([]),
          } as never),
          mockAdapterFactory,
          { record: vi.fn().mockResolvedValue({}) } as never,
          {
            getActivePolicy: vi.fn().mockResolvedValue({
              id: 'policy-1',
              version: 1,
              platformFeeBps: 800,
              minPayoutMinor: '50000',
            }),
          } as never,
          undefined,
        ) as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
    });

    it('creates a new order on the first invocation with a unique key', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce(null);

      const dto: CreatePaymentOrderDto = {
        bookingId: mockBooking.id,
        amountMinor: 50000,
        paymentMethod: 'bkash',
      };

      const result = await paymentsService.createPaymentOrder(
        studentUser,
        dto,
        'idem-key-unique-001',
        'req-id-1',
      );

      expect(result.orderId).toBe('order-uuid-1');
      expect(result.amountMinor).toBe(50000);
      expect(result.commissionRateBps).toBe(800);
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('returns the existing order idempotently on replay without creating a duplicate', async () => {
      const existingOrder: Partial<PaymentOrderEntity> = {
        id: 'order-uuid-existing',
        payerUserId: studentUser.id,
        bookingId: mockBooking.id,
        idempotencyKey: 'idem-key-unique-001',
        amountMinor: '50000',
        currency: 'BDT',
        status: 'pending',
        provider: 'bkash',
        providerReference: 'PROV-ORD-123',
        commissionRateBps: 800,
      };

      mockOrderRepo.findOne.mockResolvedValueOnce(existingOrder);

      const result = await paymentsService.createPaymentOrder(
        studentUser,
        { bookingId: mockBooking.id, amountMinor: 50000, paymentMethod: 'bkash' },
        'idem-key-unique-001',
        'req-id-2',
      );

      expect(result.orderId).toBe('order-uuid-existing');
      expect(mockOrderRepo.create).not.toHaveBeenCalled();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a replayed key whose booking differs', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({
        id: 'order-uuid-existing',
        payerUserId: studentUser.id,
        bookingId: 'another-booking',
        idempotencyKey: 'idem-key-conflict-001',
        amountMinor: '50000',
        currency: 'BDT',
        status: 'pending',
      });

      await expect(
        paymentsService.createPaymentOrder(
          studentUser,
          {
            bookingId: mockBooking.id,
            amountMinor: 50000,
            paymentMethod: 'bkash',
          },
          'idem-key-conflict-001',
          'req-id-3',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a replayed key whose amount differs', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({
        id: 'order-uuid-existing',
        payerUserId: studentUser.id,
        bookingId: mockBooking.id,
        idempotencyKey: 'idem-key-conflict-002',
        amountMinor: '50000',
        currency: 'BDT',
        status: 'pending',
      });

      await expect(
        paymentsService.createPaymentOrder(
          studentUser,
          { bookingId: mockBooking.id, amountMinor: 75000, paymentMethod: 'bkash' },
          'idem-key-conflict-002',
          'req-id-4',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Double-Entry Ledger Journal Idempotency', () => {
    let ledgerService: LedgerService;
    let mockAccountRepo: any;
    let mockJournalRepo: any;
    let mockEntryRepo: any;
    let mockDataSource: any;

    beforeEach(() => {
      mockAccountRepo = {
        findOne: vi.fn().mockImplementation(({ where }) =>
          Promise.resolve({
            id: `acc-${where.code}`,
            code: where.code,
            name: where.code,
            accountType: 'liability',
            currency: 'BDT',
            isActive: true,
          } as LedgerAccountEntity),
        ),
        find: vi.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.map((entry: { code: string }) => ({
              id: `acc-${entry.code}`,
              code: entry.code,
              name: entry.code,
              accountType: 'liability',
              currency: 'BDT',
              isActive: true,
            })),
          ),
        ),
      };

      mockJournalRepo = {
        findOne: vi.fn(),
        create: vi.fn((j) => ({ ...j, id: 'journal-123', entries: [] })),
        save: vi.fn((j) => Promise.resolve(j)),
      };

      mockEntryRepo = { create: vi.fn((e) => e) };

      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          return await cb({
            getRepository: vi.fn().mockReturnValue({
              findOne: vi.fn().mockResolvedValue(null),
            }),
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

    it('records a new balanced journal for a fresh idempotency key', async () => {
      mockJournalRepo.findOne.mockResolvedValueOnce(null);

      const journal = await ledgerService.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-101',
        description: 'Student payment held in escrow',
        idempotencyKey: 'ledger:pay:order-101',
        entries: [
          { accountCode: '1000', direction: 'debit', amountMinor: 50000 },
          { accountCode: '2100', direction: 'credit', amountMinor: 50000 },
        ],
      });

      expect(journal).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('returns an existing journal for a duplicate key without a new transaction', async () => {
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
        description: 'Duplicate attempt',
        idempotencyKey: 'ledger:pay:order-101',
        entries: [
          { accountCode: '1000', direction: 'debit', amountMinor: 50000 },
          { accountCode: '2100', direction: 'credit', amountMinor: 50000 },
        ],
      });

      expect(journal.id).toBe('journal-existing-999');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('3. Durable Webhook Event Deduplication', () => {
    it('ignores a duplicate provider event without executing payment mutations', async () => {
      const dataSource = { transaction: vi.fn() };
      const service = new PaymentWebhooksService(
        {} as never,
        {} as never,
        {
          create: vi.fn((record) => record),
          save: vi.fn().mockRejectedValue({ code: '23505' }),
          findOne: vi.fn().mockResolvedValue({ id: 'webhook-existing', status: 'processed' }),
        } as never,
        { findActiveGuardianIds: vi.fn().mockResolvedValue([]) } as never,
        { postJournal: vi.fn() } as never,
        {
          getAdapter: vi.fn().mockReturnValue({
            verifyWebhookSignature: vi.fn().mockReturnValue(true),
            normalizeWebhook: vi.fn(() => ({
              eventId: 'EVT-DUPLICATE-777',
              eventType: 'bkash.succeeded',
              orderReference: 'order-1',
              providerTransactionId: 'TXN-777',
              amountMinor: '50000',
              currency: 'BDT',
              status: 'succeeded',
              rawStatus: 'COMPLETED',
            })),
          }),
        } as never,
        { createForOrder: vi.fn() } as never,
        { record: vi.fn() } as never,
        dataSource as never,
        undefined,
      );

      const result = await service.handleWebhook(
        'bkash',
        { 'x-webhook-timestamp': new Date().toISOString() },
        {
          providerTransactionId: 'TXN-777',
          providerEventId: 'EVT-DUPLICATE-777',
          orderReference: 'order-1',
          amountMinor: 50000,
          currency: 'BDT',
          status: 'succeeded',
        },
        'req-webhook-idem',
      );

      expect(result).toEqual({ received: true, processed: false });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
