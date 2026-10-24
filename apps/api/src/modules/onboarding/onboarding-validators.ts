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
  | 'tutor_subjects'
  | 'tutor_availability'
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

  // Bilingual profile copy. `headline`/`bio` are the legacy English fields.
  // Both languages are required so the public UI can show tutor-authored copy
  // in the visitor's language. Bangla is never auto-translated from English.
  const headlineEn = nonEmptyString(record.headlineEn, 5) || nonEmptyString(record.headline, 5);
  const bioEn = nonEmptyString(record.bioEn, 20) || nonEmptyString(record.bio, 20);
  if (!headlineEn) {
    return 'an English headline of at least 5 characters is required';
  }
  if (!nonEmptyString(record.headlineBn, 5)) {
    return 'a Bangla headline of at least 5 characters is required';
  }
  if (!bioEn) {
    return 'an English biography of at least 20 characters is required';
  }
  if (!nonEmptyString(record.bioBn, 20)) {
    return 'a Bangla biography of at least 20 characters is required';
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

  if (record.degree || record.title) {
    if (!nonEmptyString(record.degree ?? record.title, 2)) {
      return 'degree title is required';
    }
    return null;
  }

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

const TUTOR_SUBJECTS: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';

  if (record.subjectId && record.educationLevelId) {
    if (!nonEmptyString(record.subjectId, 8)) return 'subjectId is required';
    if (!nonEmptyString(record.educationLevelId, 8)) return 'educationLevelId is required';
    return null;
  }

  const subjects = record.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return 'at least one teaching subject is required';
  }
  for (const item of subjects) {
    const entry = asRecord(item);
    if (!entry) return 'each subject must be an object';
    if (!nonEmptyString(entry.subjectId, 8)) return 'each subject needs a valid subjectId';
    if (!nonEmptyString(entry.educationLevelId, 8)) return 'each subject needs an educationLevelId';
  }
  return null;
};

const TUTOR_AVAILABILITY: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';

  const slots = record.slots;
  if (!Array.isArray(slots) || slots.length === 0) {
    return 'at least one availability slot is required';
  }
  for (const item of slots) {
    const entry = asRecord(item);
    if (!entry) return 'each slot must be an object';
    if (typeof entry.weekday !== 'number' || entry.weekday < 0 || entry.weekday > 6) {
      return 'weekday must be an integer between 0 and 6';
    }
    if (!nonEmptyString(entry.startLocal, 4) || !nonEmptyString(entry.endLocal, 4)) {
      return 'startLocal and endLocal are required in format HH:mm';
    }
  }
  return null;
};

const TUTOR_DOCUMENTS: OnboardingPayloadValidator = (payload) => {
  const record = asRecord(payload);
  if (!record) return 'payload must be an object';

  if (record.fileAssetId && record.documentType) {
    if (!nonEmptyString(record.fileAssetId, 8)) return 'document needs a valid fileAssetId';
    if (!nonEmptyString(record.documentType, 2)) return 'document needs a documentType';
    return null;
  }

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
  tutor_subjects: TUTOR_SUBJECTS,
  tutor_availability: TUTOR_AVAILABILITY,
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
