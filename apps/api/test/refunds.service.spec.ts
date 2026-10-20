import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import {
  EscrowHoldEntity,
  PaymentOrderEntity,
  PaymentRefundEntity,
} from '../src/modules/payments/entities';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('RefundsService state machine and escrow bounds', () => {
  let service: RefundsService;

  let mockOrderRepo: any;
  let mockRefundRepo: any;
  let mockTransactionRepo: any;
  let mockEscrowRepo: any;
  let mockOutboxRepo: any;
  let mockLedgerService: any;
  let mockAdapterFactory: any;
  let mockAuditService: any;
  let mockGuardianLinkRepo: any;
  let mockDataSource: any;
  let mockNotificationService: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const strangerId = '99999999-9999-4999-8999-999999999999';
  const tutorId = '33333333-3333-4333-8333-333333333333';
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const orderId = '00000000-0000-4000-8000-000000000000';
  const refundId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const student: AuthenticatedUser = { id: studentId, email: 's@example.com', roles: ['student'] };
  const admin: AuthenticatedUser = { id: 'admin-1', email: 'a@example.com', roles: ['admin'] };

  let order: any;
  let hold: any;
  let refund: any;

  function transactionManager(overrides: Record<string, any> = {}) {
    return {
      findOne: vi.fn(async (entity: any) => {
        if (entity === PaymentOrderEntity) return order;
        if (entity === EscrowHoldEntity) return hold;
        if (entity === PaymentRefundEntity) return overrides.refund ?? null;
        return null;
      }),
      find: vi.fn(async () => overrides.previousRefunds ?? []),
      query: vi.fn().mockResolvedValue([{ nextval: '7' }]),
      create: vi.fn((_entity, data) => ({ ...data, id: refundId })),
      save: vi.fn(async (value) => value),
    };
  }

  beforeEach(() => {
    order = {
      id: orderId,
      bookingId,
      payerUserId: studentId,
      amountMinor: '100000',
      currency: 'BDT',
      status: 'succeeded',
      provider: 'sslcommerz',
      booking: {
        id: bookingId,
        studentUserId: studentId,
        requesterUserId: studentId,
        tutorUserId: tutorId,
        status: 'confirmed',
        studentUser: { displayName: 'Rahim' },
        requesterUser: { displayName: 'Rahim' },
        tutorProfile: { user: { displayName: 'Tutor One' } },
      },
    };

    hold = {
      id: 'hold-1',
      paymentOrderId: orderId,
      bookingId,
      amountMinor: '100000',
      releasedMinor: '0',
      refundedMinor: '0',
      status: 'held',
      currency: 'BDT',
      commissionRateBps: 800,
    };

    refund = {
      id: refundId,
      paymentOrderId: orderId,
      bookingId,
      refundNumber: 'RFD-2026-000007',
      amountMinor: '50000',
      currency: 'BDT',
      reason: 'Cancellation with adequate notice',
      status: 'approved',
      requestedBy: studentId,
      ledgerJournalId: null,
    };

    mockOrderRepo = {
      findOne: vi.fn().mockResolvedValue(order),
      find: vi.fn().mockResolvedValue([]),
    };
    mockRefundRepo = {
      findOne: vi.fn().mockResolvedValue(refund),
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(async (value) => value),
      createQueryBuilder: vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([refund]),
      })),
    };
    mockTransactionRepo = {
      findOne: vi.fn().mockResolvedValue({ providerTransactionId: 'VAL-1' }),
    };
    mockEscrowRepo = { findOne: vi.fn().mockResolvedValue(hold) };
    mockOutboxRepo = { create: vi.fn((e) => e), save: vi.fn(async (e) => e) };
    mockLedgerService = { postJournal: vi.fn().mockResolvedValue({ id: 'journal-refund-1' }) };
    mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue({
        processRefund: vi.fn().mockResolvedValue({
          status: 'unsupported',
          providerRefundId: null,
          amountMinor: 50000,
          failureReason: 'Automated refunds are not provisioned',
        }),
      }),
    };
    mockAuditService = { record: vi.fn().mockResolvedValue({}) };
    mockGuardianLinkRepo = { findOne: vi.fn().mockResolvedValue(null) };
    mockNotificationService = { dispatch: vi.fn().mockResolvedValue({}) };
    mockDataSource = {
      transaction: vi.fn(async (cb) => cb(transactionManager())),
    };

    service = new RefundsService(
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
  });

  describe('requestRefund', () => {
    it('creates a requested refund with an eligibility snapshot and no money movement', async () => {
      const result = await service.requestRefund(student, {
        paymentOrderId: orderId,
        amountMinor: 50000,
        reason: 'Cancellation with adequate notice',
        idempotencyKey: 'refund-idem-1',
      });

      expect(result.status).toBe('requested');
      expect(result.refundNumber).toMatch(/^RFD-\d{4}-\d{6}$/);
      expect(result.eligibilitySnapshot).toMatchObject({
        orderAmountMinor: '100000',
        releasedToTutorMinor: '0',
        refundableMinor: '100000',
      });
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.refund_requested' }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'refund.requested' }),
      );
    });

    it('rejects a request that exceeds the refundable balance after previous refunds', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(
          transactionManager({
            previousRefunds: [
              { id: 'old-1', amountMinor: '70000', status: 'succeeded' },
              { id: 'old-2', amountMinor: '20000', status: 'requested' },
            ],
          }),
        ),
      );

      await expect(
        service.requestRefund(student, {
          paymentOrderId: orderId,
          amountMinor: 20000,
          reason: 'Excessive refund attempt',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('blocks a customer request once tutor earnings were released', async () => {
      hold.releasedMinor = '50000';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(transactionManager()),
      );

      await expect(
        service.requestRefund(student, {
          paymentOrderId: orderId,
          amountMinor: 10000,
          reason: 'Refund after settlement',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows a finance operator to open a request against the unreleased remainder', async () => {
      hold.releasedMinor = '40000';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(transactionManager()),
      );

      const result = await service.requestRefund(admin, {
        paymentOrderId: orderId,
        amountMinor: 50000,
        reason: 'Finance review adjustment',
      });

      expect(result.status).toBe('requested');
    });

    it('denies an unrelated user at the record level', async () => {
      await expect(
        service.requestRefund(
          { id: strangerId, email: 'x@example.com', roles: ['student'] },
          {
            paymentOrderId: orderId,
            amountMinor: 10000,
            reason: 'I want this refund',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects refunds for a payment that never succeeded', async () => {
      order.status = 'pending';

      await expect(
        service.requestRefund(student, {
          paymentOrderId: orderId,
          amountMinor: 10000,
          reason: 'Not paid yet',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('decide', () => {
    it('moves a requested refund to approved', async () => {
      const requested = { ...refund, status: 'requested' };
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb({ ...transactionManager({ refund: requested }) }),
      );

      const result = await service.decide(admin, refundId, {
        decision: 'approve',
        note: 'Within policy',
      });

      expect(result.status).toBe('approved');
      expect(result.decidedBy).toBe(admin.id);
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'refund.approved' }),
      );
    });

    it('moves a requested refund to rejected with a reason', async () => {
      const requested = { ...refund, status: 'requested' };
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb({ ...transactionManager({ refund: requested }) }),
      );

      const result = await service.decide(admin, refundId, {
        decision: 'reject',
        note: 'Outside cancellation window',
      });

      expect(result.status).toBe('rejected');
      expect(result.failureReason).toContain('Outside cancellation window');
    });

    it('refuses to decide an already-succeeded refund', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(transactionManager({ refund: { ...refund, status: 'succeeded' } })),
      );

      await expect(service.decide(admin, refundId, { decision: 'approve' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('provider processing and manual confirmation', () => {
    it('reports unsupported provider refunds without marking them succeeded', async () => {
      const result = await service.process(admin, refundId);

      expect(result.manualConfirmationRequired).toBe(true);
      expect(result.refund.status).toBe('approved');
      expect(result.refund.providerStatus).toBe('unsupported');
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('requires a real external reference for manual confirmation', async () => {
      await expect(
        service.confirmManual(admin, refundId, { externalReference: '' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('posts the reversal journal and updates the escrow hold on confirmation', async () => {
      let finalizeManager: any;
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        finalizeManager = transactionManager({ refund });
        return cb(finalizeManager);
      });

      const saved = await service.confirmManual(admin, refundId, {
        externalReference: 'BANK-TXN-9911',
      });

      expect(saved.status).toBe('succeeded');
      expect(saved.providerReference).toBe('BANK-TXN-9911');
      expect(saved.ledgerJournalId).toBe('journal-refund-1');
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payment_refund',
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: 50000n },
            { accountCode: '1000', direction: 'credit', amountMinor: 50000n },
          ],
        }),
        expect.anything(),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.refund_succeeded' }),
      );
      expect(finalizeManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ aggregateType: 'payment_refund' }),
      );
      expect(hold.refundedMinor).toBe('50000');
    });

    it('refuses a confirmation that would consume released or reserved money', async () => {
      hold.releasedMinor = '70000';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = transactionManager({ refund });
        return cb(manager);
      });

      await expect(
        service.confirmManual(admin, refundId, { externalReference: 'BANK-TXN-9911' }),
      ).rejects.toThrow(ConflictException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('marks a failed provider refund without posting a journal', async () => {
      mockAdapterFactory.getAdapter.mockReturnValue({
        processRefund: vi.fn().mockResolvedValue({
          status: 'failed',
          providerRefundId: null,
          amountMinor: 50000,
          failureReason: 'Provider declined',
        }),
      });
      mockRefundRepo.findOne.mockResolvedValue({ ...refund });

      const result = await service.process(admin, refundId);

      expect(result.refund.status).toBe('failed');
      expect(result.manualConfirmationRequired).toBe(false);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'refund.failed' }),
      );
    });
  });

  describe('record scoping', () => {
    it('returns a refund to its requester', async () => {
      const result = await service.getRefund(student, refundId);
      expect(result.id).toBe(refundId);
    });

    it('denies an unrelated user access to someone else’s refund', async () => {
      mockRefundRepo.findOne.mockResolvedValue({ ...refund, requestedBy: 'someone-else' });

      await expect(
        service.getRefund({ id: strangerId, email: 'x@example.com', roles: ['student'] }, refundId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets an admin read any refund record', async () => {
      mockRefundRepo.findOne.mockResolvedValue({ ...refund, requestedBy: 'someone-else' });

      const result = await service.getRefund(admin, refundId);
      expect(result.id).toBe(refundId);
    });
  });
});
