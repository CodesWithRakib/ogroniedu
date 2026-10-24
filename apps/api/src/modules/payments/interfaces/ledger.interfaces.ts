import type { LedgerDirection } from '../entities';

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
