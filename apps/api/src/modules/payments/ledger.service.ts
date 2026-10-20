import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
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
  /** Optional party attribution, used for per-tutor payable balances. */
  tutorUserId?: string | null;
}

export interface PostJournalParams {
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  description: string;
  createdBy?: string | null;
  entries: JournalEntryInput[];
}

export interface LedgerIntegrityResult {
  isBalanced: boolean;
  totalDebits: bigint;
  totalCredits: bigint;
  discrepancy: bigint;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Post an immutable double-entry journal ensuring debits equal credits.
   *
   * Pass `manager` to participate in a caller-owned transaction. Financial
   * mutations (payment, refund, settlement, payout) do this so the business
   * row and the journal commit or roll back together.
   */
  async postJournal(
    params: PostJournalParams,
    manager?: EntityManager,
  ): Promise<LedgerJournalEntity> {
    const journalRepo = manager
      ? manager.getRepository(LedgerJournalEntity)
      : this.journalRepo;
    const accountRepo = manager ? manager.getRepository(LedgerAccountEntity) : this.accountRepo;

    // 1. Idempotency check (fast path).
    const existing = await journalRepo.findOne({
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

    // 2. Mathematical invariant: debits === credits.
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

    // 3. Resolve accounts from the database catalog.
    const accountCodes = Array.from(new Set(params.entries.map((e) => e.accountCode)));
    const accounts = await accountRepo.find({
      where: accountCodes.map((code) => ({ code, isActive: true })),
    });
    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    for (const code of accountCodes) {
      if (!accountMap.has(code)) {
        throw new BadRequestException(`Ledger account ${code} does not exist or is inactive`);
      }
    }

    const write = async (mgr: EntityManager): Promise<LedgerJournalEntity> => {
      // Re-check inside the transaction to close the pre-check race. The unique
      // index is still the final authority; the catch below handles it.
      const raced = await mgr.getRepository(LedgerJournalEntity).findOne({
        where: { idempotencyKey: params.idempotencyKey },
        relations: { entries: { account: true } },
      });
      if (raced) return raced;

      const journal = mgr.create(LedgerJournalEntity, {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
        createdBy: params.createdBy ?? null,
      });

      const savedJournal = await mgr.save(journal);

      const entryEntities = params.entries.map((leg) => {
        const account = accountMap.get(leg.accountCode)!;
        return mgr.create(LedgerEntryEntity, {
          journalId: savedJournal.id,
          accountId: account.id,
          direction: leg.direction,
          amountMinor: leg.amountMinor.toString(),
          currency: account.currency,
          tutorUserId: leg.tutorUserId ?? null,
        });
      });

      await mgr.save(entryEntities);
      savedJournal.entries = entryEntities;

      this.logger.log(
        `Posted balanced double-entry journal ${savedJournal.id} (${params.sourceType}): ${totalDebits} poisha`,
      );
      return savedJournal;
    };

    try {
      if (manager) return await write(manager);
      return await this.dataSource.transaction(write);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const winner = await this.journalRepo.findOne({
          where: { idempotencyKey: params.idempotencyKey },
          relations: { entries: { account: true } },
        });
        if (winner) {
          this.logger.log(`Concurrent duplicate journal collapsed for key: ${params.idempotencyKey}`);
          return winner;
        }
      }
      throw error;
    }
  }

  /**
   * Account balance using the accounting equation. When `tutorUserId` is
   * supplied only that party's entries are counted (used for tutor payable).
   */
  async getAccountBalance(accountCode: string, tutorUserId?: string): Promise<bigint> {
    const account = await this.accountRepo.findOne({ where: { code: accountCode } });
    if (!account) {
      throw new BadRequestException(`Account ${accountCode} not found`);
    }

    const entries = await this.entryRepo.find({
      where: {
        accountId: account.id,
        ...(tutorUserId ? { tutorUserId } : {}),
      },
    });

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

    // Asset & expense normal balance = debit; liability/equity/revenue = credit.
    if (account.accountType === 'asset' || account.accountType === 'expense') {
      return debits - credits;
    }
    return credits - debits;
  }

  /** Per-tutor balance for an account (normally 2000 Tutor Earnings Payable). */
  async getPartyBalance(accountCode: string, tutorUserId: string): Promise<bigint> {
    return this.getAccountBalance(accountCode, tutorUserId);
  }

  /** System-wide integrity check: debits must equal credits across all entries. */
  async verifySystemLedgerIntegrity(): Promise<LedgerIntegrityResult> {
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

  /** Full operational reconciliation: per-account balances plus integrity. */
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
