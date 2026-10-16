/**
 * Client-side field schema for user-submittable onboarding steps.
 *
 * The backend remains authoritative: these fields only produce the payload, and
 * every value is re-validated server-side by `onboarding-validators.ts`.
 */

export type StepFieldKind = 'text' | 'textarea' | 'number' | 'checkbox';

export interface StepField {
  name: string;
  labelBn: string;
  labelEn: string;
  kind: StepFieldKind;
  required: boolean;
  placeholder?: string;
}

export const STEP_FIELDS: Record<string, StepField[]> = {
  profile: [], // role-specific; resolved by fieldsForStep
  learning_preferences: [
    {
      name: 'preferredLocale',
      labelBn: 'পছন্দের ভাষা',
      labelEn: 'Preferred language',
      kind: 'text',
      required: true,
      placeholder: 'bn / en',
    },
  ],
  security_setup: [
    {
      name: 'acknowledgePolicy',
      labelBn: 'আমি নিরাপত্তা নীতি ও ব্যবহারের শর্তাবলী মেনে নিচ্ছি',
      labelEn: 'I acknowledge the security policy and acceptable-use terms',
      kind: 'checkbox',
      required: true,
    },
  ],
};

const STUDENT_PROFILE_FIELDS: StepField[] = [
  {
    name: 'institutionName',
    labelBn: 'শিক্ষা প্রতিষ্ঠান',
    labelEn: 'Institution',
    kind: 'text',
    required: true,
    placeholder: 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ',
  },
  {
    name: 'learningGoals',
    labelBn: 'শেখার লক্ষ্য (ঐচ্ছিক)',
    labelEn: 'Learning goals (optional)',
    kind: 'textarea',
    required: false,
  },
];

const GUARDIAN_PROFILE_FIELDS: StepField[] = [
  {
    name: 'relationshipType',
    labelBn: 'সম্পর্ক',
    labelEn: 'Relationship',
    kind: 'text',
    required: true,
    placeholder: 'father / mother / legal_guardian',
  },
];

const TUTOR_PROFILE_FIELDS: StepField[] = [
  { name: 'headline', labelBn: 'শিরোনাম', labelEn: 'Headline', kind: 'text', required: true },
  { name: 'bio', labelBn: 'পরিচিতি', labelEn: 'Biography', kind: 'textarea', required: true },
  {
    name: 'yearsExperience',
    labelBn: 'অভিজ্ঞতা (বছর)',
    labelEn: 'Years of experience',
    kind: 'number',
    required: false,
  },
];

const TUTOR_EDUCATION_FIELDS: StepField[] = [
  {
    name: 'title',
    labelBn: 'ডিগ্রি/যোগ্যতা',
    labelEn: 'Qualification title',
    kind: 'text',
    required: true,
  },
  {
    name: 'type',
    labelBn: 'ধরন',
    labelEn: 'Type',
    kind: 'text',
    required: true,
    placeholder: 'degree / academic_certificate',
  },
  {
    name: 'institution',
    labelBn: 'প্রতিষ্ঠান',
    labelEn: 'Institution',
    kind: 'text',
    required: false,
  },
  { name: 'issuedYear', labelBn: 'সন', labelEn: 'Year', kind: 'number', required: false },
];

const TUTOR_DOCUMENTS_FIELDS: StepField[] = [
  {
    name: 'fileAssetId',
    labelBn: 'ফাইল আইডি',
    labelEn: 'File asset ID',
    kind: 'text',
    required: true,
  },
  {
    name: 'documentType',
    labelBn: 'নথির ধরন',
    labelEn: 'Document type',
    kind: 'text',
    required: true,
    placeholder: 'nid / degree',
  },
];

const ORGANIZATION_PROFILE_FIELDS: StepField[] = [
  {
    name: 'organizationName',
    labelBn: 'প্রতিষ্ঠানের নাম',
    labelEn: 'Organization name',
    kind: 'text',
    required: true,
  },
];

/** Resolve the fields for a step, taking the role track into account. */
export function fieldsForStep(role: string | null, stepKey: string): StepField[] {
  if (stepKey === 'profile') {
    if (role === 'student') return STUDENT_PROFILE_FIELDS;
    if (role === 'guardian') return GUARDIAN_PROFILE_FIELDS;
    if (role === 'tutor') return TUTOR_PROFILE_FIELDS;
    return [];
  }
  if (stepKey === 'education') return TUTOR_EDUCATION_FIELDS;
  if (stepKey === 'documents') return TUTOR_DOCUMENTS_FIELDS;
  if (stepKey === 'organization_profile') return ORGANIZATION_PROFILE_FIELDS;
  return STEP_FIELDS[stepKey] ?? [];
}

function toNumberOrUndefined(value: string | boolean): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Build the server payload from raw form values. Array-shaped steps are wrapped
 * into the collection shape the backend validators expect.
 */
export function buildStepPayload(
  stepKey: string,
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const text = (name: string): string | undefined => {
    const value = values[name];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  };

  if (stepKey === 'education') {
    return {
      qualifications: [
        {
          title: text('title'),
          type: text('type'),
          institution: text('institution'),
          issuedYear: toNumberOrUndefined(values.issuedYear ?? ''),
        },
      ],
    };
  }

  if (stepKey === 'documents') {
    return {
      documents: [
        {
          fileAssetId: text('fileAssetId'),
          documentType: text('documentType'),
        },
      ],
    };
  }

  if (stepKey === 'security_setup') {
    return { acknowledgePolicy: values.acknowledgePolicy === true };
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') continue;
    payload[key] = value;
  }
  return payload;
}
