export interface LinkedChildSummary {
  linkId: string;
  studentId: string;
  displayName: string;
  studentCode?: string | null;
  relationshipType: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: Date | null;
  isMinor: boolean;
  institutionName?: string | null;
  educationLevelName?: string | null;
  studentProfile: {
    studentCode?: string | null;
    dateOfBirth: string | null;
    educationLevelId: string | null;
    curriculumId: string | null;
    institutionName: string | null;
    stream: string | null;
    learningGoals: string | null;
  } | null;
}
