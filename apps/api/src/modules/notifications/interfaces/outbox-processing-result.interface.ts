export interface OutboxProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
}
