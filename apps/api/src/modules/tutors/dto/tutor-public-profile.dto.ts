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
  localityNameEn?: string | null;
  localityNameBn?: string | null;
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
  institutionEn?: string | null;
  institutionBn?: string | null;
  titleEn: string;
  titleBn?: string | null;
  issuedYear?: number | null;
  isVerified: boolean;
}

export class TutorPublicProfileDto {
  id!: string;
  displayNameEn!: string;
  displayNameBn?: string | null;
  avatarUrl!: string | null;
  headlineEn!: string | null;
  /** Null when the tutor has not written a Bangla headline yet. */
  headlineBn!: string | null;
  bioEn!: string | null;
  /** Null when the tutor has not written a Bangla biography yet. */
  bioBn!: string | null;
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
