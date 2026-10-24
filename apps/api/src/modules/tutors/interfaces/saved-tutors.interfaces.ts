import type { TutorPublicProfileDto } from '../dto';

export interface SavedTutorItemDto {
  tutorId: string;
  savedAt: string;
  /** Null when the tutor is no longer publicly discoverable. */
  profile: TutorPublicProfileDto | null;
}
