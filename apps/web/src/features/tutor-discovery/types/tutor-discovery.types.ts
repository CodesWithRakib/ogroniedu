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
  subjects: SubjectItem[];
  serviceAreas?: Array<{ districtNameEn: string; districtNameBn: string }>;
}

export interface SearchCatalogResponse {
  data: TutorCardData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TutorSortKey = 'recommended' | 'price_asc' | 'price_desc' | 'experience_desc';

export interface SearchFilters {
  q?: string;
  subjectId?: string;
  educationLevelId?: string;
  curriculumId?: string;
  mode?: string;
  minPrice?: number;
  maxPrice?: number;
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
