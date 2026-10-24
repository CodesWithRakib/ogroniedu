/** Structural booking parties needed for access checks (entity or subset). */
export interface BookingParties {
  tutorUserId: string | null;
  requesterUserId: string;
  studentUserId: string;
}
