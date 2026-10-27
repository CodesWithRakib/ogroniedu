export interface SafetyViolationDetails {
  violationCodes: string[];
  reason: string;
  bookingId?: string;
  messageId?: string;
  severity?: 'warning' | 'severe';
}

export interface ISafetyEnforcementPort {
  handleViolationAndEnforce(userId: string, details: SafetyViolationDetails): Promise<any>;
}
