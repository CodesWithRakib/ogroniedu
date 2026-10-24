export interface BookingExpirySweepResult {
  expiredRequests: number;
  expiredPayments: number;
  totalExpired: number;
  skippedDueToLock?: boolean;
}
