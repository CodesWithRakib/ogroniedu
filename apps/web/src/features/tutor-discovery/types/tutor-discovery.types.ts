export interface SubjectItem {
  id: string;
  subjectId: string;
  subjectNameEn: string;
  subjectNameBn: string;
  educationLevelNameEn?: string;
  educationLevelNameBn?: string;
  curriculumNameEn?: string;
  curriculumNameBn?: string;
  rateMinor?: string | null;
}

export interface TutorCardData {
  id: string;
  displayNameEn?: string | null;
  displayNameBn?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  headlineEn?: string | null;
  /** Null when the tutor has not written Bangla copy yet. */
  headlineBn?: string | null;
  bioEn?: string | null;
  bioBn?: string | null;
  /** Legacy English fallback */
  headline?: string | null;
  bio?: string | null;
  yearsExperience: number | null;
  teachingModes: string[];
  hourlyRateMinor: string | null;
  currency: string;
  responseTimeMinutes: number | null;
  badges: string[];
  matchScore: number;
  rankingReasons: string[];
  subjects: SubjectItem[];
  serviceAreas?: Array<{
    districtCode?: string;
    districtNameEn: string;
    districtNameBn: string;
    localityNameEn?: string | null;
    localityNameBn?: string | null;
  }>;
  distanceKm?: number | null;
  /** Null when the tutor has no published review — never rendered as 0. */
  ratingAverage?: number | null;
  totalReviews?: number;
  nextAvailableWeekday?: number | null;
}

export interface SearchCatalogResponse {
  data: TutorCardData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TutorSortKey =
  'recommended' | 'nearest' | 'price_asc' | 'price_desc' | 'experience_desc' | 'rating_desc';

export interface SearchFilters {
  q?: string;
  subjectId?: string;
  educationLevelId?: string;
  curriculumId?: string;
  districtCode?: string;
  mode?: string;
  minPrice?: number;
  maxPrice?: number;
  minExperience?: number;
  availableWeekday?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: TutorSortKey;
  page?: number;
}

export interface OptionItem {
  id: string;
  label: string;
}

export interface BookingRequestPayload {
  tutorId: string;
  studentId: string;
  subjectId: string;
  educationLevelId: string;
  mode: 'in_person' | 'online' | 'hybrid';
  messageNotes?: string;
  preferredDays?: string[];
}

/** Empty catalog: used so the UI renders a genuine empty state, never fake tutors. */
export const EMPTY_CATALOG: SearchCatalogResponse = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  data: [],
};

export const WEEKDAY_LABELS: Record<number, { en: string; bn: string }> = {
  0: { en: 'Sunday', bn: 'রবিবার' },
  1: { en: 'Monday', bn: 'সোমবার' },
  2: { en: 'Tuesday', bn: 'মঙ্গলবার' },
  3: { en: 'Wednesday', bn: 'বুধবার' },
  4: { en: 'Thursday', bn: 'বৃহস্পতিবার' },
  5: { en: 'Friday', bn: 'শুক্রবার' },
  6: { en: 'Saturday', bn: 'শনিবার' },
};
