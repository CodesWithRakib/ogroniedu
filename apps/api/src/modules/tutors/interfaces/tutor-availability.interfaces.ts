export interface AvailabilitySlotInput {
  weekday: number;
  startLocal: string;
  endLocal: string;
  timezone?: string;
}

export interface BlockedPeriodInput {
  startsAt: string;
  endsAt: string;
  timezone?: string;
  reason?: string;
}
