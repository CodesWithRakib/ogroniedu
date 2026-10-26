import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SslcommerzSandboxAdapter } from '../src/modules/payments/adapters/sslcommerz-sandbox.adapter';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  EscrowHoldEntity,
} from '../src/modules/payments/entities';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('SSLCOMMERZ Sandbox-Only Payment Scenarios (13 Mandatory Scenarios)', () => {
  let adapter: SslcommerzSandboxAdapter;
  let ordersService: PaymentOrdersService;
  let webhooksService: PaymentWebhooksService;

  let mockOrderRepo: any;
  let mockTransactionRepo: any;
  let mockWebhookRepo: any;
  let mockBookingRepo: any;
  let mockGuardianLinkRepo: any;
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
  let invoice: any;

  beforeEach(() => {
    vi.stubEnv('SSLCOMMERZ_STORE_ID', 'test_store_id');
    vi.stubEnv('SSLCOMMERZ_STORE_PASSWD', 'test_store_passwd');
    vi.stubEnv('SSLCOMMERZ_IS_LIVE', 'false');
    vi.stubEnv('SSLCOMMERZ_SESSION_URL', 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php');
    vi.stubEnv('SSLCOMMERZ_VALIDATION_URL', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php');

    adapter = new SslcommerzSandboxAdapter();

    booking = {
      id: bookingId,
      requesterUserId: studentId,
      studentUserId: studentId,
      tutorUserId: tutorId,
      pricePerSessionMinor: '100000',
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
      idempotencyKey: 'idem-ssl-1',
      provider: 'sslcommerz',
      providerReference: 'SSL-SESSION-KEY-1',
      commissionRateBps: 800,
      commissionPolicyId: 'policy-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      booking,
      payerUser: { id: studentId, displayName: 'Rahim' },
    };
    lockedOrder = { ...sampleOrder };

    invoice = {
      id: 'invoice-ssl-1',
      invoiceNumber: 'INV-2026-SSL-001',
      paymentOrderId: orderId,
      status: 'issued',
      totalMinor: '100000',
      commissionMinor: '8000',
      snapshot: {},
    };

    mockOrderRepo = {
      findOne: vi.fn().mockResolvedValue(lockedOrder),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => ({ ...data, id: orderId })),
      save: vi.fn(async (entity) => ({ ...entity, id: entity.id ?? orderId, updatedAt: new Date() })),
    };

    mockTransactionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockWebhookRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (record) => ({ id: 'webhook-ssl-1', ...record })),
      update: vi.fn().mockResolvedValue({}),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue(booking),
      save: vi.fn(async (b) => b),
    };

    mockGuardianLinkRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockLedgerService = {
      postJournal: vi.fn().mockResolvedValue({ id: 'journal-ssl-1', entries: [] }),
      getPartyBalance: vi.fn().mockResolvedValue(0n),
      verifySystemLedgerIntegrity: vi.fn().mockResolvedValue({
        isBalanced: true,
        totalDebits: 100000n,
        totalCredits: 100000n,
        discrepancy: 0n,
      }),
    };

    mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue(adapter),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue({ id: 'aud-ssl-1' }) };
    mockNotificationService = { dispatch: vi.fn().mockResolvedValue({ id: 'notif-ssl-1' }) };
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
            return null;
          }),
          create: vi.fn((entity, data) => ({
            ...data,
            id: entity === EscrowHoldEntity ? 'hold-ssl-1' : `trx-${Math.random()}`,
          })),
          save: vi.fn(async (val) => val),
          update: vi.fn().mockResolvedValue({}),
        };
        return cb(manager);
      }),
    };

    const guardianAccess = new GuardianAccessService(mockGuardianLinkRepo);
    ordersService = new PaymentOrdersService(
      mockOrderRepo,
      mockBookingRepo,
      guardianAccess,
      mockAdapterFactory,
      mockAuditService,
      mockCommissionPolicyService,
      mockInvoicesService,
    );

    webhooksService = new PaymentWebhooksService(
      mockOrderRepo,
      mockTransactionRepo,
      mockWebhookRepo,
      guardianAccess,
      mockLedgerService,
      mockAdapterFactory,
      mockInvoicesService,
      mockAuditService,
      mockDataSource,
      mockNotificationService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 0: Startup Sandbox Safety Guards
  // --------------------------------------------------------------------------
  describe('Scenario 0: Sandbox Configuration Safety Tripwires', () => {
    it('throws fatal error if SSLCOMMERZ_IS_LIVE is true', () => {
      vi.stubEnv('SSLCOMMERZ_IS_LIVE', 'true');
      const testAdapter = new SslcommerzSandboxAdapter();
      expect(() => testAdapter.onModuleInit()).toThrow(
        /FATAL: SSLCOMMERZ_IS_LIVE=true is configured/,
      );
    });

    it('throws fatal error if session URL points to securepay (live)', () => {
      vi.stubEnv('SSLCOMMERZ_SESSION_URL', 'https://securepay.sslcommerz.com/gwprocess/v4/api.php');
      const testAdapter = new SslcommerzSandboxAdapter();
      expect(() => testAdapter.onModuleInit()).toThrow(/FATAL: Live session URL configured/);
    });

    it('throws fatal error if validation URL points to securepay (live)', () => {
      vi.stubEnv('SSLCOMMERZ_VALIDATION_URL', 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php');
      const testAdapter = new SslcommerzSandboxAdapter();
      expect(() => testAdapter.onModuleInit()).toThrow(/FATAL: Live validation URL configured/);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Successful Payment
  // --------------------------------------------------------------------------
  describe('Scenario 1: Successful Payment Flow', () => {
    it('validates S2S with gateway, posts escrow ledger, issues invoice, and confirms booking', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-SUCCESS-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      vi.spyOn(adapter, 'queryTransaction').mockResolvedValueOnce({
        providerTransactionId: 'VAL-SUCCESS-1',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'succeeded',
        verifiedAt: new Date(),
      });

      const res = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );

      expect(res).toMatchObject({ received: true, processed: true, status: 'succeeded' });
      expect(mockLedgerService.postJournal).toHaveBeenCalled();
      expect(mockInvoicesService.createForOrder).toHaveBeenCalled();
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment.succeeded' }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Failed Payment
  // --------------------------------------------------------------------------
  describe('Scenario 2: Failed Payment Flow', () => {
    it('transitions order to failed and does NOT post to escrow ledger', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-FAIL-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'FAILED',
        error: 'Insufficient funds or card declined',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      const res = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );

      expect(res).toMatchObject({ received: true, processed: true, status: 'failed' });
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
      expect(mockInvoicesService.createForOrder).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Cancelled Payment
  // --------------------------------------------------------------------------
  describe('Scenario 3: Cancelled Payment Flow', () => {
    it('normalizes CANCELLED gateway event and fails closed without escrow posting', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-CANCEL-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'CANCELLED',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      const res = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );

      expect(res).toMatchObject({ received: true, processed: true, status: 'failed' });
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Pending or Uncertain Payment
  // --------------------------------------------------------------------------
  describe('Scenario 4: Pending or Uncertain Payment Flow', () => {
    it('keeps order in pending status without premature escrow release', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-PENDING-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'PENDING',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      const res = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );

      expect(res).toMatchObject({ received: true, processed: false, status: 'pending' });
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Invalid Transaction Reference
  // --------------------------------------------------------------------------
  describe('Scenario 5: Invalid Transaction Reference', () => {
    it('throws NotFoundException when orderReference does not match any order', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      const payload = {
        tran_id: 'non-existent-order-id',
        val_id: 'VAL-GHOST-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      await expect(
        webhooksService.handleWebhook(
          'sslcommerz',
          { 'x-sslcommerz-signature': signature },
          payload,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Amount Mismatch
  // --------------------------------------------------------------------------
  describe('Scenario 6: Amount Mismatch Guard', () => {
    it('rejects callback if validated amount differs from order amount', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-MISMATCH-1',
        amount: '500.00', // Expected 1000.00 BDT (100000 minor)
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      await expect(
        webhooksService.handleWebhook(
          'sslcommerz',
          { 'x-sslcommerz-signature': signature },
          payload,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Invalid Provider Response
  // --------------------------------------------------------------------------
  describe('Scenario 7: Invalid Provider Response Handling', () => {
    it('fails closed when queryTransaction returns non-succeeded status', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-CORRUPT-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      vi.spyOn(adapter, 'queryTransaction').mockResolvedValueOnce({
        providerTransactionId: 'VAL-CORRUPT-1',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'failed',
        verifiedAt: new Date(),
      });

      await expect(
        webhooksService.handleWebhook(
          'sslcommerz',
          { 'x-sslcommerz-signature': signature },
          payload,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Duplicate IPN Delivery
  // --------------------------------------------------------------------------
  describe('Scenario 8: Duplicate IPN Deduplication', () => {
    it('returns duplicate acknowledged response without duplicate ledger entries', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-DUP-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      // Simulate database unique constraint violation on providerEventId
      mockWebhookRepo.save.mockRejectedValueOnce({ code: '23505' });
      mockWebhookRepo.findOne.mockResolvedValueOnce({ id: 'webhook-prev-1', status: 'processed' });

      const res = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );

      expect(res).toEqual({ received: true, processed: false });
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Browser Return Before IPN
  // --------------------------------------------------------------------------
  describe('Scenario 9: Browser Return Before IPN', () => {
    it('validates via browser return, transitions order, and makes subsequent IPN a no-op', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-BROWSER-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      vi.spyOn(adapter, 'queryTransaction').mockResolvedValueOnce({
        providerTransactionId: 'VAL-BROWSER-1',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'succeeded',
        verifiedAt: new Date(),
      });

      // 1. Browser returns first
      const browserRes = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );
      expect(browserRes.status).toBe('succeeded');
      expect(mockLedgerService.postJournal).toHaveBeenCalledTimes(1);

      // 2. Subsequent IPN arrives for already succeeded order
      lockedOrder.status = 'succeeded';
      mockWebhookRepo.save.mockRejectedValueOnce({ code: '23505' });
      mockWebhookRepo.findOne.mockResolvedValueOnce({ id: 'webhook-prev-1', status: 'processed' });

      const ipnRes = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );
      expect(ipnRes).toEqual({ received: true, processed: false });
      expect(mockLedgerService.postJournal).toHaveBeenCalledTimes(1); // No double credit
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 10: IPN Before Browser Return
  // --------------------------------------------------------------------------
  describe('Scenario 10: IPN Before Browser Return', () => {
    it('validates via IPN first, and browser return receives succeeded state idempotently', async () => {
      const payload = {
        tran_id: orderId,
        val_id: 'VAL-IPN-FIRST-1',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID',
      };
      const signature = adapter.generateSignature(adapter.canonicalizePayload(payload));

      vi.spyOn(adapter, 'queryTransaction').mockResolvedValueOnce({
        providerTransactionId: 'VAL-IPN-FIRST-1',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'succeeded',
        verifiedAt: new Date(),
      });

      // 1. IPN arrives first
      const ipnRes = await webhooksService.handleWebhook(
        'sslcommerz',
        { 'x-sslcommerz-signature': signature },
        payload,
      );
      expect(ipnRes.status).toBe('succeeded');

      // 2. User browser subsequently checks order status
      lockedOrder.status = 'succeeded';
      lockedOrder.transactions = [{ status: 'succeeded', verifiedAt: new Date() }];

      const statusRes = await ordersService.getPaymentOrderStatus(studentUser, orderId);
      expect(statusRes.status).toBe('succeeded');
      expect(statusRes.receipt).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Temporary Gateway / Network Failure
  // --------------------------------------------------------------------------
  describe('Scenario 11: Temporary Gateway Network Failure', () => {
    it('fails closed when queryTransaction encounters a gateway timeout', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
        throw new Error('ETIMEDOUT: Connection to sandbox.sslcommerz.com timed out');
      });

      const res = await adapter.queryTransaction('VAL-TIMEOUT-1');
      expect(res.status).toBe('failed');
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Retrying Payment Verification
  // --------------------------------------------------------------------------
  describe('Scenario 12: Retrying Payment Verification', () => {
    it('recovers on second attempt when first attempt experiences transient network error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First call fails
      fetchSpy.mockRejectedValueOnce(new Error('Network drop'));
      const firstAttempt = await adapter.queryTransaction('VAL-RETRY-1');
      expect(firstAttempt.status).toBe('failed');

      // Second attempt succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'VALID',
          amount: '1000.00',
          currency: 'BDT',
          bank_tran_id: 'VAL-RETRY-1',
        }),
      } as any);

      const secondAttempt = await adapter.queryTransaction('VAL-RETRY-1');
      expect(secondAttempt.status).toBe('succeeded');
      expect(secondAttempt.amountMinor).toBe(100000);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Unauthorized Access Guard
  // --------------------------------------------------------------------------
  describe('Scenario 13: Record-Level Authorization Guard', () => {
    it('rejects order status access from stranger user with 403 Forbidden', async () => {
      await expect(
        ordersService.getPaymentOrderStatus(strangerUser, orderId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permits authorized payer to view order status', async () => {
      const statusRes = await ordersService.getPaymentOrderStatus(studentUser, orderId);
      expect(statusRes.orderId).toBe(orderId);
      expect(statusRes.amountMinor).toBe(100000);
    });
  });
});
