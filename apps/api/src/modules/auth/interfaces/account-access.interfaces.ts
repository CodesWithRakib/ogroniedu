/** Minimal trusted server-side account state used for token invalidation. */
export interface AccountAccessSnapshot {
  id: string;
  status: string;
  authEpoch: number;
}
