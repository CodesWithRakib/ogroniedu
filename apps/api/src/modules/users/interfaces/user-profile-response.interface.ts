export interface UserProfileResponse {
  id: string;
  email: string | null;
  phoneE164: string | null;
  displayName: string;
  preferredLocale: 'bn' | 'en';
  status: string;
  roles: string[];
  isMinor: boolean;
  hasGuardian?: boolean;
  isStandalone?: boolean;
  guardianInfo?: {
    id: string;
    guardianUserId: string;
    guardianName: string;
    guardianEmail: string | null;
    guardianPhone: string | null;
  } | null;
  studentProfile?: {
    dateOfBirth: string | null;
    educationLevelId: string | null;
    curriculumId: string | null;
    institutionName: string | null;
    stream: string | null;
    districtCode: string | null;
    upazilaCode: string | null;
    learningGoals: string | null;
    profileVisibility: 'private' | 'limited';
  } | null;
  createdAt: Date;
}
