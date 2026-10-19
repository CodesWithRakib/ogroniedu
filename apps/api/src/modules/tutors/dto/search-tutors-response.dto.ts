import { PublicSubjectItem, PublicServiceAreaItem } from './tutor-public-profile.dto';

export interface TutorSearchResultItemDto {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  /** English headline (legacy field). */
  headline: string | null;
  /** English biography (legacy field). */
  bio: string | null;
  headlineEn: string | null;
  /** Null when the tutor has not written a Bangla headline yet. */
  headlineBn: string | null;
  bioEn: string | null;
  /** Null when the tutor has not written a Bangla biography yet. */
  bioBn: string | null;
  yearsExperience: number | null;
  teachingModes: string[];
  hourlyRateMinor: string | null;
  currency: string;
  responseTimeMinutes: number | null;
  badges: string[];
  matchScore: number;
  rankingReasons: string[];
  subjects: PublicSubjectItem[];
  serviceAreas: PublicServiceAreaItem[];
  /** Straight-line km to the nearest supplied service-area centre; null when unknown. */
  distanceKm: number | null;
  /** Average of published reviews only; null when there are no published reviews. */
  ratingAverage: number | null;
  totalReviews: number;
  /** Next active weekday (0=Sun…6=Sat) with a slot, or null when unpublished. */
  nextAvailableWeekday: number | null;
}

export interface SearchTutorsResponseDto {
  data: TutorSearchResultItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
