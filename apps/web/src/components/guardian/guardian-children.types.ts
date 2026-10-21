import type { Locale } from '@/lib/i18n';

export type GuardianRelationship = 'father' | 'mother' | 'legal_guardian';

/** Narrow the raw select value into the relationship union without asserting `any`. */
export function toGuardianRelationship(value: string): GuardianRelationship {
  return value === 'mother' || value === 'legal_guardian' ? value : 'father';
}

export interface ChildItem {
  linkId: string;
  studentId: string;
  displayName: string;
  relationshipType: 'father' | 'mother' | 'legal_guardian' | string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: string | null;
  isMinor: boolean;
  institutionName?: string | null;
  educationLevelName?: string | null;
  curriculumName?: string | null;
  stream?: string | null;
  learningGoals?: string | null;
}

export interface GuardianChildrenCallbacks {
  onAddChild?: (data: {
    studentIdentifier: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRegisterChild?: (data: {
    displayName: string;
    dateOfBirth?: string;
    gender?: string;
    institutionName?: string;
    educationLevelId?: string;
    curriculumId?: string;
    stream?: string;
    learningGoals?: string;
    email?: string;
    phone?: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRevokeLink?: (studentId: string) => Promise<void>;
}

export interface TaxonomyOption {
  id: string;
  nameEn: string;
  nameBn: string;
}

export interface GuardianChildrenManagerProps extends GuardianChildrenCallbacks {
  locale: Locale;
  initialChildren?: ChildItem[];
  educationLevels?: TaxonomyOption[];
  curricula?: TaxonomyOption[];
  streams?: TaxonomyOption[];
  institutions?: TaxonomyOption[];
}
