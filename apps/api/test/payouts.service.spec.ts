import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PayoutsService } from '../src/modules/payments/services/payouts.service';
import {
  PayoutEntity,
  TutorFinancialAccountEntity,
} from '../src/modules/payments/entities';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('PayoutsService: reservation, lifecycle and tutor summary', () => {
  let service: PayoutsService;

  let mockPayoutRepo: any;
  let mockAccountRepo: any;
  let mockSettlementRepo: any;
  let mockAdjustmentRepo: any;
  let mockEscrowRepo: any;
  let mockLedgerService: any;
  let mockCommissionPolicyService: any;
  let mockAuditService: any;
  let mockNotificationService: any;
  let mockDataSource: any;

  const tutorId = '33333333-3333-4333-8333-333333333333';
  const tutor: AuthenticatedUser = { id: tutorId, email: 't@example.com', roles: ['tutor'] };
  const admin: AuthenticatedUser = { id: 'admin-1', email: 'a@example.com', roles: ['admin'] };
  const payoutId = 'pppppppp-pppp-4ppp-8ppp-pppppppppppp';

  let account: any;
  let payout: any;

  function rawBuilder(result: any) {
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue(result),
    };
  }

  function insertBuilder() {
    return {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({}),
    };
  }

  function managerWith(builders: any[], findOverrides: Record<string, any> = {}) {
    const queue = [...builders];
    return {
      findOne: vi.fn(async (entity: any) => {
        if (entity === PayoutEntity) return findOverrides.payout ?? null;
        if (entity === TutorFinancialAccountEntity) return account;
        return null;
      }),
      createQueryBuilder: vi.fn(() => {
        const next = queue.shift();
        if (!next) throw new Error('Unexpected createQueryBuilder call');
        return next;
      }),
      create: vi.fn((_entity, data) => ({ ...data, id: payoutId })),
      save: vi.fn(async (value) => value),
      query: vi.fn().mockResolvedValue([{ nextval: '1' }]),
    };
  }

  beforeEach(() => {
    account = { tutorUserId: tutorId, currency: 'BDT', reservedMinor: '0' };
    payout = {
      id: payoutId,
      payoutNumber: 'PAY-2026-000001',
      tutorUserId: tutorId,
      amountMinor: '60000',
      currency: 'BDT',
      status: 'requested',
      method: 'bkash',
      accountReferenceMasked: '*********1234',
      externalReference: null,
      requestedBy: tutorId,
      idempotencyKey: 'payout-idem-1',
      createdAt: new Date(),
    };

    mockPayoutRepo = {
      findOne: vi.fn().mockResolvedValue(payout),
      find: vi.fn().mockResolvedValue([payout]),
    };
    mockAccountRepo = { findOne: vi.fn().mockResolvedValue(account) };
    mockSettlementRepo = { find: vi.fn().mockResolvedValue([]) };
    mockAdjustmentRepo = { find: vi.fn().mockResolvedValue([]) };
    mockEscrowRepo = { find: vi.fn().mockResolvedValue([]) };
    mockLedgerService = {
      postJournal: vi.fn().mockResolvedValue({ id: 'journal-payout-1' }),
      getPartyBalance: vi.fn().mockResolvedValue(0n),
    };
    mockCommissionPolicyService = {
      getActivePolicy: vi.fn().mockResolvedValue({
        id: 'policy-1',
        platformFeeBps: 800,
        minPayoutMinor: '50000',
      }),
    };
    mockAuditService = { record: vi.fn().mockResolvedValue({}) };
    mockNotificationService = { dispatch: vi.fn().mockResolvedValue({}) };
    mockDataSource = { transaction: vi.fn() };

    service = new PayoutsService(
      mockPayoutRepo,
      mockAccountRepo,
      mockSettlementRepo,
      mockAdjustmentRepo,
      mockEscrowRepo,
      mockLedgerService,
      mockCommissionPolicyService,
      mockAuditService,
      mockNotificationService,
      mockDataSource,
    );
  });

  describe('requestPayout', () => {
    it('reserves the requested amount against the derived payable balance', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(
          managerWith([
            insertBuilder(),
            rawBuilder({ balance: '100000' }),
            rawBuilder({ total: '0' }),
          ]),
        ),
      );

      const result = await service.requestPayout(tutor, {
        amountMinor: 60000,
        method: 'bkash',
        accountReference: '017000001234',
        idempotencyKey: 'payout-idem-1',
      });

      expect(result.status).toBe('requested');
      expect(result.amountMinor).toBe('60000');
      expect(account.reservedMinor).toBe('60000');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.payout_requested' }),
      );
    });

    it('rejects an amount above the available (payable minus reserved) balance', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(
          managerWith([
            insertBuilder(),
            rawBuilder({ balance: '100000' }),
            rawBuilder({ total: '60000' }),
          ]),
        ),
      );

      await expect(
        service.requestPayout(tutor, {
          amountMinor: 60000,
          method: 'bkash',
          accountReference: '017000001234',
          idempotencyKey: 'payout-idem-2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a payout below the configured minimum', async () => {
      await expect(
        service.requestPayout(tutor, {
          amountMinor: 49999,
          method: 'bkash',
          accountReference: '017000001234',
          idempotencyKey: 'payout-idem-3',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('replays an existing payout for the same idempotency key', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(managerWith([], { payout })),
      );

      const result = await service.requestPayout(tutor, {
        amountMinor: 60000,
        method: 'bkash',
        accountReference: '017000001234',
        idempotencyKey: 'payout-idem-1',
      });

      expect(result.id).toBe(payoutId);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  describe('finance actions', () => {
    it('approves a requested payout', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(managerWith([], { payout })),
      );

      const result = await service.approve(admin, payoutId);

      expect(result.status).toBe('approved');
      expect(result.reviewedBy).toBe(admin.id);
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payout.approved' }),
      );
    });

    it('rejects a payout and releases the reservation', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(managerWith([insertBuilder(), rawBuilder({ total: '0' })], { payout })),
      );

      const result = await service.reject(admin, payoutId, { reason: 'Account mismatch' });

      expect(result.status).toBe('rejected');
      expect(account.reservedMinor).toBe('0');
    });

    it('requires an external transfer reference before marking a payout paid', async () => {
      await expect(
        service.markPaid(admin, payoutId, { externalReference: '' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('refuses to pay more than the tutor payable balance', async () => {
      payout.status = 'approved';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(
          managerWith([
            insertBuilder(),
            rawBuilder({ balance: '30000' }),
            rawBuilder({ total: '0' }),
          ], { payout }),
        ),
      );

      await expect(
        service.markPaid(admin, payoutId, { externalReference: 'BKASH-TRX-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });

    it('posts the 2000 → 1100 journal only when the payout is actually paid', async () => {
      payout.status = 'approved';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(
          managerWith([
            insertBuilder(),
            rawBuilder({ balance: '100000' }),
            rawBuilder({ total: '0' }),
          ], { payout }),
        ),
      );

      const result = await service.markPaid(admin, payoutId, {
        externalReference: 'BKASH-TRX-1',
      });

      expect(result.status).toBe('paid');
      expect(result.externalReference).toBe('BKASH-TRX-1');
      expect(mockLedgerService.postJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'payout',
          entries: [
            { accountCode: '2000', direction: 'debit', amountMinor: 60000n, tutorUserId: tutorId },
            { accountCode: '1100', direction: 'credit', amountMinor: 60000n },
          ],
        }),
        expect.anything(),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'finance.payout_paid' }),
      );
    });

    it('releases the reservation when a transfer fails', async () => {
      payout.status = 'approved';
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) =>
        cb(managerWith([insertBuilder(), rawBuilder({ total: '0' })], { payout })),
      );

      const result = await service.markFailed(admin, payoutId, { reason: 'Bank rejected' });

      expect(result.status).toBe('failed');
      expect(account.reservedMinor).toBe('0');
      expect(mockLedgerService.postJournal).not.toHaveBeenCalled();
    });
  });

  describe('record scoping and summary', () => {
    it('denies reading another tutor’s payout', async () => {
      mockPayoutRepo.findOne.mockResolvedValue({ ...payout, tutorUserId: 'other-tutor' });

      await expect(service.getPayoutForTutor(tutor, payoutId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('derives the tutor summary from settlements, ledger and payouts', async () => {
      mockSettlementRepo.find.mockResolvedValue([
        { id: 's1', tutorNetMinor: '92000', status: 'settled' },
      ]);
      mockAdjustmentRepo.find.mockResolvedValue([
        { id: 'a1', amountMinor: '1000', direction: 'credit' },
        { id: 'a2', amountMinor: '500', direction: 'debit' },
      ]);
      mockPayoutRepo.find.mockResolvedValue([
        { id: 'p1', status: 'paid', amountMinor: '50000' },
        { id: 'p2', status: 'requested', amountMinor: '20000' },
      ]);
      mockEscrowRepo.find.mockResolvedValue([
        { amountMinor: '100000', releasedMinor: '92000', refundedMinor: '0' },
      ]);
      mockLedgerService.getPartyBalance.mockResolvedValue(92500n);

      const summary = await service.getTutorSummary(tutor);

      expect(summary.lifetimeNetMinor).toBe('92500'); // 92000 + 1000 - 500
      expect(summary.reservedMinor).toBe('20000');
      expect(summary.availableMinor).toBe('72500'); // 92500 - 20000
      expect(summary.paidOutMinor).toBe('50000');
      expect(summary.escrowPendingMinor).toBe('8000');
      expect(summary.minimumPayoutMinor).toBe('50000');
    });
  });
});
