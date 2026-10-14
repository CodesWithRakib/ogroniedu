export interface PlatformStats {
  /** Tutors with approved verification and a published profile. */
  verifiedTutors: number;
  /** Users holding an active student role grant. */
  activeStudents: number;
  /** Sessions completed on the platform. */
  completedSessions: number;
  /** Mean review rating (1–5, one decimal) or null when no reviews exist yet. */
  averageRating: number | null;
}
