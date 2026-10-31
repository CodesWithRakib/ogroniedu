import { OnboardingStepValidatorKey } from './onboarding-validators';

export interface OnboardingStepDefinition {
  key: string;
  titleEn: string;
  titleBn: string;
  /** Required before onboarding is considered complete. */
  required: boolean;
  /** The user may submit this step (moves it to review when approvalGated). */
  submittable: boolean;
  /** Completion is decided by review/monitoring, never by the user. */
  approvalGated: boolean;
  /** Satisfied by a trusted server-side record rather than user input. */
  systemVerified?: boolean;
  /** Pure payload validator key. */
  validator: OnboardingStepValidatorKey;
}

export interface RoleOnboardingDefinition {
  role: string;
  labelEn: string;
  labelBn: string;
  steps: OnboardingStepDefinition[];
}

/**
 * Role priority for picking the onboarding track when a user holds several
 * roles (privileged/most-constrained role first).
 */
export const ONBOARDING_ROLE_PRIORITY: readonly string[] = [
  'super_admin',
  'admin',
  'compliance_reviewer',
  'support_agent',
  'organization_owner',
  'organization_staff',
  'tutor',
  'guardian',
  'student',
];

const CONTACT_VERIFICATION_STEP: OnboardingStepDefinition = {
  key: 'contact_verification',
  titleEn: 'Verify your email or mobile number',
  titleBn: 'ইমেইল বা মোবাইল নম্বর যাচাই করুন',
  required: true,
  submittable: true,
  approvalGated: false,
  systemVerified: true,
  validator: 'none',
};

const SECURITY_SETUP_STEP: OnboardingStepDefinition = {
  key: 'security_setup',
  titleEn: 'Complete mandatory security setup',
  titleBn: 'বাধ্যতামূলক নিরাপত্তা সেটআপ সম্পন্ন করুন',
  required: true,
  submittable: true,
  approvalGated: false,
  validator: 'security_setup',
};

export const ONBOARDING_BY_ROLE: Record<string, RoleOnboardingDefinition> = {
  student: {
    role: 'student',
    labelEn: 'Student onboarding',
    labelBn: 'শিক্ষার্থী অনবোর্ডিং',
    steps: [
      CONTACT_VERIFICATION_STEP,
      {
        key: 'profile',
        titleEn: 'Set up your student profile',
        titleBn: 'শিক্ষার্থী প্রোফাইল সেট করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'student_profile',
      },
      {
        key: 'learning_preferences',
        titleEn: 'Choose learning preferences',
        titleBn: 'শেখার পছন্দ নির্বাচন করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'learning_preferences',
      },
    ],
  },
  guardian: {
    role: 'guardian',
    labelEn: 'Guardian onboarding',
    labelBn: 'অভিভাবক অনবোর্ডিং',
    steps: [
      CONTACT_VERIFICATION_STEP,
      {
        key: 'profile',
        titleEn: 'Complete your guardian profile',
        titleBn: 'অভিভাবক প্রোফাইল সম্পন্ন করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'guardian_profile',
      },
      {
        key: 'link_student',
        titleEn: 'Link a student you are responsible for',
        titleBn: 'আপনার দায়িত্বে থাকা শিক্ষার্থী লিংক করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        systemVerified: true,
        validator: 'none',
      },
    ],
  },
  tutor: {
    role: 'tutor',
    labelEn: 'Tutor onboarding',
    labelBn: 'শিক্ষক অনবোর্ডিং',
    steps: [
      CONTACT_VERIFICATION_STEP,
      {
        key: 'profile',
        titleEn: 'Write your teaching profile',
        titleBn: 'আপনার শিক্ষক প্রোফাইল লিখুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'tutor_profile',
      },
      {
        key: 'education',
        titleEn: 'Add your education history',
        titleBn: 'শিক্ষাগত তথ্য যোগ করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'tutor_education',
      },
      {
        key: 'subjects',
        titleEn: 'Add your teaching subjects',
        titleBn: 'পাঠদানের বিষয়সমূহ যোগ করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'tutor_subjects',
      },
      {
        key: 'availability',
        titleEn: 'Set your weekly teaching schedule',
        titleBn: 'সাপ্তাহিক পাঠদান সময়সূচি নির্ধারণ করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'tutor_availability',
      },
      {
        key: 'documents',
        titleEn: 'Submit supporting documents for verification',
        titleBn: 'যাচাইকরণের জন্য নথি জমা দিন',
        required: true,
        submittable: true,
        approvalGated: true,
        validator: 'tutor_documents',
      },
      {
        key: 'verification',
        titleEn: 'Await compliance verification decision',
        titleBn: 'কমপ্লায়েন্স যাচাইকরণ সিদ্ধান্তের অপেক্ষা করুন',
        required: true,
        submittable: false,
        approvalGated: true,
        systemVerified: true,
        validator: 'none',
      },
    ],
  },
  admin: {
    role: 'admin',
    labelEn: 'Administrator onboarding',
    labelBn: 'অ্যাডমিন অনবোর্ডিং',
    steps: [SECURITY_SETUP_STEP],
  },
  super_admin: {
    role: 'super_admin',
    labelEn: 'Super administrator onboarding',
    labelBn: 'সুপার অ্যাডমিন অনবোর্ডিং',
    steps: [SECURITY_SETUP_STEP],
  },
  support_agent: {
    role: 'support_agent',
    labelEn: 'Support agent onboarding',
    labelBn: 'সাপোর্ট এজেন্ট অনবোর্ডিং',
    steps: [SECURITY_SETUP_STEP],
  },
  compliance_reviewer: {
    role: 'compliance_reviewer',
    labelEn: 'Compliance reviewer onboarding',
    labelBn: 'কমপ্লায়েন্স পর্যালোচক অনবোর্ডিং',
    steps: [SECURITY_SETUP_STEP],
  },
  organization_owner: {
    role: 'organization_owner',
    labelEn: 'Organization owner onboarding',
    labelBn: 'প্রতিষ্ঠান মালিক অনবোর্ডিং',
    steps: [
      CONTACT_VERIFICATION_STEP,
      {
        key: 'organization_profile',
        titleEn: 'Set up your organization',
        titleBn: 'আপনার প্রতিষ্ঠান সেটআপ করুন',
        required: true,
        submittable: true,
        approvalGated: false,
        validator: 'organization_profile',
      },
      {
        key: 'ownership_verification',
        titleEn: 'Await ownership verification',
        titleBn: 'মালিকানা যাচাইকরণের অপেক্ষা করুন',
        required: true,
        submittable: false,
        approvalGated: true,
        systemVerified: true,
        validator: 'none',
      },
    ],
  },
  organization_staff: {
    role: 'organization_staff',
    labelEn: 'Organization staff onboarding',
    labelBn: 'প্রতিষ্ঠান কর্মী অনবোর্ডিং',
    steps: [
      {
        key: 'membership',
        titleEn: 'Accept your organization invitation',
        titleBn: 'প্রতিষ্ঠানের আমন্ত্রণ গ্রহণ করুন',
        required: true,
        submittable: false,
        approvalGated: false,
        systemVerified: true,
        validator: 'none',
      },
      SECURITY_SETUP_STEP,
    ],
  },
};

export function getOnboardingDefinition(roleCode: string): RoleOnboardingDefinition | null {
  return ONBOARDING_BY_ROLE[roleCode] ?? null;
}

/** Pick the onboarding track for the most privileged role the user holds. */
export function resolveOnboardingRole(roles: readonly string[]): string | null {
  for (const role of ONBOARDING_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles.length > 0 ? roles[0] : null;
}
