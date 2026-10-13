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
  curriculumCode?: string | null;
  rateMinor?: string | null;
}

export interface PublicServiceAreaItem {
  id: string;
  districtCode: string;
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
  subjects!: PublicSubjectItem[];
  serviceAreas!: PublicServiceAreaItem[];
  availability!: PublicAvailabilityItem[];
}
