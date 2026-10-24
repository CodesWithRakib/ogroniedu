/** Minimal booking shape needed for learning authorization. */
export interface LearningBookingScope {
  id: string;
  tutorUserId: string;
  studentUserId: string;
  requesterUserId: string;
}
