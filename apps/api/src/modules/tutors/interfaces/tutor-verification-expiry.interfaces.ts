export interface VerificationExpirySweepResult {
  scannedAt: string;
  expiredLevels: number;
  expiredDocuments: number;
  remindersSent: number;
  alreadyNotified: number;
  notifiedTutors: string[];
  failures: Array<{ subject: string; reason: string }>;
}
