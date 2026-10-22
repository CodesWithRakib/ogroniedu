import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { PayoutsService } from '../src/modules/payments/services/payouts.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 10: Financial, Escrow & Supporting Workflows Verification', () => {
  const tutorUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'tutor.demo@ogroniedu.com',
    roles: ['tutor'],
    preferredLocale: 'bn',
  };

  const studentUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student.demo@ogroniedu.com',
    roles: ['student'],
    preferredLocale: 'bn',
  };

  describe('1. Double-Entry Escrow Ledger & Balance Invariants (LedgerService)', () => {
    let ledgerService: LedgerService;
    let mockAccountRepo: any;
    let mockJournalRepo: any;
    let mockEntryRepo: any;
    let mockDataSource: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockAccountRepo = {
        findOne: vi.fn(),
        find: vi.fn().mockResolvedValue([
          { id: 'acc-1', code: '1010_CASH', name: 'Cash', accountType: 'asset', currency: 'BDT', isActive: true },
          { id: 'acc-2', code: '2010_ESCROW', name: 'Escrow Holding', accountType: 'liability', currency: 'BDT', isActive: true },
          { id: 'acc-3', code: '2000_PAYABLE', name: 'Tutor Payable', accountType: 'liability', currency: 'BDT', isActive: true },
          { id: 'acc-4', code: '4000_REVENUE', name: 'Platform Revenue', accountType: 'revenue', currency: 'BDT', isActive: true },
        ]),
      };

      mockJournalRepo = {
        findOne: vi.fn(),
        create: vi.fn().mockImplementation((j) => ({ id: 'journal-101', ...j })),
        save: vi.fn().mockImplementation((j) => Promise.resolve(j)),
      };

      mockEntryRepo = {
        find: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((e) => ({ id: 'entry-1', ...e })),
        save: vi.fn().mockImplementation((e) => Promise.resolve(e)),
      };

      mockDataSource = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const mgr = {
            getRepository: vi.fn().mockImplementation((entity) => {
              if (entity.name === 'LedgerJournalEntity') return mockJournalRepo;
              if (entity.name === 'LedgerAccountEntity') return mockAccountRepo;
              return mockEntryRepo;
            }),
            create: vi.fn().mockImplementation((entity, d) => ({ id: 'gen-id', ...d })),
            save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
            findOne: vi.fn().mockResolvedValue(null),
          };
          return cb(mgr);
        }),
      };

      ledgerService = new LedgerService(
        mockAccountRepo,
        mockJournalRepo,
        mockEntryRepo,
        mockDataSource,
      );
    });

    it('INVARIANT: Rejects journal with fewer than two entry legs', async () => {
      await expect(
        ledgerService.postJournal({
          sourceType: 'test',
          sourceId: 'src-1',
          idempotencyKey: 'idem-1',
          description: 'Single leg attempt',
          entries: [
            { accountCode: '1010_CASH', direction: 'debit', amountMinor: 50000 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('INVARIANT: Rejects unbalanced journal where debits do not equal credits', async () => {
      await expect(
        ledgerService.postJournal({
          sourceType: 'test',
          sourceId: 'src-1',
          idempotencyKey: 'idem-2',
          description: 'Unbalanced journal',
          entries: [
            { accountCode: '1010_CASH', direction: 'debit', amountMinor: 100000 },
            { accountCode: '2010_ESCROW', direction: 'credit', amountMinor: 80000 }, // Discrepancy of 20000
          ],
        }),
      ).rejects.toThrow(/Double-entry invariant violated/);
    });

    it('INVARIANT: Rejects journal legs with non-positive amounts', async () => {
      await expect(
        ledgerService.postJournal({
          sourceType: 'test',
          sourceId: 'src-1',
          idempotencyKey: 'idem-3',
          description: 'Zero amount leg',
          entries: [
            { accountCode: '1010_CASH', direction: 'debit', amountMinor: 0 },
            { accountCode: '2010_ESCROW', direction: 'credit', amountMinor: 0 },
          ],
        }),
      ).rejects.toThrow(/Entry amount must be strictly positive/);
    });

    it('INVARIANT: Rejects journal with inactive or non-existent account codes', async () => {
      mockAccountRepo.find.mockResolvedValueOnce([
        { id: 'acc-1', code: '1010_CASH', isActive: true },
      ]);

      await expect(
        ledgerService.postJournal({
          sourceType: 'test',
          sourceId: 'src-1',
          idempotencyKey: 'idem-4',
          description: 'Invalid account code',
          entries: [
            { accountCode: '1010_CASH', direction: 'debit', amountMinor: 50000 },
            { accountCode: '9999_UNKNOWN', direction: 'credit', amountMinor: 50000 },
          ],
        }),
      ).rejects.toThrow(/does not exist or is inactive/);
    });

    it('SUCCESS: Posts balanced double-entry journal and returns journal entity', async () => {
      const journal = await ledgerService.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-123',
        idempotencyKey: 'idem-success-1',
        description: 'Payment escrow hold',
        entries: [
          { accountCode: '1010_CASH', direction: 'debit', amountMinor: 120000 },
          { accountCode: '2010_ESCROW', direction: 'credit', amountMinor: 120000 },
        ],
      });

      expect(journal).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('SUCCESS: verifySystemLedgerIntegrity detects 0 discrepancy when balanced', async () => {
      mockEntryRepo.find.mockResolvedValueOnce([
        { direction: 'debit', amountMinor: '500000' },
        { direction: 'credit', amountMinor: '500000' },
      ]);

      const integrity = await ledgerService.verifySystemLedgerIntegrity();

      expect(integrity.isBalanced).toBe(true);
      expect(integrity.totalDebits).toBe(500000n);
      expect(integrity.totalCredits).toBe(500000n);
      expect(integrity.discrepancy).toBe(0n);
    });

    it('INTEGRITY ALERT: verifySystemLedgerIntegrity flags discrepancy when unbalanced', async () => {
      mockEntryRepo.find.mockResolvedValueOnce([
        { direction: 'debit', amountMinor: '500000' },
        { direction: 'credit', amountMinor: '450000' }, // 50000 poisha discrepancy
      ]);

      const integrity = await ledgerService.verifySystemLedgerIntegrity();

      expect(integrity.isBalanced).toBe(false);
      expect(integrity.discrepancy).toBe(50000n);
    });
  });

  describe('2. Tutor Payout Lifecycle & Limits (PayoutsService)', () => {
    let payoutsService: PayoutsService;
    let mockPayoutRepo: any;
    let mockAccountRepo: any;
    let mockSettlementRepo: any;
    let mockAdjustmentRepo: any;
    let mockEscrowRepo: any;
    let mockLedgerService: any;
    let mockCommissionPolicyService: any;
    let mockAuditService: any;
    let mockDataSource: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockPayoutRepo = {
        findOne: vi.fn(),
        find: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((p) => ({ id: 'payout-1', ...p })),
        save: vi.fn().mockImplementation((p) => Promise.resolve(p)),
      };

      mockAccountRepo = {
        findOne: vi.fn(),
      };

      mockSettlementRepo = {};
      mockAdjustmentRepo = {};
      mockEscrowRepo = {};

      mockLedgerService = {
        postJournal: vi.fn().mockResolvedValue({ id: 'journal-payout-1' }),
      };

      mockCommissionPolicyService = {
        getActivePolicy: vi.fn().mockResolvedValue({
          minPayoutMinor: '50000', // 500.00 BDT minimum
          commissionBps: 800, // 8%
        }),
      };

      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      };

      mockDataSource = {
        transaction: vi.fn(),
      };

      payoutsService = new PayoutsService(
        mockPayoutRepo,
        mockAccountRepo,
        mockSettlementRepo,
        mockAdjustmentRepo,
        mockEscrowRepo,
        mockLedgerService,
        mockCommissionPolicyService,
        mockAuditService,
        undefined,
        mockDataSource,
      );
    });

    it('INVARIANT: Rejects payout request below minimum threshold (50,000 poisha)', async () => {
      await expect(
        payoutsService.requestPayout(tutorUser, {
          amountMinor: '25000', // 250 BDT, below 500 BDT minimum
          method: 'bkash',
          accountReference: '01712345678',
          idempotencyKey: 'payout-idem-1',
        }),
      ).rejects.toThrow(/Minimum payout is 50000 poisha/);
    });

    it('INVARIANT: Rejects payout request exceeding tutor available balance', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mgr = {
          findOne: vi.fn()
            .mockResolvedValueOnce(null) // idempotency check: no existing payout
            .mockResolvedValueOnce({ tutorUserId: tutorUser.id, reservedMinor: '0' }), // locked account
          createQueryBuilder: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnThis(),
            into: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            orIgnore: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue({}),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getRawOne: vi.fn()
              .mockResolvedValueOnce({ balance: '60000' }) // payable = 600 BDT
              .mockResolvedValueOnce({ total: '0' }), // reserved = 0
          }),
        };
        return cb(mgr);
      });

      await expect(
        payoutsService.requestPayout(tutorUser, {
          amountMinor: '100000', // Requesting 1000 BDT when only 600 BDT available
          method: 'bkash',
          accountReference: '01712345678',
          idempotencyKey: 'payout-idem-2',
        }),
      ).rejects.toThrow(/Payout amount exceeds available balance/);
    });

    it('SUCCESS: Allows payout request within available funds and records audit log', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mgr = {
          findOne: vi.fn()
            .mockResolvedValueOnce(null) // no existing idempotency match
            .mockResolvedValueOnce({ tutorUserId: tutorUser.id, reservedMinor: '0' }), // locked account
          createQueryBuilder: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnThis(),
            into: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            orIgnore: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue({}),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getRawOne: vi.fn()
              .mockResolvedValueOnce({ balance: '200000' }) // ledger payable = 2000 BDT
              .mockResolvedValueOnce({ total: '0' }), // active payout sum = 0
          }),
          query: vi.fn().mockResolvedValue([{ nextval: '101' }]),
          create: vi.fn().mockImplementation((_entity, d) => ({
            id: 'payout-uuid-1',
            ...d,
          })),
          save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
        };
        return cb(mgr);
      });

      const payout = await payoutsService.requestPayout(tutorUser, {
        amountMinor: '80000', // 800 BDT
        method: 'bkash',
        accountReference: '01712345678',
        idempotencyKey: 'payout-idem-3',
      });

      expect(payout.amountMinor).toBe('80000');
      expect(payout.status).toBe('requested');
      expect(payout.method).toBe('bkash');
      expect(payout.accountReferenceMasked).toContain('***');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: tutorUser.id,
          action: 'finance.payout_requested',
          resourceType: 'payouts',
        }),
      );
    });
  });

  describe('3. Escrow Milestone Settlement & Commission Invariants (SettlementService)', () => {
    let settlementService: SettlementService;
    let mockSessionRepo: any;
    let mockOrderRepo: any;
    let mockTransactionRepo: any;
    let mockEscrowRepo: any;
    let mockSettlementRepo: any;
    let mockRefundRepo: any;
    let mockPayoutRepo: any;
    let mockReconciliationRepo: any;
    let mockLedgerService: any;
    let mockAuditService: any;
    let mockDataSource: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockSessionRepo = {
        findOne: vi.fn(),
      };

      mockOrderRepo = {};
      mockTransactionRepo = {};
      mockEscrowRepo = {
        findOne: vi.fn(),
      };
      mockSettlementRepo = {
        findOne: vi.fn(),
        create: vi.fn().mockImplementation((d) => ({ id: 'settle-1', ...d })),
        save: vi.fn().mockImplementation((d) => Promise.resolve(d)),
      };
      mockRefundRepo = {};
      mockPayoutRepo = {};
      mockReconciliationRepo = {};

      mockLedgerService = {
        postJournal: vi.fn().mockResolvedValue({ id: 'journal-settlement-1' }),
      };

      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-settlement-1' }),
      };

      mockDataSource = {
        transaction: vi.fn(),
      };

      settlementService = new SettlementService(
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
      );
    });

    it('INVARIANT: Rejects settlement if session is not in completed status', async () => {
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mgr = {
          findOne: vi.fn().mockResolvedValue({
            id: 'session-scheduled',
            status: 'scheduled', // not completed
          }),
        };
        return cb(mgr);
      });

      await expect(
        settlementService.settleMilestone(studentUser, {
          sessionId: 'session-scheduled',
        }),
      ).rejects.toThrow(/Only completed sessions can be settled/);
    });
  });
});
