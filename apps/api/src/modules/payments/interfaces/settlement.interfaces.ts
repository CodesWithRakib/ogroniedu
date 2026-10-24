export interface ReconciliationReport {
  runId: string | null;
  reconciledAt: string;
  totalOrders: number;
  succeededOrders: number;
  totalTransactions: number;
  totalRefunds: number;
  totalPayouts: number;
  isLedgerBalanced: boolean;
  ledgerTotalDebitsPoisha: string;
  ledgerTotalCreditsPoisha: string;
  unreconciledDiscrepancies: Array<{ reference: string; reason: string }>;
}
