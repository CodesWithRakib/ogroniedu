export interface PublicSubjectItem {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectNameEn: string;
  subjectNameBn: string;
  educationLevelId: string;
  educationLevelCode: string;
  educationLevelNameEn: string;
  educationLevelNameBn: string;
  curriculumId?: string | null;
  curriculumCode?: string | null;
  curriculumNameEn?: string | null;
  curriculumNameBn?: string | null;
  rateMinor?: string | null;
}

export interface PublicServiceAreaItem {
  id: string;
  districtCode: string;
  districtNameEn: string;
  districtNameBn: string;
  upazilaCode?: string | null;
  localityName?: string | null;
  radiusKm?: number | null;
}

export interface PublicAvailabilityItem {
  weekday: number;
  startLocal: string;
  endLocal: string;
  timezone: string;
}

export interface PublicQualificationItem {
  id: string;
  qualificationType: string;
  institution: string | null;
  title: string;
  issuedYear?: number | null;
  isVerified: boolean;
}

export class TutorPublicProfileDto {
  id!: string;
  displayName!: string;
  headline!: string | null;
  bio!: string | null;
  yearsExperience!: number | null;
  teachingModes!: string[];
  hourlyRateMinor!: string | null;
  currency!: string;
  responseTimeMinutes!: number | null;
  badges!: string[]; // Only checks actually performed (e.g. 'verified_identity', 'verified_academic')
  qualifications!: PublicQualificationItem[];
  subjects!: PublicSubjectItem[];
  serviceAreas!: PublicServiceAreaItem[];
  availability!: PublicAvailabilityItem[];
  /** Average of published reviews only; null when no published review exists. */
  ratingAverage!: number | null;
  totalReviews!: number;
  /** Completed bookings only — never a fabrication or platform-wide count. */
  completedSessions!: number;
  nextAvailableWeekday!: number | null;
}
