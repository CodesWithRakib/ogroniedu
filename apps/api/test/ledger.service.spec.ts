import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { BadRequestException } from '@nestjs/common';
import {
  LedgerAccountEntity,
  LedgerJournalEntity,
  LedgerEntryEntity,
} from '../src/modules/payments/entities';

describe('LedgerService Unit & Invariant Tests (Double-Entry Financial Accounting)', () => {
  let service: LedgerService;
  let mockAccountRepo: any;
  let mockJournalRepo: any;
  let mockEntryRepo: any;
  let mockDataSource: any;

  const mockAccounts: LedgerAccountEntity[] = [
    {
      id: 'acc-1000',
      code: '1000',
      name: 'Escrow Holding Pool',
      accountType: 'asset',
      currency: 'BDT',
      isActive: true,
    },
    {
      id: 'acc-2000',
      code: '2000',
      name: 'Tutor Earnings Payable Liability',
      accountType: 'liability',
      currency: 'BDT',
      isActive: true,
    },
    {
      id: 'acc-2100',
      code: '2100',
      name: 'Student Advance Escrow Deposit Liability',
      accountType: 'liability',
      currency: 'BDT',
      isActive: true,
    },
    {
      id: 'acc-4000',
      code: '4000',
      name: 'Tutoring Platform Service Fee Revenue',
      accountType: 'revenue',
      currency: 'BDT',
      isActive: true,
    },
  ];

  beforeEach(() => {
    mockAccountRepo = {
      find: vi.fn().mockImplementation((query) => {
        const codes = query?.where?.map((w: any) => w.code) || [];
        return Promise.resolve(mockAccounts.filter((a) => codes.includes(a.code)));
      }),
      findOne: vi.fn().mockImplementation((query) => {
        return Promise.resolve(mockAccounts.find((a) => a.code === query?.where?.code) || null);
      }),
    };

    mockJournalRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockEntryRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          create: vi.fn((entityClass, data) => ({ id: `gen-${Math.random()}`, ...data })),
          save: vi.fn((entity) => Promise.resolve(entity)),
        };
        return cb(mockManager);
      }),
    };

    service = new LedgerService(
      mockAccountRepo,
      mockJournalRepo,
      mockEntryRepo,
      mockDataSource,
    );
  });

  describe('Double-Entry Balance Invariant (Debits == Credits)', () => {
    it('should post a valid balanced journal with debits equal to credits', async () => {
      const journal = await service.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-123',
        idempotencyKey: 'idem-journal-1',
        description: 'Advance escrow deposit',
        entries: [
          { accountCode: '1000', direction: 'debit', amountMinor: 100000 }, // 1000 BDT
          { accountCode: '2100', direction: 'credit', amountMinor: 100000 },
        ],
      });

      expect(journal).toBeDefined();
      expect(journal.description).toBe('Advance escrow deposit');
      expect(journal.entries).toHaveLength(2);
    });

    it('FINANCIAL INVARIANT: should post multi-leg milestone settlement (92% tutor + 8% platform fee)', async () => {
      const totalAmount = 100000; // 1000 BDT in poisha
      const tutorShare = 92000; // 920 BDT
      const platformFee = 8000; // 80 BDT

      const journal = await service.postJournal({
        sourceType: 'session_milestone',
        sourceId: 'sess-123',
        idempotencyKey: 'idem-settle-1',
        description: 'Completed session milestone settlement',
        entries: [
          { accountCode: '2100', direction: 'debit', amountMinor: totalAmount },
          { accountCode: '2000', direction: 'credit', amountMinor: tutorShare },
          { accountCode: '4000', direction: 'credit', amountMinor: platformFee },
        ],
      });

      expect(journal.entries).toHaveLength(3);
    });

    it('NEGATIVE TEST: should reject unbalanced journal where debits do not equal credits', async () => {
      await expect(
        service.postJournal({
          sourceType: 'payment_order',
          sourceId: 'order-err',
          idempotencyKey: 'idem-unbalanced',
          description: 'Unbalanced journal attempt',
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: 100000 },
            { accountCode: '2100', direction: 'credit', amountMinor: 95000 }, // Discrepancy of 5000 poisha!
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject journal with zero or negative amounts', async () => {
      await expect(
        service.postJournal({
          sourceType: 'payment_order',
          sourceId: 'order-err',
          idempotencyKey: 'idem-zero',
          description: 'Zero amount journal',
          entries: [
            { accountCode: '1000', direction: 'debit', amountMinor: 0 },
            { accountCode: '2100', direction: 'credit', amountMinor: 0 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject journal with unknown or uncatalogued account code', async () => {
      await expect(
        service.postJournal({
          sourceType: 'payment_order',
          sourceId: 'order-err',
          idempotencyKey: 'idem-unknown-acc',
          description: 'Unknown account journal',
          entries: [
            { accountCode: '9999-NONEXISTENT', direction: 'debit', amountMinor: 10000 },
            { accountCode: '2100', direction: 'credit', amountMinor: 10000 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Idempotency & Replay Protection', () => {
    it('should return existing journal without creating duplicate entries when idempotencyKey matches', async () => {
      const existingJournal: any = {
        id: 'journal-existing-1',
        idempotencyKey: 'idem-repeat-key',
        description: 'Existing journal',
        entries: [],
      };
      mockJournalRepo.findOne.mockResolvedValue(existingJournal);

      const result = await service.postJournal({
        sourceType: 'payment_order',
        sourceId: 'order-123',
        idempotencyKey: 'idem-repeat-key',
        description: 'Duplicate post attempt',
        entries: [
          { accountCode: '1000', direction: 'debit', amountMinor: 10000 },
          { accountCode: '2100', direction: 'credit', amountMinor: 10000 },
        ],
      });

      expect(result.id).toBe('journal-existing-1');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('Account Balance & System Integrity', () => {
    it('should accurately calculate asset account balance (Debits - Credits)', async () => {
      mockEntryRepo.find.mockResolvedValue([
        { direction: 'debit', amountMinor: '150000' }, // +1500 BDT
        { direction: 'credit', amountMinor: '50000' }, // -500 BDT
      ]);

      const balance = await service.getAccountBalance('1000');
      expect(balance).toBe(100000n); // Net 1000 BDT (100,000 poisha)
    });

    it('should verify system-wide ledger integrity (total debits == total credits)', async () => {
      mockEntryRepo.find.mockResolvedValue([
        { direction: 'debit', amountMinor: '100000' },
        { direction: 'credit', amountMinor: '100000' },
      ]);

      const integrity = await service.verifySystemLedgerIntegrity();
      expect(integrity.isBalanced).toBe(true);
      expect(integrity.discrepancy).toBe(0n);
    });
  });
});
