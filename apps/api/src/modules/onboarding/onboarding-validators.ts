/**
 * Pure onboarding step validators.
 *
 * Each validator receives the untrusted payload and returns a human-readable
 * error message, or `null` when the payload is acceptable. They are pure and
 * dependency-free so they can be unit-tested and reused by the service without
 * touching the database.
 */

export type OnboardingStepValidatorKey =
  | 'none'
  | 'student_profile'
  | 'learning_preferences'
  | 'guardian_profile'
  | 'tutor_profile'
  | 'tutor_education'
  | 'tutor_documents'
  | 'security_setup'
  | 'organization_profile';

export type OnboardingPayloadValidator = (payload: unknown) => string | null;

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

function nonEmptyString(value: unknown, min = 1): value is string {
  return typeof value === 'string' && value.trim().length >= min;
}

const STUDENT_PROFILE: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  const hasInstitution = nonEmptyString(record.institutionName, 2);
  const hasLevel = nonEmptyString(record.educationLevelId, 8);
  if (!hasInstitution && !hasLevel) {
    return 'provide an institution name or an education level';
  }
  return null;
};

const LEARNING_PREFERENCES: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  const locale = record.preferredLocale;
  if (locale !== undefined && locale !== 'bn' && locale !== 'en') {
    return 'preferredLocale must be one of: bn, en';
  }
  const subjects = record.subjects;
  if (subjects !== undefined && !Array.isArray(subjects)) {
    return 'subjects must be an array';
  }
  return null;
};

const GUARDIAN_PROFILE: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  if (record.relationshipType !== undefined && !nonEmptyString(record.relationshipType, 2)) {
    return 'relationshipType must be at least 2 characters';
  }
  return null;
};

const TUTOR_PROFILE: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  if (!nonEmptyString(record.headline, 5)) {
    return 'headline must be at least 5 characters';
  }
  if (!nonEmptyString(record.bio, 20)) {
    return 'bio must be at least 20 characters';
  }
  if (record.yearsExperience !== undefined) {
    const years = Number(record.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      return 'yearsExperience must be an integer between 0 and 60';
    }
  }
  return null;
};

const TUTOR_EDUCATION: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  const qualifications = record.qualifications;
  if (!Array.isArray(qualifications) || qualifications.length === 0) {
    return 'at least one qualification is required';
  }
  for (const item of qualifications) {
    const entry = asRecord(item);
    if (!entry) return 'each qualification must be an object';
    if (!nonEmptyString(entry.type, 2)) return 'each qualification needs a type';
    if (!nonEmptyString(entry.title, 2)) return 'each qualification needs a title';
  }
  return null;
};

const TUTOR_DOCUMENTS: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  const documents = record.documents;
  if (!Array.isArray(documents) || documents.length === 0) {
    return 'at least one verification document reference is required';
  }
  for (const item of documents) {
    const entry = asRecord(item);
    if (!entry) return 'each document must be an object';
    if (!nonEmptyString(entry.fileAssetId, 8)) return 'each document needs a fileAssetId';
    if (!nonEmptyString(entry.documentType, 2)) return 'each document needs a documentType';
  }
  return null;
};

const SECURITY_SETUP: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  if (record.acknowledgePolicy !== true) {
    return 'you must acknowledge the platform security policy';
  }
  return null;
};

const ORGANIZATION_PROFILE: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';
  if (!nonEmptyString(record.organizationName, 2)) {
    return 'organizationName must be at least 2 characters';
  }
  return null;
};

export const ONBOARDING_PAYLOAD_VALIDATORS: Record<
  OnboardingStepValidatorKey,
  OnboardingPayloadValidator
> = {
  none: () => null,
  student_profile: STUDENT_PROFILE,
  learning_preferences: LEARNING_PREFERENCES,
  guardian_profile: GUARDIAN_PROFILE,
  tutor_profile: TUTOR_PROFILE,
  tutor_education: TUTOR_EDUCATION,
  tutor_documents: TUTOR_DOCUMENTS,
  security_setup: SECURITY_SETUP,
  organization_profile: ORGANIZATION_PROFILE,
};

export function validateOnboardingPayload(
  key: OnboardingStepValidatorKey,
  payload: unknown,
): string | null {
  const validator = ONBOARDING_PAYLOAD_VALIDATORS[key];
  if (!validator) return 'unknown onboarding step';
  return validator(payload);
}
