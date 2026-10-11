export interface ServiceAgreementSnapshot {
  message?: string;
  scheduleNotes?: string;
  preferredDays?: number[];
  hourlyRateMinor?: string | number;
  sessionDurationMinutes?: number;
  declinedReason?: string;
  withdrawnReason?: string;
  [key: string]: unknown;
}
