import { PublicSubjectItem, PublicServiceAreaItem } from './tutor-public-profile.dto';

export interface TutorSearchResultItemDto {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
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
}

export interface SearchTutorsResponseDto {
  data: TutorSearchResultItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
