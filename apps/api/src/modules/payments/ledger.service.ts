import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  LedgerAccountEntity,
  LedgerJournalEntity,
  LedgerEntryEntity,
  LedgerDirection,
} from './entities';

export interface JournalEntryInput {
  accountCode: string;
  direction: LedgerDirection;
  amountMinor: number | string | bigint;
}

export interface PostJournalParams {
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  description: string;
  createdBy?: string | null;
  entries: JournalEntryInput[];
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerAccountEntity)
    private readonly accountRepo: Repository<LedgerAccountEntity>,
    @InjectRepository(LedgerJournalEntity)
    private readonly journalRepo: Repository<LedgerJournalEntity>,
    @InjectRepository(LedgerEntryEntity)
    private readonly entryRepo: Repository<LedgerEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Post an immutable double-entry journal ensuring debits equal credits
   */
  async postJournal(params: PostJournalParams): Promise<LedgerJournalEntity> {
    // 1. Idempotency Check (Prevent duplicate postings / replay)
    const existing = await this.journalRepo.findOne({
      where: { idempotencyKey: params.idempotencyKey },
      relations: { entries: { account: true } },
    });
    if (existing) {
      this.logger.log(`Idempotent journal returned for key: ${params.idempotencyKey}`);
      return existing;
    }

    if (!params.entries || params.entries.length < 2) {
      throw new BadRequestException('A double-entry journal requires at least two entry legs');
    }

    // 2. Mathematical Double-Entry Invariant: Debits === Credits
    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const leg of params.entries) {
      const amt = BigInt(leg.amountMinor);
      if (amt <= 0n) {
        throw new BadRequestException(`Entry amount must be strictly positive: ${leg.amountMinor}`);
      }

      if (leg.direction === 'debit') {
        totalDebits += amt;
      } else if (leg.direction === 'credit') {
        totalCredits += amt;
      } else {
        throw new BadRequestException(`Invalid direction: ${leg.direction}`);
      }
    }

    if (totalDebits !== totalCredits) {
      throw new BadRequestException(
        `Double-entry invariant violated: debits (${totalDebits}) do not equal credits (${totalCredits})`,
      );
    }

    // 3. Resolve accounts from database catalog
    const accountCodes = Array.from(new Set(params.entries.map((e) => e.accountCode)));
    const accounts = await this.accountRepo.find({
      where: accountCodes.map((code) => ({ code, isActive: true })),
    });

    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    for (const code of accountCodes) {
      if (!accountMap.has(code)) {
        throw new BadRequestException(`Ledger account ${code} does not exist or is inactive`);
      }
    }

    // 4. Save journal and entries atomically in transaction
    return this.dataSource.transaction(async (manager) => {
      const journal = manager.create(LedgerJournalEntity, {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
        createdBy: params.createdBy ?? null,
      });

      const savedJournal = await manager.save(journal);

      const entryEntities = params.entries.map((leg) => {
        const account = accountMap.get(leg.accountCode)!;
        return manager.create(LedgerEntryEntity, {
          journalId: savedJournal.id,
          accountId: account.id,
          direction: leg.direction,
          amountMinor: leg.amountMinor.toString(),
          currency: account.currency,
        });
      });

      await manager.save(entryEntities);

      savedJournal.entries = entryEntities;
      this.logger.log(
        `Posted balanced double-entry journal ${savedJournal.id} (${params.sourceType}): ${totalDebits} poisha`,
      );
      return savedJournal;
    });
  }

  /**
   * Calculate account balance based on accounting equation
   */
  async getAccountBalance(accountCode: string): Promise<bigint> {
    const account = await this.accountRepo.findOne({ where: { code: accountCode } });
    if (!account) {
      throw new BadRequestException(`Account ${accountCode} not found`);
    }

    const entries = await this.entryRepo.find({ where: { accountId: account.id } });

    let debits = 0n;
    let credits = 0n;

    for (const e of entries) {
      const amt = BigInt(e.amountMinor);
      if (e.direction === 'debit') {
        debits += amt;
      } else {
        credits += amt;
      }
    }

    // Asset & Expense normal balance = Debit
    // Liability, Equity, Revenue normal balance = Credit
    if (account.accountType === 'asset' || account.accountType === 'expense') {
      return debits - credits;
    } else {
      return credits - debits;
    }
  }

  /**
   * System-wide ledger integrity check: Debits must equal Credits across all entries
   */
  async verifySystemLedgerIntegrity(): Promise<{
    isBalanced: boolean;
    totalDebits: bigint;
    totalCredits: bigint;
    discrepancy: bigint;
  }> {
    const allEntries = await this.entryRepo.find();
    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const e of allEntries) {
      const amt = BigInt(e.amountMinor);
      if (e.direction === 'debit') {
        totalDebits += amt;
      } else {
        totalCredits += amt;
      }
    }

    const discrepancy = totalDebits - totalCredits;
    return {
      isBalanced: discrepancy === 0n,
      totalDebits,
      totalCredits,
      discrepancy,
    };
  }

  /**
   * Run full operational reconciliation with per-account balances and discrepancy detection
   */
  async runReconciliation(): Promise<{
    isBalanced: boolean;
    totalDebits: string;
    totalCredits: string;
    discrepancy: string;
    accounts: Array<{
      code: string;
      name: string;
      accountType: string;
      balance: string;
    }>;
    status: 'reconciled' | 'discrepancy_detected';
    checkedAt: Date;
  }> {
    const integrity = await this.verifySystemLedgerIntegrity();
    const accounts = await this.accountRepo.find();
    const accountBalances = await Promise.all(
      accounts.map(async (acc) => {
        const bal = await this.getAccountBalance(acc.code);
        return {
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType,
          balance: bal.toString(),
        };
      }),
    );

    return {
      isBalanced: integrity.isBalanced,
      totalDebits: integrity.totalDebits.toString(),
      totalCredits: integrity.totalCredits.toString(),
      discrepancy: integrity.discrepancy.toString(),
      accounts: accountBalances,
      status: integrity.isBalanced ? 'reconciled' : 'discrepancy_detected',
      checkedAt: new Date(),
    };
  }
}
