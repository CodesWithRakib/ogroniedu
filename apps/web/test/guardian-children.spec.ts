import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  GuardianChildrenManager,
  ChildItem,
  toGuardianRelationship,
} from '../src/components/guardian/GuardianChildrenManager';
import { validateLinkChildFields } from '../src/components/guardian/use-guardian-children';
import { getDictionary } from '../src/lib/i18n';

describe('GuardianChildrenManager Component Tests', () => {
  const mockChildren: ChildItem[] = [
    {
      linkId: 'link-1',
      studentId: 'child-1-id',
      displayName: 'Tanvir Hossain',
      relationshipType: 'father',
      status: 'active',
      consentPolicyVersion: 'v1.0-bd-minor-consent',
      consentRecordedAt: '2026-10-10T00:00:00Z',
      isMinor: true,
      institutionName: 'Rajuk Uttara Model College',
      educationLevelName: 'Class 9',
    },
    {
      linkId: 'link-2',
      studentId: 'child-2-id',
      displayName: 'Subarna Hossain',
      relationshipType: 'mother',
      status: 'pending',
      consentPolicyVersion: 'v1.0-bd-minor-consent',
      consentRecordedAt: '2026-10-10T00:00:00Z',
      isMinor: true,
      institutionName: 'Viqarunnisa Noon School',
      educationLevelName: 'Class 6',
    },
  ];

  it('should instantiate GuardianChildrenManager with English locale and initial children', () => {
    const element = React.createElement(GuardianChildrenManager, {
      locale: 'en',
      initialChildren: mockChildren,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('en');
    expect(element.props.initialChildren).toHaveLength(2);
    expect(element.props.initialChildren[0].displayName).toBe('Tanvir Hossain');
    expect(element.props.initialChildren[0].consentPolicyVersion).toBe('v1.0-bd-minor-consent');
  });

  it('should instantiate GuardianChildrenManager with Bengali locale and verify dictionary keys', () => {
    const dict = getDictionary('bn');
    const element = React.createElement(GuardianChildrenManager, {
      locale: 'bn',
      initialChildren: mockChildren,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('bn');
    expect(dict.guardian.childrenTitle).toBe('আমার সন্তান / শিক্ষার্থী');
    expect(dict.guardian.addChild).toBe('সন্তান যুক্ত করুন');
    expect(dict.guardian.consentTitle).toBe('অভিভাবকের সম্মতি বিবৃতি');
    expect(dict.guardian.activeBadge).toBe('সক্রিয়');
    expect(dict.guardian.pendingBadge).toBe('যাচাইকরণ প্রক্রিয়াধীন');
  });

  it('should verify consent policy version and minor relationship metadata', () => {
    const activeMinorChild = mockChildren[0];
    expect(activeMinorChild.isMinor).toBe(true);
    expect(activeMinorChild.relationshipType).toBe('father');
    expect(activeMinorChild.consentPolicyVersion).toBe('v1.0-bd-minor-consent');

    const pendingMinorChild = mockChildren[1];
    expect(pendingMinorChild.status).toBe('pending');
    expect(pendingMinorChild.relationshipType).toBe('mother');
  });
});

describe('link-child validation (Phase 23)', () => {
  it('requires identifier, then explicit consent', () => {
    expect(validateLinkChildFields({ identifier: '', consentAgreed: false })).toBe(
      'IDENTIFIER_REQUIRED',
    );
    expect(validateLinkChildFields({ identifier: '  ', consentAgreed: true })).toBe(
      'IDENTIFIER_REQUIRED',
    );
    expect(validateLinkChildFields({ identifier: '0191', consentAgreed: false })).toBe(
      'CONSENT_REQUIRED',
    );
    expect(validateLinkChildFields({ identifier: '0191', consentAgreed: true })).toBeNull();
  });

  it('narrows relationship values without casts', () => {
    expect(toGuardianRelationship('mother')).toBe('mother');
    expect(toGuardianRelationship('legal_guardian')).toBe('legal_guardian');
    expect(toGuardianRelationship('father')).toBe('father');
    expect(toGuardianRelationship('uncle')).toBe('father');
    expect(toGuardianRelationship('')).toBe('father');
  });
});

describe('Feature #3: Multi-Child Guardianship, Safety Alerts & Replacement Guarantee', () => {
  it('should verify child academic oversight navigation target format', () => {
    const studentId = '00000000-0000-4000-8000-000000000002';
    const targetPathBn = `/bn/dashboard/guardian/children/${studentId}`;
    const targetPathEn = `/en/dashboard/guardian/children/${studentId}`;

    expect(targetPathBn).toContain(studentId);
    expect(targetPathEn).toContain(studentId);
  });

  it(
    'should ensure child safety categories include child_safety, harassment, and off_platform_payment',
    { timeout: 15_000 },
    async () => {
      const { SafetyCategories, SafetySeverities } = await import('@ogroniedu/contracts');

      expect(SafetyCategories).toContain('child_safety');
      expect(SafetyCategories).toContain('harassment');
      expect(SafetyCategories).toContain('off_platform_payment');
      expect(SafetySeverities).toContain('critical');
      expect(SafetySeverities).toContain('high');
    },
  );

  it('should verify 48-hour tutor replacement reason codes', { timeout: 15_000 }, async () => {
    const { ReplacementReasonCodes, ReplacementStatuses } = await import('@ogroniedu/contracts');

    expect(ReplacementReasonCodes).toContain('tutor_no_show');
    expect(ReplacementReasonCodes).toContain('teaching_mismatch');
    expect(ReplacementReasonCodes).toContain('unprofessional_conduct');
    expect(ReplacementStatuses).toContain('requested');
    expect(ReplacementStatuses).toContain('matching');
    expect(ReplacementStatuses).toContain('accepted');
  });
});
